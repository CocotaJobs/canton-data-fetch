import type { VercelRequest, VercelResponse } from "@vercel/node";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function setCors(res: VercelResponse): VercelResponse {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type, x-api-key");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  return res;
}

function validateApiKey(req: VercelRequest): boolean {
  const clientKey = req.headers["x-api-key"];
  const serverKey = process.env.APP_API_KEY;
  if (!serverKey) return true;
  return clientKey === serverKey;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!validateApiKey(req)) {
    return res.status(401).json({ error: "Unauthorized: verifique x-api-key." });
  }

  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlKey) {
    return res.status(500).json({ error: "FIRECRAWL_API_KEY não configurada." });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY não configurada." });
  }

  try {
    const { pageNo, categoryId, baseUrl } = req.body;

    if (!pageNo || !categoryId) {
      return res.status(400).json({ error: "pageNo e categoryId são obrigatórios." });
    }

    // Build the Canton Fair URL for this page
    const url =
      baseUrl ||
      `https://365.cantonfair.org.cn/zh-CN/search?queryType=2&fCategoryId=${categoryId}&categoryId=${categoryId}&pageNo=${pageNo}`;

    console.log(`Scraping page ${pageNo}: ${url}`);

    // Step 1: Scrape with Firecrawl
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeRes.json();

    if (!scrapeRes.ok) {
      return res.status(scrapeRes.status).json({
        error: `Firecrawl error: ${scrapeData.error || scrapeRes.status}`,
      });
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";

    if (!markdown || markdown.length < 100) {
      return res.status(200).json({
        suppliers: [],
        pageNo,
        message: "Página sem conteúdo suficiente para extração.",
      });
    }

    // Step 2: Extract suppliers with OpenAI
    const aiRes = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um extrator de dados especializado em feiras comerciais. Analise o conteúdo da página e extraia TODOS os suppliers/empresas listados. Para cada um, retorne dados estruturados TRADUZIDOS PARA PORTUGUÊS BRASILEIRO. Use a ferramenta fornecida para retornar os dados.`,
          },
          {
            role: "user",
            content: `Extraia todos os suppliers desta página de listagem da Canton Fair. Traduza descrições e produtos para português brasileiro.\n\nConteúdo da página:\n${markdown.slice(0, 15000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_suppliers",
              description: "Retorna lista de suppliers extraídos e traduzidos",
              parameters: {
                type: "object",
                properties: {
                  suppliers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        company_name: {
                          type: "string",
                          description: "Nome da empresa (manter original)",
                        },
                        description: {
                          type: "string",
                          description: "Descrição da empresa/produtos em português",
                        },
                        products: {
                          type: "array",
                          items: { type: "string" },
                          description: "Lista de produtos em português",
                        },
                        segment: {
                          type: "string",
                          description: "Segmento/categoria em português",
                        },
                        images: {
                          type: "array",
                          items: { type: "string" },
                          description: "URLs de imagens do supplier",
                        },
                        website_url: {
                          type: "string",
                          description: "URL do site da empresa, se disponível",
                        },
                        booth: {
                          type: "string",
                          description: "Número do estande/booth",
                        },
                      },
                      required: ["company_name", "description", "products", "segment"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suppliers"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_suppliers" } },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      return res.status(aiRes.status).json({ error: `OpenAI error: ${aiRes.status} — ${text}` });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return res.status(500).json({ error: "Sem tool call na resposta da IA." });
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Attach source_url to each supplier
    const suppliers = (result.suppliers || []).map((s: any) => ({
      ...s,
      source_url: url,
      images: s.images || [],
      website_url: s.website_url || "",
      booth: s.booth || "",
    }));

    console.log(`Page ${pageNo}: extracted ${suppliers.length} suppliers`);

    return res.status(200).json({ suppliers, pageNo });
  } catch (error: any) {
    console.error("Crawl error:", error);
    return res.status(500).json({ error: error.message || "Erro no crawling" });
  }
}
