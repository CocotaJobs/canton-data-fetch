import type { VercelRequest, VercelResponse } from "@vercel/node";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function validateApiKey(req: VercelRequest): boolean {
  const clientKey = req.headers["x-api-key"];
  const serverKey = process.env.APP_API_KEY;
  if (!serverKey) return true;
  return clientKey === serverKey;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    return res.status(200).setHeader("Access-Control-Allow-Origin", "*").setHeader("Access-Control-Allow-Headers", "content-type, x-api-key").end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!validateApiKey(req)) {
    return res.status(401).json({ error: "Unauthorized: invalid API key" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  try {
    const { mode, companyProfile, exhibitors, messages, matchResults } = req.body;

    if (mode === "extract-profile") {
      return handleExtractProfile(req, res, apiKey);
    }

    if (mode === "match") {
      return handleMatch(req, res, apiKey, companyProfile, exhibitors);
    }

    if (mode === "chat") {
      return handleChat(req, res, apiKey, messages, companyProfile, exhibitors, matchResults);
    }

    return res.status(400).json({ error: "Invalid mode. Use: extract-profile, match, or chat" });
  } catch (error: any) {
    console.error("AI match error:", error);
    return res.status(500).json({ error: error.message || "Unknown error" });
  }
}

async function handleExtractProfile(
  req: VercelRequest,
  res: VercelResponse,
  apiKey: string
) {
  const { websiteContent, websiteUrl } = req.body;

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a business analyst. Analyze the website content and extract a company profile. Return structured data using the provided tool.`,
        },
        {
          role: "user",
          content: `Analyze this website (${websiteUrl}) and extract the company profile:\n\n${websiteContent?.slice(0, 12000)}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_company_profile",
            description: "Extract company profile from website content",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Company name" },
                industry: { type: "string", description: "Primary industry/sector" },
                description: {
                  type: "string",
                  description: "Brief company description (2-3 sentences)",
                },
                lookingFor: {
                  type: "string",
                  description: "What products/services the company likely sources or needs, based on their business",
                },
                keywords: {
                  type: "string",
                  description: "Comma-separated relevant keywords for supplier matching",
                },
              },
              required: ["name", "industry", "description", "lookingFor", "keywords"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_company_profile" } },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return res.status(response.status).json({ error: `OpenAI error: ${response.status} — ${text}` });
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    return res.status(500).json({ error: "No tool call in response" });
  }

  const profile = JSON.parse(toolCall.function.arguments);
  return res.status(200).json({ profile });
}

async function handleMatch(
  req: VercelRequest,
  res: VercelResponse,
  apiKey: string,
  companyProfile: any,
  exhibitors: any[]
) {
  const exhibitorSummary = exhibitors
    .map(
      (e: any) =>
        `[ID:${e.id}] ${e.name} | Booth: ${e.booth} | Category: ${e.category} | Products: ${e.products?.join(", ")} | ${e.description}`
    )
    .join("\n");

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert trade fair matchmaker. Analyze the company profile against the exhibitor list and find the best matches. Score from 1-100 based on relevance. Return results using the provided tool.`,
        },
        {
          role: "user",
          content: `Company Profile:\nName: ${companyProfile.name}\nIndustry: ${companyProfile.industry}\nDescription: ${companyProfile.description}\nLooking for: ${companyProfile.lookingFor}\nKeywords: ${companyProfile.keywords}\n\nExhibitors:\n${exhibitorSummary}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_matches",
            description: "Return ranked exhibitor matches",
            parameters: {
              type: "object",
              properties: {
                matches: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      exhibitorId: { type: "number" },
                      score: { type: "number", description: "1-100 relevance score" },
                      reasoning: { type: "string", description: "Why this is a good match" },
                      suggestedProducts: {
                        type: "array",
                        items: { type: "string" },
                        description: "Relevant products from this exhibitor",
                      },
                    },
                    required: ["exhibitorId", "score", "reasoning", "suggestedProducts"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["matches"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_matches" } },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return res.status(response.status).json({ error: `OpenAI error: ${response.status} — ${text}` });
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    return res.status(500).json({ error: "No tool call in response" });
  }

  const result = JSON.parse(toolCall.function.arguments);
  return res.status(200).json(result);
}

async function handleChat(
  req: VercelRequest,
  res: VercelResponse,
  apiKey: string,
  messages: any[],
  companyProfile: any,
  exhibitors: any[],
  matchResults?: any[]
) {
  const exhibitorSummary = exhibitors
    .map(
      (e: any) =>
        `[ID:${e.id}] ${e.name} | Booth: ${e.booth} | Category: ${e.category} | Products: ${e.products?.join(", ")} | ${e.description}`
    )
    .join("\n");

  let systemPrompt = `You are a Canton Fair exhibitor matching expert. Help the user refine their search and answer questions about exhibitors.

Company Profile:
Name: ${companyProfile.name}
Industry: ${companyProfile.industry}
Description: ${companyProfile.description}
Looking for: ${companyProfile.lookingFor}
Keywords: ${companyProfile.keywords}

Exhibitors:
${exhibitorSummary}`;

  if (matchResults?.length) {
    systemPrompt += `\n\nPrevious Match Results:\n${matchResults.map((m: any) => `ID:${m.exhibitorId} Score:${m.score} — ${m.reasoning}`).join("\n")}`;
  }

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 429) {
      return res.status(429).json({ error: "Rate limited. Please try again later." });
    }
    return res.status(response.status).json({ error: `OpenAI error: ${response.status} — ${text}` });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const reader = response.body?.getReader();
  if (!reader) {
    return res.status(500).json({ error: "No stream body" });
  }

  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
    }
  } catch (e) {
    console.error("Stream error:", e);
  } finally {
    res.end();
  }
}
