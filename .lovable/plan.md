

# Preparar Backend Supabase via Vercel (sem Lovable Cloud)

## Resumo

Criar a camada de dados Supabase no projeto, com client configurado via env vars do Vercel, tabelas SQL prontas para deploy, e migrar os hooks de localStorage para queries Supabase. Toda a infraestrutura roda na Vercel — sem Lovable Cloud.

## Alterações

### 1. Criar client Supabase (`src/lib/supabase.ts`)
- Instanciar `createClient` usando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (env vars que o usuário configura na Vercel)
- Exportar o client para uso nos hooks

### 2. Criar SQL de tabelas (`supabase/schema.sql` — arquivo de referência)
- Arquivo SQL que o usuário executa manualmente no Supabase Dashboard

```sql
-- scraped_pages
CREATE TABLE public.scraped_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  title TEXT DEFAULT '',
  markdown TEXT DEFAULT '',
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  error TEXT,
  scraped_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.scraped_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON public.scraped_pages
  FOR ALL USING (true) WITH CHECK (true);

-- company_profiles
CREATE TABLE public.company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  industry TEXT DEFAULT '',
  description TEXT DEFAULT '',
  looking_for TEXT DEFAULT '',
  keywords TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON public.company_profiles
  FOR ALL USING (true) WITH CHECK (true);
```

### 3. Gerar types TypeScript (`src/lib/supabase-types.ts`)
- Types manuais que espelham as tabelas para tipagem forte no client

### 4. Migrar `useScrapedData` hook para Supabase
- Substituir localStorage por queries Supabase (`select`, `insert`, `update`, `delete`)
- Usar React Query (`useQuery` / `useMutation`) para cache e revalidation
- Manter a mesma interface pública do hook

### 5. Migrar `company-profile.ts` para Supabase
- Criar hook `useCompanyProfile()` com React Query
- `loadProfile()` → `select` do último profile
- `saveProfile()` → `upsert` na tabela

### 6. Atualizar `Index.tsx` e `Match.tsx`
- Adaptar para usar os hooks atualizados (mesma interface, sem mudanças visuais)

### 7. Instalar dependência `@supabase/supabase-js`

## Configuração necessária pelo usuário

O usuário precisará:
1. Criar um projeto no [supabase.com](https://supabase.com)
2. Executar o SQL de `supabase/schema.sql` no SQL Editor do Supabase
3. Adicionar na Vercel as env vars:
   - `VITE_SUPABASE_URL` — URL do projeto Supabase
   - `VITE_SUPABASE_ANON_KEY` — chave anon/public

