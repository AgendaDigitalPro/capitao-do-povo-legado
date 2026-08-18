import { createFileRoute } from "@tanstack/react-router";

/**
 * SINCRONIZACAO DE VENDAS COM A UTMIFY
 *
 * Motivo desta rota: enviarVendaUtmify so era alcancavel atraves de
 * processarPagamentoConfirmado, que por sua vez so roda quando (a) o webhook da
 * AbacatePay dispara ou (b) o cliente esta com a tela de pagamento aberta.
 * Se o webhook falha e o cliente fecha o navegador, ninguem mais confirma o
 * pagamento — a venda fica invisivel para sempre, sem foto e sem tracking.
 *
 * Esta rota e a rede de seguranca. Ela e RAPIDA e IDEMPOTENTE de proposito:
 * NAO gera foto. Geracao leva minutos e e o que fazia a requisicao morrer no
 * meio, deixando pedidos pela metade. Aqui so confirmamos pagamento e avisamos
 * a UTMify — coisa de milissegundos por pedido.
 *
 * A geracao das fotos fica por conta da rota /api/public/gerar-pendentes.
 *
 * Pode ser chamada quantas vezes quiser: a trava utmify_enviado impede envio
 * duplicado, e pedidos ja confirmados sao ignorados.
 */
const SECRET = "camarada_sync_2026";

// Pedidos de teste (rota teste-utmify) e valores irrisorios nunca vao para a
// UTMify — eles poluiriam o faturamento com vendas que nao existem.
const VALOR_MINIMO_CENTAVOS = 500;

export const Route = createFileRoute("/api/public/sincronizar-utmify")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("secret") !== SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const mod = await import("@/lib/pedido.server");

        // A UTMify so aceita pedidos com ate 7 dias.
        const seteDias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        // Margem para nao consultar o gateway antes do cliente ter tempo de pagar.
        const doisMinutos = new Date(Date.now() - 2 * 60 * 1000).toISOString();

        const confirmados: unknown[] = [];
        const enviados: unknown[] = [];
        const falhas: unknown[] = [];

        // ── ETAPA 1 ────────────────────────────────────────────────────────────
        // Pedidos que continuam "aguardando_pagamento" mas que o gateway ja
        // registrou como pagos. Esta e a origem de praticamente todas as vendas
        // que nao apareciam na UTMify.
        const { data: pendentes, error: erroPendentes } = await supabaseAdmin
          .from("pedidos")
          .select("session_id, payment_id, valor_total")
          .in("status", ["aguardando_pagamento", "pendente"])
          .not("payment_id", "is", null)
          .gte("valor_total", VALOR_MINIMO_CENTAVOS)
          .lt("created_at", doisMinutos)
          .gt("created_at", seteDias)
          .order("created_at", { ascending: false })
          .limit(30);

        if (erroPendentes) {
          return Response.json({ ok: false, etapa: "consulta_pendentes", erro: erroPendentes.message }, { status: 500 });
        }

        for (const p of pendentes ?? []) {
          try {
            const pg = await mod.consultarPagamento(p.payment_id!);
            if (!mod.pagamentoAprovado(pg.status)) continue;

            // Confirma o pagamento e avisa a UTMify. A foto NAO e gerada aqui.
            await mod.setStatus(p.session_id, { status: "pago" });
            const r = await mod.enviarVendaUtmify(p.session_id);
            confirmados.push({
              session_id: p.session_id,
              valor_reais: (p.valor_total ?? 0) / 100,
              utmify: r.success === true,
            });
          } catch (e: any) {
            falhas.push({ session_id: p.session_id, etapa: "confirmacao", erro: e?.message });
          }
        }

        // ── ETAPA 2 ────────────────────────────────────────────────────────────
        // Pedidos que o sistema JA sabe que estao pagos, mas que nao chegaram na
        // UTMify: falha momentanea da API deles, processo interrompido no meio,
        // queda de banco. Antes desta rota, esses casos ficavam perdidos para
        // sempre, porque nada tentava de novo.
        const { data: naoEnviados, error: erroNaoEnviados } = await supabaseAdmin
          .from("pedidos")
          .select("session_id, valor_total")
          .eq("utmify_enviado", false)
          .in("status", ["pago", "gerando_foto", "foto_pronta", "erro"])
          .gte("valor_total", VALOR_MINIMO_CENTAVOS)
          .gt("created_at", seteDias)
          .order("created_at", { ascending: false })
          .limit(30);

        if (erroNaoEnviados) {
          return Response.json({ ok: false, etapa: "consulta_nao_enviados", erro: erroNaoEnviados.message }, { status: 500 });
        }

        for (const p of naoEnviados ?? []) {
          try {
            const r = await mod.enviarVendaUtmify(p.session_id);
            if (r.success) {
              enviados.push({ session_id: p.session_id, valor_reais: (p.valor_total ?? 0) / 100 });
            } else {
              falhas.push({ session_id: p.session_id, etapa: "envio", erro: (r as any).error });
            }
          } catch (e: any) {
            falhas.push({ session_id: p.session_id, etapa: "envio", erro: e?.message });
          }
        }

        console.log(
          `[sync-utmify] confirmados=${confirmados.length} enviados=${enviados.length} falhas=${falhas.length}`,
        );

        return Response.json({
          ok: true,
          resumo: {
            pendentes_verificados: pendentes?.length ?? 0,
            pagamentos_confirmados: confirmados.length,
            vendas_enviadas_agora: enviados.length,
            falhas: falhas.length,
          },
          confirmados,
          enviados,
          falhas,
        });
      },
    },
  },
});
