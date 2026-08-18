import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/recuperar-pagamentos")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const secret = url.searchParams.get("secret");
        
        // Proteção simples por parâmetro
        if (secret !== "camarada_recupera_2026") {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const mod = await import("@/lib/pedido.server");

        // Busca pedidos pendentes com Pix gerado há mais de 5 minutos e menos de 24h
        const cincoMinatras = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: pedidos, error } = await supabaseAdmin
          .from("pedidos")
          .select("session_id, payment_id, status")
          .in("status", ["aguardando_pagamento", "pendente"])
          .not("payment_id", "is", null)
          .lt("created_at", cincoMinatras)
          .gt("created_at", umDiaAtras);

        if (error) return Response.json({ error: error.message }, { status: 500 });
        if (!pedidos || pedidos.length === 0) return Response.json({ ok: true, processados: 0 });

        const resultados = [];
        for (const p of pedidos) {
          try {
            const pg = await mod.consultarPagamento(p.payment_id!);
            if (mod.pagamentoAprovado(pg.status)) {
              await mod.processarPagamentoConfirmado(p.session_id);
              resultados.push({ id: p.session_id, recuperado: true });
            } else {
              resultados.push({ id: p.session_id, recuperado: false, status: pg.status });
            }
          } catch (e: any) {
            resultados.push({ id: p.session_id, erro: e.message });
          }
        }

        return Response.json({ ok: true, processados: pedidos.length, detalhes: resultados });
      },
    },
  },
});
