REVOKE ALL ON FUNCTION public.salvar_etapa_pedido(text, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_etapa_pedido(text, text, text, text, text, text, text, text) TO service_role;

DROP POLICY IF EXISTS "Visitantes podem enviar selfies" ON storage.objects;

CREATE POLICY "Selfies: envio restrito ao bucket privado"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'selfies');

CREATE POLICY "Selfies: leitura bloqueada no cliente"
ON storage.objects AS RESTRICTIVE FOR SELECT TO anon, authenticated
USING (bucket_id <> 'selfies');

CREATE POLICY "Selfies: alteracao bloqueada no cliente"
ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon, authenticated
USING (bucket_id <> 'selfies');

CREATE POLICY "Selfies: exclusao bloqueada no cliente"
ON storage.objects AS RESTRICTIVE FOR DELETE TO anon, authenticated
USING (bucket_id <> 'selfies');