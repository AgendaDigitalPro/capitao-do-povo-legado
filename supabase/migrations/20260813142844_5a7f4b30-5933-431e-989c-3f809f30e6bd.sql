CREATE TABLE IF NOT EXISTS public.funil_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa text NOT NULL,
  session_id text,
  created_at timestamptz DEFAULT now(),
  user_agent text,
  dispositivo text
);

GRANT SELECT, INSERT ON public.funil_analytics TO anon, authenticated;
GRANT ALL ON public.funil_analytics TO service_role;

ALTER TABLE public.funil_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir inserção pública" ON public.funil_analytics FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Permitir leitura para o dashboard" ON public.funil_analytics FOR SELECT TO anon, authenticated USING (true);
