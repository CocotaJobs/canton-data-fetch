import { createClient } from "@supabase/supabase-js";
import { checkSupabaseConfig } from "./env-check";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const { configured, missing } = checkSupabaseConfig();

export const isSupabaseConfigured = configured;

if (!configured) {
  console.warn(
    `⚠️ Supabase não configurado. Defina ${missing.join(" e ")} nas env vars da Vercel. O banco de dados não funcionará até que essas variáveis sejam configuradas.`
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);
