CREATE OR REPLACE FUNCTION public.salvar_etapa_pedido(
  p_session_id text,
  p_cenario text DEFAULT NULL,
  p_enquadramento text DEFAULT NULL,
  p_clima text DEFAULT NULL,
  p_selfie_url text DEFAULT NULL,
  p_whatsapp text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_session_id IS NULL
     OR p_session_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Sessao invalida';
  END IF;

  IF p_email IS NOT NULL AND (length(p_email) > 320 OR p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') THEN
    RAISE EXCEPTION 'Email invalido';
  END IF;

  IF p_whatsapp IS NOT NULL AND length(p_whatsapp) > 30 THEN
    RAISE EXCEPTION 'WhatsApp invalido';
  END IF;

  IF p_status IS NOT NULL AND p_status <> 'aguardando_pagamento' THEN
    RAISE EXCEPTION 'Status invalido';
  END IF;

  INSERT INTO public.pedidos (
    session_id, cenario, enquadramento, clima, selfie_url, whatsapp, email, status
  ) VALUES (
    p_session_id, p_cenario, p_enquadramento, p_clima, p_selfie_url, p_whatsapp,
    p_email, COALESCE(p_status, 'aguardando_pagamento')
  )
  ON CONFLICT (session_id) DO UPDATE SET
    cenario = COALESCE(EXCLUDED.cenario, pedidos.cenario),
    enquadramento = COALESCE(EXCLUDED.enquadramento, pedidos.enquadramento),
    clima = COALESCE(EXCLUDED.clima, pedidos.clima),
    selfie_url = COALESCE(EXCLUDED.selfie_url, pedidos.selfie_url),
    whatsapp = COALESCE(EXCLUDED.whatsapp, pedidos.whatsapp),
    email = COALESCE(EXCLUDED.email, pedidos.email),
    status = COALESCE(p_status, pedidos.status),
    updated_at = now();
END;
$$;

GRANT INSERT (session_id, cenario, enquadramento, clima, selfie_url, whatsapp, email, status)
ON public.pedidos TO anon, authenticated;
GRANT UPDATE (cenario, enquadramento, clima, selfie_url, whatsapp, email, status, updated_at)
ON public.pedidos TO anon, authenticated;

CREATE POLICY "Quiz pode iniciar pedido com sessao valida"
ON public.pedidos
FOR INSERT
TO anon, authenticated
WITH CHECK (
  session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND status = 'aguardando_pagamento'
);

CREATE POLICY "Quiz pode atualizar pedido com sessao valida"
ON public.pedidos
FOR UPDATE
TO anon, authenticated
USING (
  session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
)
WITH CHECK (
  session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND status = 'aguardando_pagamento'
);