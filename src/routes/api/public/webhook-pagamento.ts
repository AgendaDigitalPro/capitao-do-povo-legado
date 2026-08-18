import { createFileRoute } from "@tanstack/react-router";

type Payload = Record<string, any>;

function extrair(obj: Payload | null, chaves: string[]): string | null {
  if (!obj) return null;
  for (const k of chaves) {
    const v = obj[k];
    if (typeof v === "string" && v) return v;
    if (typeof v === "number" && v) return String(v);
  }
  return null;
}

export const Route = createFileRoute("/api/public/webhook-pagamento")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        let paymentId = url.searchParams.get("id");
        let externalId: string | null = null;
        let statusRecebido: string | null = null;
        let eventoPago = false;

        try {
          const bruto = (await request.json()) as Payload;
          // AbacatePay: { event: "billing.paid", data: { pixQrCode: {...} | billing: {...} } }
          const evento = extrair(bruto, ["event", "type"]);
          eventoPago = /(billing\.paid|transparent\.completed|payment\.completed)/i.test(evento ?? "");
          const dados: Payload = (bruto?.["data"] as Payload) ?? bruto;
          const corpo: Payload =
            (dados?.["pixQrCode"] as Payload) ??
            (dados?.["billing"] as Payload) ??
            (dados?.["transaction"] as Payload) ??
            dados;
          paymentId = extrair(corpo, ["id", "hash", "depositId", "transactionId"]) || paymentId;
          const meta = (corpo?.["metadata"] as Payload) ?? (dados?.["metadata"] as Payload) ?? null;
          externalId =
            extrair(meta, ["externalId", "external_id"]) ||
            extrair(corpo, ["externalId", "external_id"]);
          statusRecebido = extrair(corpo, ["status"]);
          console.log(
            `[webhook] evento=${evento} id=${paymentId} externalId=${externalId} status=${statusRecebido}`,
          );
        } catch {
          console.log("[webhook] corpo nao-JSON");
        }


        if (!paymentId && !externalId) return Response.json({ ok: true, ignorado: "sem id" });

        const mod = await import("@/lib/pedido.server");
        try {
          // 1) Localiza o pedido ANTES de consultar o gateway. Notificacoes de
          // outros sistemas (ids desconhecidos) sao ignoradas com 200.
          const pedido = externalId
            ? await mod.getPedido(externalId)
            : paymentId
              ? await mod.getPedidoByPayment(String(paymentId))
              : null;

          if (!pedido) {
            console.log(`[webhook] ignorado, pedido nao encontrado para id=${paymentId}`);
            return Response.json({ ok: true, ignorado: "pedido nao encontrado" });
          }

          const sessionId = pedido.session_id;

          // 2) Confia no evento/status do payload; so consulta a AbacatePay
          // quando o payload nao trouxe nenhum dos dois.
          let aprovado = eventoPago || mod.pagamentoAprovado(statusRecebido);
          if (!aprovado && !statusRecebido && pedido.payment_id) {
            try {
              const pagamento = await mod.consultarPagamento(pedido.payment_id);
              aprovado = mod.pagamentoAprovado(pagamento.status);
            } catch (consultaErro) {
              console.error("[webhook] consulta AbacatePay falhou:", consultaErro);
              return Response.json({ ok: true, ignorado: "consulta indisponivel" });
            }
          }
          if (!aprovado) return Response.json({ ok: true, ignorado: statusRecebido ?? "pendente" });


          // Idempotencia: reenvio do mesmo pagamento nao regride status nem gera foto de novo.
          const jaProcessando = pedido.status === "gerando_foto" || pedido.status === "foto_pronta";
          if (jaProcessando) {
            console.log(`[webhook] duplicado ignorado sessionId=${sessionId} status=${pedido.status}`);
            return Response.json({ ok: true, duplicado: true });
          }

          await mod.processarPagamentoConfirmado(sessionId);
          return Response.json({ ok: true });
        } catch (e) {
          console.error("Webhook de pagamento falhou:", e);
          return new Response("erro", { status: 500 });
        }
      },
    },
  },
});
