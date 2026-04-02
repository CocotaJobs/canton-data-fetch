

# Sistema de Crawling Multi-Pagina com Extracao Estruturada e Traducao

## Visao Geral

Construir um pipeline que percorre as 88 paginas de suppliers da Canton Fair, extrai dados estruturados de cada supplier usando IA, traduz para portugues e armazena no Supabase.

## Arquitetura

```text
[Frontend: Botao "Crawl Suppliers"]
         |
         v
   Loop pagina 1..88
         |
    [api/scrape-website.ts] --Firecrawl--> HTML renderizado da pagina
         |
         v
    [api/ai-match.ts mode="extract-suppliers"]
         |
    GPT-4o-mini extrai suppliers estruturados + traduz para PT
         |
         v
    [Supabase: tabela suppliers] -- insert batch
         |
    (opcionalmente) para cada supplier com website:
    [api/scrape-website.ts] --> scrape do site do supplier
    [api/ai-match.ts] --> enriquecer descricao
```

O frontend orquestra pagina por pagina, mostrando progresso em tempo real. Cada pagina leva ~5-10s (scrape + AI), total estimado: ~10-15 min para 88 paginas.

## Alteracoes

### 1. Nova tabela Supabase: `suppliers`

Migration SQL:
- `id` UUID PK
- `company_name` TEXT NOT NULL
- `description` TEXT (em portugues)
- `products` TEXT[] (lista de produtos traduzida)
- `segment` TEXT (categoria/segmento)
- `images` TEXT[] (URLs das imagens)
- `website_url` TEXT
- `source_url` TEXT (link da pagina Canton Fair)
- `raw_content` JSONB (dados brutos para referencia)
- `created_at` TIMESTAMPTZ
- RLS: SELECT e INSERT publicos

Atualizar `src/lib/supabase-types.ts` com o tipo da tabela.

### 2. Novo modo no `api/ai-match.ts`: `extract-suppliers`

Recebe o markdown de uma pagina de listagem e retorna array de suppliers estruturados, ja traduzidos para portugues. Usa tool calling do OpenAI para garantir formato consistente.

Prompt: "Extraia todos os suppliers desta pagina. Para cada um, retorne: nome da empresa, descricao dos produtos, lista de produtos, segmento/categoria, URLs de imagens, e URL do site se disponivel. Traduza tudo para portugues brasileiro."

### 3. Nova funcao serverless `api/crawl-suppliers.ts`

Funcao auxiliar que faz scrape de UMA pagina e extrai suppliers. Recebe `{ pageNo, categoryId }`, faz o scrape via Firecrawl, e chama o modo `extract-suppliers`. Retorna os suppliers extraidos.

Isso evita timeout: o frontend chama uma pagina por vez.

### 4. Frontend: Nova pagina `/suppliers`

- Formulario com URL base e range de paginas (1-88)
- Botao "Iniciar Crawling"
- Barra de progresso mostrando pagina atual / total
- Log em tempo real das paginas processadas
- Tabela de suppliers ja extraidos com filtros por segmento

### 5. Frontend: Componente `SupplierCrawler`

Orquestra o loop:
1. Para cada pagina de 1 a N:
   - Chama `api/crawl-suppliers?pageNo=X`
   - Recebe suppliers extraidos
   - Insere no Supabase via client
   - Atualiza progresso
2. Ao final, exibe resumo

### 6. Frontend: Componente `SuppliersTable`

Tabela para visualizar suppliers salvos no Supabase:
- Colunas: Nome, Segmento, Produtos, Site
- Expandir para ver descricao completa e imagens
- Filtro por segmento
- Contagem total

### 7. Enriquecimento opcional (fase 2)

Para suppliers que tem website, o usuario pode clicar "Enriquecer" para:
- Scrape do site externo via Firecrawl
- AI extrai contexto adicional
- Atualiza descricao e produtos no Supabase

### 8. Rota e navegacao

- Adicionar rota `/suppliers` no `App.tsx`
- Adicionar link no `DashboardHeader`

## Detalhes Tecnicos

- Paginacao Canton Fair: `queryType=2` (suppliers) + `pageNo=N` + `categoryId=...`
- O site e SPA com JS rendering - Firecrawl lida com isso
- Cada pagina mostra ~20 suppliers
- Total estimado: ~1,760 suppliers
- Timeout: cada chamada processa 1 pagina (~5s scrape + ~3s AI), bem dentro do limite Vercel
- Traducao integrada no prompt do OpenAI (sem camada separada)
- Rate limiting: delay de 1s entre paginas no frontend para nao sobrecarregar Firecrawl

## Arquivos a criar/modificar

- `supabase/schema.sql` — adicionar tabela suppliers
- Nova migration SQL para suppliers
- `src/lib/supabase-types.ts` — adicionar tipo Suppliers
- `api/crawl-suppliers.ts` — nova funcao serverless
- `api/ai-match.ts` — novo modo extract-suppliers
- `src/pages/Suppliers.tsx` — nova pagina
- `src/components/SupplierCrawler.tsx` — componente de crawling
- `src/components/SuppliersTable.tsx` — tabela de suppliers
- `src/App.tsx` — nova rota
- `src/components/DashboardHeader.tsx` — link de navegacao

