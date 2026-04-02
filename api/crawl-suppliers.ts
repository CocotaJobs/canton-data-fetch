import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { buildCantonFairPageUrl } from "../src/lib/canton-fair";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

interface ExtractedSupplier {
  booth?: string;
  company_name?: string;
  description?: string;
  images?: string[];
  products?: string[];
  segment?: string;
  website_url?: string;
}

interface ExtractSuppliersResult {
  suppliers?: ExtractedSupplier[];
}

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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro desconhecido";
}

function stripUnsafeControlChars(value: string): string {
  return Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
    })
    .join("");
}

function repairJson(raw: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(raw);
  } catch {
    // Strip markdown fences
    let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    // Find JSON boundaries
    const start = cleaned.search(/[[{]/);
    const lastBrace = cleaned.lastIndexOf("}");
    const lastBracket = cleaned.lastIndexOf("]");
    const end = Math.max(lastBrace, lastBracket);

    if (start === -1 || end === -1) throw new Error("No JSON found in response");

    cleaned = cleaned.substring(start, end + 1);

    try {
      return JSON.parse(cleaned);
    } catch {
      // Fix trailing commas
      cleaned = cleaned
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]");
      cleaned = stripUnsafeControlChars(cleaned);
      return JSON.parse(cleaned);
    }
  }
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
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

  const supabase = getSupabaseClient();

  try {
    const { pageNo, categoryId, queryType, searchUrl } = req.body;

    if (!pageNo || !categoryId) {
      return res.status(400).json({ error: "pageNo e categoryId são obrigatórios." });
    }

    const qt = queryType || 1;
    const url =
      typeof searchUrl === "string" && searchUrl.trim()
        ? buildCantonFairPageUrl(searchUrl, pageNo)
        : `https://365.cantonfair.org.cn/zh-CN/search?queryType=${qt}&fCategoryId=${categoryId}&categoryId=${categoryId}&pageNo=${pageNo}`;

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
        saved: 0,
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
                        company_name: { type: "string", description: "Nome da empresa (manter original)" },
                        description: { type: "string", description: "Descrição em português" },
                        products: { type: "array", items: { type: "string" }, description: "Produtos em português" },
                        segment: { type: "string", description: "Segmento em português" },
                        images: { type: "array", items: { type: "string" }, description: "URLs de imagens" },
                        website_url: { type: "string", description: "URL do site" },
                        booth: { type: "string", description: "Número do estande" },
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

    // Robust JSON parsing
    let result: ExtractSuppliersResult;
    try {
      result = repairJson(toolCall.function.arguments) as ExtractSuppliersResult;
    } catch (jsonErr: unknown) {
      const errorMessage = getErrorMessage(jsonErr);
      console.error("JSON parse error:", errorMessage, "Raw:", toolCall.function.arguments.slice(0, 500));
      return res.status(500).json({ error: `Erro ao parsear resposta da IA: ${errorMessage}` });
    }

    const suppliers = (result.suppliers || []).map((s) => ({
      company_name: s.company_name,
      description: s.description || "",
      products: s.products || [],
      segment: s.segment || "",
      images: s.images || [],
      website_url: s.website_url || "",
      source_url: url,
      booth: s.booth || "",
      raw_content: s,
    }));

    // Step 3: Save to Supabase server-side
    let saved = 0;
    if (supabase && suppliers.length > 0) {
      const { error, count } = await supabase.from("suppliers").insert(suppliers).select("id");
      if (error) {
        console.error("Supabase insert error:", error);
        return res.status(200).json({
          suppliers,
          saved: 0,
          pageNo,
          dbError: error.message,
          message: `${suppliers.length} extraídos mas erro ao salvar: ${error.message}`,
        });
      }
      saved = suppliers.length;
    } else if (!supabase) {
      console.warn("Supabase not configured server-side — data not saved.");
    }

    console.log(`Page ${pageNo}: extracted ${suppliers.length}, saved ${saved}`);

    return res.status(200).json({ suppliers, saved, pageNo, resolvedUrl: url });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error("Crawl error:", error);
    return res.status(500).json({ error: errorMessage });
  }
}
