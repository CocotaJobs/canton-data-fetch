

# Corrigir Crawling: Salvamento e Paginacao

## Problemas Identificados

### 1. queryType errado na URL
O codigo usa `queryType=2` hardcoded, mas a URL real do usuario usa `queryType=1`. Isso pode retornar resultados diferentes ou vazios.

### 2. Supabase nao configurado no preview do Lovable
O `isSupabaseConfigured` retorna `false` no preview, e o insert e silenciosamente ignorado. O crawler reporta sucesso mas nao salva nada. Precisa: (a) mover o insert para o servidor (api/crawl-suppliers.ts), ou (b) mostrar erro claro ao usuario.

### 3. JSON truncado do OpenAI
Tool calling ajuda, mas paginas grandes podem gerar respostas truncadas. Precisa validar/reparar o JSON antes de usar.

### 4. Sem retry em paginas com erro
Se uma pagina falha, o crawler simplesmente pula e segue. Precisa de retry automatico.

## Plano de Correcao

### 1. Corrigir URL de paginacao
- Usar `queryType=1` (conforme URL do usuario) como default
- Tornar `queryType` configuravel no frontend
- Garantir que `pageNo` esta sendo passado corretamente

### 2. Mover insert para o servidor (api/crawl-suppliers.ts)
- Adicionar Supabase server-side no endpoint usando `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` como env vars da Vercel
- O servidor faz o insert diretamente apos extrair, eliminando dependencia do cliente
- Frontend recebe confirmacao de quantos foram salvos
- Remover insert do SupplierCrawler.tsx (apenas exibe resultados)

### 3. Adicionar validacao de JSON robusta
- No `api/crawl-suppliers.ts`, fazer try/catch no `JSON.parse(toolCall.function.arguments)`
- Se falhar, tentar reparar (trailing commas, brackets desbalanceados)
- Detectar truncacao antes de parsear

### 4. Adicionar retry automatico
- Se uma pagina falha, tentar novamente ate 2x com delay de 3s
- Logar tentativas no frontend

### 5. Feedback claro no frontend
- Se Supabase nao esta configurado no servidor, retornar erro explicito
- Mostrar no log se os dados foram salvos ou apenas extraidos
- Adicionar contagem de "salvos no banco" vs "extraidos"

## Arquivos a alterar

- `api/crawl-suppliers.ts` — corrigir queryType, adicionar Supabase server-side insert, validar JSON
- `src/components/SupplierCrawler.tsx` — remover insert client-side, adicionar retry, tornar queryType configuravel, melhorar feedback
- `src/components/SuppliersTable.tsx` — sem mudancas significativas

## Detalhes Tecnicos

URL corrigida:
```
https://365.cantonfair.org.cn/zh-CN/search?queryType=1&fCategoryId=${categoryId}&categoryId=${categoryId}&pageNo=${pageNo}
```

Supabase server-side (em crawl-suppliers.ts):
```typescript
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
// Insert apos extrair suppliers
await supabase.from("suppliers").insert(rows);
```

Env vars necessarias na Vercel:
- `SUPABASE_URL` (ja deve existir)
- `SUPABASE_SERVICE_ROLE_KEY` (service role para insert server-side)

