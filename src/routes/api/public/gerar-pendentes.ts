import { createFileRoute } from "@tanstack/react-router";

/**
 * GERACAO DE FOTOS PENDENTES
 *
 * Par da rota /api/public/sincronizar-utmify. Aquela confirma o pagamento e
 * avisa a UTMify (rapido). Esta pega o trabalho pesado: gerar e entregar as
 * fotos de quem ja esta pago mas ainda nao recebeu.
 *
 * Atende UM pedido por chamada, de proposito. Geracao leva minutos — se
 * tentassemos varrer varios de uma vez, a requisicao morreria no meio e
 * deixaria pedidos travados em "gerando_foto", que foi exatamente o que
 * aconteceu em producao no dia 15/08.
 *
 * Cobre tres situacoes:
 *   - status "pago": pagamento confirmado, geracao nunca comecou
 *   - status "erro": a geracao anterior falhou
 *   - status "gerando_foto" parado ha mais de 5 min: processo morreu no meio
 *     (o proprio reivindicarGeracao ja libera nesse caso)
 */
const SECRET = "camarada_sync_2026";

export const Route = createFileRoute("/api/public/gerar-pendentes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("secret") !== SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const mod = await import("@/lib/pedido.server");

        const seteDias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const cincoMinutos = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        // Pedidos pagos aguardando geracao, do mais antigo para o mais novo:
        // quem esta esperando ha mais tempo e atendido primeiro.
        const { data: candidatos, error } = await supabaseAdmin
          .from("pedidos")
          .select("session_id, email, valor_total, status, updated_at")
          .in("status", ["pago", "erro", "gerando_foto"])
          .gte("valor_total", 500)
          .gt("created_at", seteDias)
          .order("created_at", { ascending: true })
          .limit(20);

        if (error) {
          return Response.json({ ok: false, erro: error.message }, { status: 500 });
        }

        // "gerando_foto" so entra se estiver parado ha mais de 5 min — caso
        // contrario estariamos atropelando uma geracao que esta rodando agora.
        const alvo = (candidatos ?? []).find(
          (p) => p.status !== "gerando_foto" || (p.updated_at ?? "") < cincoMinutos,
        );

        if (!alvo) {
          return Response.json({ ok: true, processado: null, msg: "Nenhum pedido pendente de geracao." });
        }

        console.log(`[gerar-pendentes] processando ${alvo.session_id} (status anterior: ${alvo.status})`);

        try {
          await mod.gerarEEntregarFoto(alvo.session_id);
        } catch (e: any) {
          console.error(`[gerar-pendentes] falha em ${alvo.session_id}:`, e);
          const depoisDoErro = await mod.getPedido(alvo.session_id);
          return Response.json({
            ok: false,
            processado: alvo.session_id,
            email: alvo.email,
            status_final: depoisDoErro?.status,
            erro: e?.message,
          });
        }

        const depois = await mod.getPedido(alvo.session_id);
        const bumps = Array.isArray(depois?.bumps_selecionados) ? (depois!.bumps_selecionados as string[]) : [];
        const fotos = await mod.linksDasFotos(alvo.session_id, bumps);

        return Response.json({
          ok: true,
          processado: alvo.session_id,
          email: alvo.email,
          valor_reais: (alvo.valor_total ?? 0) / 100,
          status_final: depois?.status,
          fotos_geradas: fotos.length,
          restantes_na_fila: Math.max(0, (candidatos?.length ?? 1) - 1),
        });
      },
    },
  },
});
