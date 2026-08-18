import { salvarEtapa } from "@/lib/pedido.functions";

export type EtapaPedido = {
  sessionId: string;
  cenario?: string;
  enquadramento?: string;
  clima?: string;
  selfie_url?: string;
  whatsapp?: string;
  email?: string;
  status?: "aguardando_pagamento";
};

const CONFIG_ERROR =
  "O banco de dados ainda não está conectado nesta versão do aplicativo. Atualize a página e tente novamente.";

export async function salvarEtapaPedido(etapa: EtapaPedido) {
  if (!etapa.sessionId) throw new Error("Não foi possível iniciar a sua sessão. Atualize a página.");

  try {
    const { sessionId, status: _status, ...resto } = etapa;
    const payload = Object.fromEntries(
      Object.entries(resto).filter(([, v]) => v !== undefined),
    ) as Record<string, string>;

    await salvarEtapa({ data: { sessionId, ...payload } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/supabase|environment variable|failed to fetch|fetch failed|url is required/i.test(message)) {
      throw new Error(CONFIG_ERROR);
    }
    throw new Error(message || "Não foi possível salvar a sua resposta. Tente novamente.");
  }
}