

# Remover Mock Data e Adicionar Scraping Real com Visualização de Dados

## Resumo

Remover todos os dados mock, implementar scraping real via Vercel serverless function (`api/scrape-website.ts`), e criar um fluxo onde o usuário insere uma URL, o scraping acontece de verdade, e os dados extraídos são exibidos na interface.

## Problema Atual

1. `src/lib/mock-data.ts` contém exhibitors e jobs fictícios usados em `Index.tsx` e `Match.tsx`
2. O botão "Start Scraping" no dashboard apenas simula com `setTimeout` — não faz scraping real
3. O endpoint `api/scrape-website.ts` funciona (usa Firecrawl), mas o resultado não é exibido em lugar nenhum no dashboard
4. Na página `/match`, os exhibitors passados para o AI matcher são todos mock

## Alterações

### 1. Deletar `src/lib/mock-data.ts`
- Remover o arquivo completamente

### 2. Redesenhar `ScrapeControls` para scraping real
- Trocar os campos "Phase" e "Category" por um campo de URL (o scraping real usa Firecrawl via `api/scrape-website.ts`)
- Ao clicar "Scrape", chamar o endpoint real e retornar o conteúdo markdown extraído
- Armazenar os resultados em state (lista de "scraped pages")

### 3. Criar tipo `ScrapedPage` e gerenciar estado no `Index.tsx`
- Novo tipo: `{ id, url, title, markdown, scrapedAt, status }`
- Estado `scrapedPages` em `Index.tsx` (substituindo os mock exhibitors/jobs)
- Jobs table mostra scrapes reais (URL, status, timestamp)
- Área de resultados mostra o conteúdo extraído de cada página

### 4. Atualizar `StatsCards`
- Mostrar: Total Scraped, Running, Completed, Errors (baseado em scrapes reais)

### 5. Substituir `ExhibitorTable` por `ScrapedDataTable`
- Tabela mostra as páginas scraped: URL/Title, status, data
- Ao expandir uma row, mostra o conteúdo markdown extraído (preview)
- Botão para ver o conteúdo completo em um dialog/modal

### 6. Atualizar `JobsTable`
- Adaptar para mostrar scrape jobs reais em vez de mock jobs

### 7. Atualizar `Match.tsx`
- Remover dependência de `mockExhibitors`
- Usar os dados scraped como contexto para o AI matcher, ou permitir que o usuário insira dados manualmente
- Se não houver dados scraped, mostrar mensagem orientando a fazer scraping primeiro

### 8. Persistência local com `localStorage`
- Salvar scraped pages no localStorage para persistir entre reloads
- Hook `useScrapedData()` para centralizar acesso aos dados

## Detalhes Técnicos

- O endpoint `api/scrape-website.ts` já funciona e retorna `{ success, markdown, title, description, sourceURL }`
- O frontend já tem `authHeaders()` configurado em `src/lib/ai-match.ts`
- Criar função `scrapeWebsite()` centralizada (já existe em `ai-match.ts`, reutilizar)
- Dados scraped ficam em memória + localStorage (sem backend/DB necessário)
- O conteúdo markdown pode ser renderizado com um simples `<pre>` ou componente de markdown

```text
Fluxo:
[User insere URL] → [POST /api/scrape-website] → [Retorna markdown/title]
                                                         ↓
                                              [Salva em state + localStorage]
                                                         ↓
                                              [Exibe na tabela + stats atualizam]
                                                         ↓
                                              [Dados disponíveis para AI Match]
```

