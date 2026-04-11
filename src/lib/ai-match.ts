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

const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const APP_API_KEY = import.meta.env.VITE_APP_API_KEY || "";

// Sanitize: strip trailing /api if user added it by mistake
const API_BASE = RAW_API_BASE.replace(/\/api\/?$/, "");

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

function assertApiBase() {
  if (!API_BASE) {
    throw new Error(
      "VITE_API_BASE_URL não configurada. Defina nas env vars da Vercel com a URL do seu deploy (ex: https://seu-projeto.vercel.app)."
    );
  }
  // Detect mixed content
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    API_BASE.startsWith("http://")
  ) {
    throw new Error(
      `Mixed content: a página usa HTTPS mas VITE_API_BASE_URL aponta para HTTP (${API_BASE}). Use HTTPS na URL.`
    );
  }
}

function wrapNetworkError(err: unknown): never {
  if (err instanceof TypeError && err.message === "Failed to fetch") {
    const origin = typeof window !== "undefined" ? window.location.origin : "(desconhecido)";
    throw new Error(
      `Não foi possível conectar a ${API_BASE || "(vazio)"}. ` +
      `Página atual: ${origin}. ` +
      `Verifique: 1) VITE_API_BASE_URL está correta, 2) O deploy da Vercel está ativo, ` +
      `3) Você não está testando no preview do Lovable (as serverless functions só funcionam na Vercel). ` +
      `4) Se o domínio é diferente, pode ser um bloqueio de CORS.`
    );
  }
  throw err;
}

export async function scrapeWebsite(
  url: string,
): Promise<{ description?: string; markdown: string; title: string }> {
  assertApiBase();
  try {
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
  } catch (err) {
    return wrapNetworkError(err);
  }
}

export async function extractProfileFromWebsite(
  websiteContent: string,
  websiteUrl: string
): Promise<CompanyProfile> {
  assertApiBase();
  try {
    const res = await fetch(apiUrl("ai-match"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ mode: "extract-profile", websiteContent, websiteUrl }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(describeApiError(res.status, data.error || "", "Extract Profile"));
    }

    const data = await res.json();
    return data.profile;
  } catch (err) {
    return wrapNetworkError(err);
  }
}

export async function findMatches(
  profile: CompanyProfile,
  exhibitors: Exhibitor[]
): Promise<MatchResult[]> {
  assertApiBase();
  try {
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
  } catch (err) {
    return wrapNetworkError(err);
  }
}

export async function* streamChat(
  messages: ChatMessage[],
  profile: CompanyProfile,
  exhibitors: Exhibitor[],
  matchResults?: MatchResult[],
  scrapedContext?: string
): AsyncGenerator<string> {
  assertApiBase();
  let res: Response;
  try {
    res = await fetch(apiUrl("ai-match"), {
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
  } catch (err) {
    wrapNetworkError(err);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(describeApiError(res.status, data.error || "", "Chat"));
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
        } catch {
          continue;
        }
      }
    }
  }
}
