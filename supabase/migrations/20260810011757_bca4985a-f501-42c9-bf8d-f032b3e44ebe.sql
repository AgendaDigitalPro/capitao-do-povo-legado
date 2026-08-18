DROP POLICY IF EXISTS "Quiz pode iniciar pedido com sessao valida" ON public.pedidos;
DROP POLICY IF EXISTS "Quiz pode atualizar pedido com sessao valida" ON public.pedidos;

REVOKE INSERT (session_id, cenario, enquadramento, clima, selfie_url, whatsapp, email, status)
ON public.pedidos FROM anon, authenticated;
REVOKE UPDATE (cenario, enquadramento, clima, selfie_url, whatsapp, email, status, updated_at)
ON public.pedidos FROM anon, authenticated;

ALTER FUNCTION public.salvar_etapa_pedido(text, text, text, text, text, text, text, text)
SECURITY DEFINER;