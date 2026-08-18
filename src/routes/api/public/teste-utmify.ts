import { createFileRoute } from "@tanstack/react-router";

/**
 * ROTA DE TESTE — DESATIVADA POR PADRAO.
 *
 * Ela inseria um pedido falso com valor_total: 9 e enviava para a UTMify com
 * isTest: false, ou seja, cada chamada criava uma VENDA REAL de R$0,09 no
 * painel. Ja existiam 23 registros desses sujando o faturamento.
 *
 * Agora ela so roda com ?confirmar=sim explicito, usa um valor realista e
 * marca a sessao com prefixo "teste_" — que a rota de sincronizacao ignora,
 * junto com qualquer pedido abaixo de R$5,00.
 *
 * Se voce so quer validar se o token da UTMify esta valido, prefira olhar os
 * logs de uma venda real ou o retorno de /api/public/sincronizar-utmify.
 */
export const Route = createFileRoute("/api/public/teste-utmify")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const secret = url.searchParams.get("secret");
        if (secret !== "camarada_teste_2026") return new Response("Unauthorized", { status: 401 });

        if (url.searchParams.get("confirmar") !== "sim") {
          return Response.json(
            {
              ok: false,
              bloqueado: true,
              motivo:
                "Esta rota cria uma VENDA REAL na UTMify (isTest: false) e suja o seu faturamento. " +
                "Se tem certeza, repita a chamada com &confirmar=sim.",
            },
            { status: 400 },
          );
        }

        const { enviarVendaUtmify } = await import("@/lib/pedido.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const testSessionId = `teste_${Date.now()}`;

        await supabaseAdmin.from("pedidos").insert({
          session_id: testSessionId,
          email: "teste-utmify@fotocamarada.com.br",
          // 990 = R$9,90. O valor 9 antigo virava R$0,09 no painel.
          valor_total: 990,
          status: "pago",
          utmify_enviado: false,
          created_at: new Date().toISOString(),
          utm_source: "TESTE",
          utm_medium: "teste_manual",
          utm_campaign: "nao_e_venda_real",
        } as never);

        const trackingResult = await enviarVendaUtmify(testSessionId);

        return Response.json({
          ok: true,
          aviso: "Uma venda de R$9,90 foi criada na UTMify. Desconte do seu faturamento.",
          tracking_result: trackingResult,
          session_id: testSessionId,
        });
      },
    },
  },
});
