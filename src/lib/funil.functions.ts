import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  dias: z.number().int().min(1).max(365).nullable(),
});

export const carregarFunil = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let queryAnalytics = supabaseAdmin.from("funil_analytics").select("etapa, session_id");
    let queryPedidos = supabaseAdmin.from("pedidos").select("status, session_id");

    if (data.dias) {
      const dataFiltro = new Date();
      if (data.dias === 1) {
        // Hoje: do início do dia atual UTC
        dataFiltro.setUTCHours(0, 0, 0, 0);
      } else {
        dataFiltro.setDate(dataFiltro.getDate() - data.dias);
      }
      const iso = dataFiltro.toISOString();
      queryAnalytics = queryAnalytics.gte("created_at", iso);
      queryPedidos = queryPedidos.gte("created_at", iso);
    }

    const [resAnalytics, resPedidos] = await Promise.all([
      queryAnalytics,
      queryPedidos
    ]);

    if (resAnalytics.error) throw new Error("Erro analytics: " + resAnalytics.error.message);
    if (resPedidos.error) throw new Error("Erro pedidos: " + resPedidos.error.message);

    // Contagem de sessões únicas por etapa
    const mapa = new Map<string, Set<string>>();
    for (const row of resAnalytics.data ?? []) {
      const etapa = row.etapa as string;
      if (!mapa.has(etapa)) mapa.set(etapa, new Set());
      mapa.get(etapa)!.add((row.session_id as string | null) ?? "anonimo");
    }

    // Contagem de pedidos pagos únicos
    const STATUS_PAGOS = ["pago", "foto_pronta", "gerando_foto"];
    const sessoesPagos = new Set<string>();
    for (const p of resPedidos.data ?? []) {
      if (STATUS_PAGOS.includes(p.status)) {
        sessoesPagos.add(p.session_id);
      }
    }

    return {
      etapas: Array.from(mapa.entries()).map(([etapa, sessoes]) => ({
        etapa,
        count: sessoes.size,
      })),
      pagos: sessoesPagos.size
    };
  });
