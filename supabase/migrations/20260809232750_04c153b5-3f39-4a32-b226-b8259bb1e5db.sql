CREATE TABLE public.pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  cenario TEXT,
  enquadramento TEXT,
  clima TEXT,
  selfie_url TEXT,
  whatsapp TEXT,
  email TEXT,
  bumps_selecionados JSONB NOT NULL DEFAULT '[]'::jsonb,
  valor_total INTEGER NOT NULL DEFAULT 1990,
  status TEXT NOT NULL DEFAULT 'aguardando_pagamento',
  payment_id TEXT,
  foto_gerada_url TEXT,
  erro TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX pedidos_payment_id_idx ON public.pedidos (payment_id);

GRANT ALL ON public.pedidos TO service_role;

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER pedidos_set_updated_at BEFORE UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();