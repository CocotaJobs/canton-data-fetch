-- ================================================
-- Canton Fair Scraper - Schema SQL
-- Execute this in the Supabase SQL Editor
-- ================================================

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
