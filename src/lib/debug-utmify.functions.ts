import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const testarRastreamento = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ 
    sessionId: z.string().uuid(),
    email: z.string().email(),
    utms: z.record(z.string()).optional()
  }).parse(input))
  .handler(async ({ data }) => {
    const { upsertPedido, enviarVendaUtmify } = await import("@/lib/pedido.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    console.log(`[debug-utmify] Iniciando teste para ${data.sessionId}`);

    // 1. Salvar UTMs
    if (data.utms) {
      await upsertPedido(data.sessionId, {
        email: data.email,
        ...data.utms
      });
    }

    // 2. Simular pagamento
    await supabaseAdmin.from("pedidos").update({ status: "pago", valor_total: 9 } as never).eq("session_id", data.sessionId);

    // 3. Tentar envio UTMify
    await enviarVendaUtmify(data.sessionId);

    const { data: pedido } = await supabaseAdmin
      .from("pedidos")
      .select("*")
      .eq("session_id", data.sessionId)
      .single();

    return {
      pedido,
      success: pedido?.utmify_enviado === true
    };
  });
