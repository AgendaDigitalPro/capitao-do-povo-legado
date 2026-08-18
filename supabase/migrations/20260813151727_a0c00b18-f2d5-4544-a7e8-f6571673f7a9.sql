DROP POLICY IF EXISTS "Permitir leitura para o dashboard" ON public.funil_analytics;
REVOKE SELECT ON public.funil_analytics FROM anon, authenticated;
GRANT INSERT ON public.funil_analytics TO anon, authenticated;
GRANT ALL ON public.funil_analytics TO service_role;