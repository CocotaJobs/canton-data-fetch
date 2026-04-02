
Plano para identificar e eliminar o último “Failed to fetch”

Resumo
Pelo código atual, os suspeitos principais já não são mais as API keys. Os pontos mais prováveis agora são:
1. CORS incompleto nas funções da Vercel
2. Um fetch ainda sem tratamento em `extractProfileFromWebsite()`
3. Queries do Supabase ainda disparando sem guarda em `useCompanyProfile()`
4. `VITE_API_BASE_URL` malformada ou desnecessariamente absoluta

O que o código mostra
- `api/scrape-website.ts` e `api/ai-match.ts` definem `corsHeaders`, mas só usam headers no `OPTIONS` e no stream SSE. As respostas JSON normais e de erro não recebem CORS.
- `src/lib/ai-match.ts` já trata rede em `scrapeWebsite()`, `findMatches()` e `streamChat()`, mas `extractProfileFromWebsite()` ainda faz `fetch()` direto.
- `src/lib/company-profile.ts` ainda consulta o Supabase sem verificar `isSupabaseConfigured`, diferente de `use-scraped-data.ts`.
- `src/lib/api.ts` ainda tem fallback para `http://localhost:8000`, mas hoje parece estar sendo usado só para tipos, então não é o principal culpado.

Plano de correção
1. Corrigir CORS nas funções Vercel
- Aplicar `Access-Control-Allow-Origin`, `Access-Control-Allow-Headers` e `Access-Control-Allow-Methods` em todas as respostas de `api/scrape-website.ts` e `api/ai-match.ts`
- Incluir sucesso, 400, 401, 405 e 500
- Centralizar isso num helper para não faltar em retornos antecipados

2. Fechar o último caminho com erro genérico
- Atualizar `extractProfileFromWebsite()` para usar o mesmo `assertApiBase()` e o mesmo wrapper de erro de rede
- Incluir na mensagem o endpoint exato tentado, para ficar claro se o problema foi `/api/ai-match`

3. Blindar o carregamento inicial do Supabase
- Em `src/lib/company-profile.ts`, repetir a proteção já usada em `use-scraped-data.ts`
- Se Supabase não estiver configurado, retornar perfil vazio sem fazer request

4. Endurecer validação da base URL
- Detectar e avisar quando `VITE_API_BASE_URL`:
  - termina com `/api`
  - termina com `/`
  - usa `http://` em página `https://`
- Como tudo vai rodar na Vercel, preferir fallback relativo `/api/...` quando frontend e funções estiverem no mesmo deploy

5. Melhorar o diagnóstico final
- Diferenciar mensagens para:
  - CORS/cross-origin provável
  - URL base inválida
  - mixed content (`http` em página `https`)
  - teste no preview do Lovable versus deploy real da Vercel
- Exibir `window.location.origin` e a URL final chamada para facilitar conferência

6. Validar no ambiente certo
- Testar no deploy real da Vercel
- Se funcionar na Vercel e falhar só no preview do Lovable, o problema é de ambiente/cross-origin e não da lógica do app

Detalhes técnicos
- Hoje o cenário mais suspeito é: o browser aceita o `OPTIONS`, mas a resposta real da função volta sem `Access-Control-Allow-Origin`, então o navegador converte isso em `Failed to fetch`.
- O segundo cenário mais provável é o fluxo “Extrair perfil do site”: o primeiro request tem diagnóstico melhor, mas o segundo (`extractProfileFromWebsite`) ainda pode falhar genericamente.
- Se `VITE_API_BASE_URL` estiver como `https://seu-app.vercel.app/api`, o código atual monta `.../api/api/...`, o que também precisa ser bloqueado com validação clara.

Arquivos a ajustar
- `api/scrape-website.ts`
- `api/ai-match.ts`
- `src/lib/ai-match.ts`
- `src/lib/company-profile.ts`
