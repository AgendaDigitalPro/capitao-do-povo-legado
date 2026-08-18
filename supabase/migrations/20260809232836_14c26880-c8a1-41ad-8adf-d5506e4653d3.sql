CREATE POLICY "Visitantes podem enviar selfies"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'selfies');