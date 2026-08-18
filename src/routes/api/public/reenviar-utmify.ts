import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/reenviar-utmify")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const secret = url.searchParams.get("secret");
        const email = url.searchParams.get("email");
        const sessionId = url.searchParams.get("session_id");

        // 1. Validação de Segurança
        if (secret !== "camarada_recupera_2026") {
          return new Response("Unauthorized", { status: 401 });
        }

        // 2. Filtro de Pedidos (Restrito aos 2 IDs ou Email)
        const IDS_ALVO = [
          "2dd0f444-b8dd-4c5b-b576-c0788a35976c",
          "01ebfe88-184d-4947-a344-2b3322e24f3a",
          // Vendas de 15/08/2026 (R$9,90 cada) enviadas a UTMify com o valor 100x
          // maior, antes da correcao do calculo em enviarVendaUtmify. Reenviadas
          // manualmente para corrigir o valor exibido no painel (mesmo orderId).
          "3c0748c2-f5da-4e3b-9dcd-55ba00201bc7",
          "3085372c-882b-45b1-a510-7c503e41b809"
        ];
        const EMAILS_ALVO = [
          "prof.joao.candido@hotmail.com",
          "gerinaldosdosanjos@gmail.com"
        ];

        if (!email && !sessionId) {
          return Response.json({ error: "Informe email ou session_id" }, { status: 400 });
        }

        const isAllowed = (sessionId && IDS_ALVO.includes(sessionId)) || (email && EMAILS_ALVO.includes(email));

        if (!isAllowed) {
          return Response.json({ error: "Este pedido não está na lista de reenvio manual permitida." }, { status: 403 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const mod = await import("@/lib/pedido.server");

        // 3. Buscar o pedido
        let query = supabaseAdmin.from("pedidos").select("*");
        if (sessionId) query = query.eq("session_id", sessionId);
        else if (email) query = query.eq("email", email);

        const { data: pedido, error } = await query.maybeSingle();

        if (error) return Response.json({ error: error.message }, { status: 500 });
        if (!pedido) return Response.json({ error: "Pedido não encontrado no banco." }, { status: 404 });

        // 4. Resetar flag de idempotência para permitir reenvio
        const { error: resetError } = await supabaseAdmin
          .from("pedidos")
          .update({ utmify_enviado: false, utmify_enviado_at: null } as never)
          .eq("session_id", pedido.session_id);

        if (resetError) return Response.json({ error: "Falha ao resetar flag: " + resetError.message }, { status: 500 });

        // 5. Forçar reenvio
        // Capturamos o console.error se possível, mas como enviarVendaUtmify não retorna nada,
        // confiamos no log do servidor e no estado final do banco.
        console.log(`[manual-reenvio] Disparando reenvio UTMify para ${pedido.session_id} (${pedido.email})`);

        // Chamada direta da função de envio
        await mod.enviarVendaUtmify(pedido.session_id);

        // 6. Verificar resultado no banco
        const { data: posEnvio } = await supabaseAdmin
          .from("pedidos")
          .select("utmify_enviado, utmify_enviado_at, valor_total")
          .eq("session_id", pedido.session_id)
          .single();

        return Response.json({
          success: posEnvio?.utmify_enviado === true,
          session_id: pedido.session_id,
          email: pedido.email,
          valor_enviado_total: posEnvio?.valor_total,
          enviado_at: posEnvio?.utmify_enviado_at,
          msg: posEnvio?.utmify_enviado ? "Reenviado com sucesso" : "Falha no envio (verifique logs do servidor)"
        });
      },
    },
  },
});
