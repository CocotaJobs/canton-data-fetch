import type { CompanyProfile } from "./company-profile";
import type { Exhibitor } from "./api";

export interface MatchResult {
  exhibitorId: number;
  score: number;
  reasoning: string;
  suggestedProducts: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const APP_API_KEY = import.meta.env.VITE_APP_API_KEY || "";

function apiUrl(path: string) {
  return `${API_BASE}/api/${path}`;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (APP_API_KEY) headers["x-api-key"] = APP_API_KEY;
  return headers;
}

function describeApiError(status: number, errorMsg: string, context: string): string {
  if (status === 401) {
    return `API key inválida (${context}): verifique VITE_APP_API_KEY no frontend e APP_API_KEY nas env vars da Vercel.`;
  }
  if (status === 500 && errorMsg.includes("FIRECRAWL_API_KEY")) {
    return "Firecrawl não configurado: defina FIRECRAWL_API_KEY nas env vars da Vercel.";
  }
  if (status === 500 && errorMsg.includes("OPENAI_API_KEY")) {
    return "OpenAI não configurado: defina OPENAI_API_KEY nas env vars da Vercel.";
  }
  return errorMsg || `${context} falhou: ${status}`;
}

export async function scrapeWebsite(url: string): Promise<{ markdown: string; title: string }> {
  const res = await fetch(apiUrl("scrape-website"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(describeApiError(res.status, data.error || "", "Scrape"));
  }

  return res.json();
}

export async function extractProfileFromWebsite(
  websiteContent: string,
  websiteUrl: string
): Promise<CompanyProfile> {
  const res = await fetch(apiUrl("ai-match"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ mode: "extract-profile", websiteContent, websiteUrl }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Extract failed: ${res.status}`);
  }

  const data = await res.json();
  return data.profile;
}

export async function findMatches(
  profile: CompanyProfile,
  exhibitors: Exhibitor[]
): Promise<MatchResult[]> {
  const res = await fetch(apiUrl("ai-match"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ mode: "match", companyProfile: profile, exhibitors }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(describeApiError(res.status, data.error || "", "Match"));
  }

  const data = await res.json();
  return data.matches as MatchResult[];
}

export async function* streamChat(
  messages: ChatMessage[],
  profile: CompanyProfile,
  exhibitors: Exhibitor[],
  matchResults?: MatchResult[],
  scrapedContext?: string
): AsyncGenerator<string> {
  const res = await fetch(apiUrl("ai-match"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      mode: "chat",
      messages,
      companyProfile: profile,
      exhibitors,
      matchResults,
      scrapedContext,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chat failed: ${res.status} — ${text}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {}
      }
    }
  }
}
