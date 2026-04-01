export interface ConfigCheck {
  configured: boolean;
  missing: string[];
}

export function checkSupabaseConfig(): ConfigCheck {
  const url = import.meta.env.VITE_SUPABASE_URL || "";
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  const missing: string[] = [];

  if (!url || url === "https://placeholder.supabase.co" || url.includes("placeholder")) {
    missing.push("VITE_SUPABASE_URL");
  }
  if (!key || key === "placeholder") {
    missing.push("VITE_SUPABASE_ANON_KEY");
  }

  return { configured: missing.length === 0, missing };
}

export function checkApiConfig(): ConfigCheck {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const missing: string[] = [];

  if (!baseUrl) {
    missing.push("VITE_API_BASE_URL");
  }

  return { configured: missing.length === 0, missing };
}

export function getConfigStatus() {
  const supabase = checkSupabaseConfig();
  const api = checkApiConfig();

  return {
    supabase,
    api,
    allConfigured: supabase.configured && api.configured,
    allMissing: [...supabase.missing, ...api.missing],
  };
}
