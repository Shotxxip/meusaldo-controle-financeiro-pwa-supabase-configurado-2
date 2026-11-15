-- Preserva os links Amazon já cadastrados e adiciona um campo genérico.
ALTER TABLE public.goals_items ADD COLUMN IF NOT EXISTS product_url text;
UPDATE public.goals_items SET product_url = amazon_url WHERE product_url IS NULL AND amazon_url IS NOT NULL;
-- As políticas RLS existentes da tabela goals_items continuam em vigor.
