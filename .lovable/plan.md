

# Melhorar Mensagens de Erro com Identificacao da Fonte

## Problema

O app tem 3 integrações que usam API keys diferentes, mas os erros não indicam qual está falhando:
1. **Supabase** (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`) -- atualmente usando placeholders, causando falhas silenciosas
2. **Vercel API** (`VITE_API_BASE_URL` + `VITE_APP_API_KEY`) -- scraping e AI match
3. **Backend keys** (`FIRECRAWL_API_KEY`, `OPENAI_API_KEY`, `APP_API_KEY`) -- no lado servidor

Os requests atuais vão para `placeholder.supabase.co` porque as env vars não estão configuradas.

## Alterações

### 1. Criar helper de diagnostico (`src/lib/env-check.ts`)
- Função `checkSupabaseConfig()` que retorna `{ configured: boolean; error?: string }` verificando se URL/key são placeholders
- Função `checkApiConfig()` que verifica `VITE_API_BASE_URL`
- Exportar função `getConfigStatus()` que retorna status de todas as integrações

### 2. Atualizar `src/lib/supabase.ts`
- Exportar flag `isSupabaseConfigured` (true quando URL e key não são placeholders)
- Quando não configurado, logar mensagem especifica: "Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas env vars da Vercel"

### 3. Atualizar `src/hooks/use-scraped-data.ts`
- Antes de fazer queries, verificar `isSupabaseConfigured`
- Se não configurado, retornar array vazio sem fazer request, e setar erro descritivo
- Exibir toast/banner na UI: "Banco de dados não conectado: configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY"

### 4. Atualizar `src/lib/ai-match.ts` -- erros descritivos
- Em `scrapeWebsite()`: se erro 401, mensagem "API key inválida: verifique VITE_APP_API_KEY (client) e APP_API_KEY (Vercel)"
- Em `scrapeWebsite()`: se erro 500 com "FIRECRAWL_API_KEY", mensagem "Firecrawl não configurado: defina FIRECRAWL_API_KEY nas env vars da Vercel"
- Em `findMatches()`/`streamChat()`: se erro 500 com "OPENAI_API_KEY", mensagem "OpenAI não configurado: defina OPENAI_API_KEY nas env vars da Vercel"
- Se erro 401: "API key inválida: verifique VITE_APP_API_KEY no frontend e APP_API_KEY no backend (Vercel)"

### 5. Atualizar `api/scrape-website.ts` e `api/ai-match.ts` -- erros detalhados no backend
- Quando `validateApiKey` falha, retornar mensagem: "Unauthorized: x-api-key header não corresponde a APP_API_KEY. Verifique VITE_APP_API_KEY no frontend e APP_API_KEY nas env vars da Vercel."
- Quando `FIRECRAWL_API_KEY` ausente: "FIRECRAWL_API_KEY não configurada nas env vars da Vercel"
- Quando `OPENAI_API_KEY` ausente: "OPENAI_API_KEY não configurada nas env vars da Vercel"
- Logar prefixo/sufixo (4 chars) da key para debug sem expor o valor completo

### 6. Adicionar banner de status na `Index.tsx`
- No topo da página, se Supabase ou API não estiverem configurados, mostrar um alert/banner amarelo listando o que falta configurar
- Usar o componente `Alert` do shadcn com ícone de warning

## Detalhes Tecnicos

Mapeamento de erros por status HTTP:
- `401` → problema de autenticação (API key incorreta ou ausente)
- `500` + mensagem com nome da env var → env var não configurada no servidor
- `ERR_NAME_NOT_RESOLVED` / `Failed to fetch` → URL base incorreta ou Supabase não configurado

