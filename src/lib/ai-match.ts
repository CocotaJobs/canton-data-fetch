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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

function getEdgeFunctionUrl(fn: string) {
  return `${SUPABASE_URL}/functions/v1/${fn}`;
}

export async function findMatches(
  profile: CompanyProfile,
  exhibitors: Exhibitor[]
): Promise<MatchResult[]> {
  const res = await fetch(getEdgeFunctionUrl("ai-match"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ mode: "match", companyProfile: profile, exhibitors }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Match failed: ${res.status} — ${text}`);
  }

  const data = await res.json();
  return data.matches as MatchResult[];
}

export async function* streamChat(
  messages: ChatMessage[],
  profile: CompanyProfile,
  exhibitors: Exhibitor[],
  matchResults?: MatchResult[]
): AsyncGenerator<string> {
  const res = await fetch(getEdgeFunctionUrl("ai-match"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      mode: "chat",
      messages,
      companyProfile: profile,
      exhibitors,
      matchResults,
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
