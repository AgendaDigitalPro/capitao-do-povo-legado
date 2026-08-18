import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const sessao = z.string().uuid();

// ATENCAO: cartilha e telegram sairam da tela de oferta (etapa-7) por baixa adesao
// — 3,6% e 0,9%. Mas continuam AQUI de proposito: pedidos antigos que os contem
// precisam calcular o total corretamente e continuar liberando o download.
// Nunca remova uma chave daqui sem antes checar se existe pedido que a usa.
//
// O upsell NAO entra nesta tabela de proposito: ele tem valor fixo e nao passa
// por calcularTotal, que sempre soma a foto base.
const PRECOS: Record<string, number> = {
  base: 990,
  combo: 990,
  telegram: 2200,
  biografia: 599,
  cartilha: 599,
  adesivos: 599,
  wallpapers: 990,
  figurinhas: 990,
};

export function calcularTotal(bumps: string[]) {
  return bumps.reduce((t, b) => t + (PRECOS[b] ?? 0), PRECOS["base"]!);
}

/** Salva as respostas do quiz (etapas 2 a 6). */
export const salvarEtapa = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: sessao,
        cenario: z.string().optional(),
        enquadramento: z.string().optional(),
        clima: z.string().optional(),
        selfie_url: z.string().optional(),
        whatsapp: z.string().max(30).optional(),
        email: z.string().email().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { upsertPedido } = await import("./pedido.server");
    const { sessionId, ...patch } = data;
    const limpo = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await upsertPedido(sessionId, limpo);
    return { ok: true };
  });

/** Cria a cobranca Pix no AbacatePay e devolve o codigo copia e cola. */
export const criarPagamento = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: sessao,
        bumps: z.array(z.string()).max(10),
        utms: z.record(z.string().max(200)).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { getPedido, upsertPedido, atualizarCobrancaSePendente, criarCobrancaPix, gerarCpfUnico } = await import("./pedido.server");

    const pedido = (await getPedido(data.sessionId)) ?? (await upsertPedido(data.sessionId, {}));

    const CAMPOS_UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"];
    const utms = Object.fromEntries(
      Object.entries(data.utms ?? {}).filter(([k, v]) => CAMPOS_UTM.includes(k) && !!v),
    );
    if (Object.keys(utms).length > 0) {
      try {
        await upsertPedido(data.sessionId, utms);
      } catch (e) {
        console.error("[utmify] falha ao salvar UTMs:", e);
      }
    }

    const bumps = data.bumps.filter((b) => b in PRECOS && b !== "base");
    const valor_total = calcularTotal(bumps);

    const pendente = (s: string) => s === "aguardando_pagamento" || s === "pendente";

    if (!pendente(pedido.status)) {
      return {
        pixCode: (pedido as unknown as { pix_code?: string }).pix_code ?? "",
        pixImage: null as string | null,
        valorTotal: pedido.valor_total,
        paymentId: pedido.payment_id ?? "",
        pago: true,
        erro: null as string | null,
      };
    }

        // A cobranca do AbacatePay expira em 1 hora (expiresIn: 3600 em
    // criarCobrancaPix). Devolver o pix_code do cache depois disso entrega um QR
    // morto: o cliente tenta pagar, o banco recusa, e ele conclui que o site nao
    // funciona. Nao gera erro nem log — a venda simplesmente some.
    //
    // Por isso so reaproveitamos cobranca recente. Passou da janela, geramos
    // outra. Cobranca nao paga nao custa nada, entao errar para mais e barato;
    // errar para menos custa a venda inteira.
    const MINUTOS_VALIDADE_PIX = 50;
    const ultimoToque = (pedido as unknown as { updated_at?: string }).updated_at;
    const idadeEmMinutos = ultimoToque
      ? (Date.now() - new Date(ultimoToque).getTime()) / 60000
      : Number.POSITIVE_INFINITY;

    if (
      pedido.payment_id &&
      pedido.valor_total === valor_total &&
      idadeEmMinutos < MINUTOS_VALIDADE_PIX
    ) {
      const cache = (pedido as unknown as { pix_code?: string }).pix_code;
      if (cache)
        return {
          pixCode: cache,
          pixImage: null as string | null,
          valorTotal: valor_total,
          paymentId: pedido.payment_id,
          pago: false,
          erro: null as string | null,
        };
    }

    if (pedido.payment_id && idadeEmMinutos >= MINUTOS_VALIDADE_PIX) {
      console.log(
        `[pix] cobranca de ${data.sessionId} tem ${Math.round(idadeEmMinutos)} min, gerando outra`,
      );
    }
    const origem = process.env["APP_URL"] ?? "https://project--bee7f6d7-3ca9-4180-bf71-64ba7a6a5b7c.lovable.app";

    let cobranca;
    try {
      cobranca = await criarCobrancaPix({
        valorCentavos: valor_total,
        email: pedido.email ?? "camarada@fotocamarada.com.br",
        name: pedido.email ? pedido.email.split("@")[0]!.slice(0, 30) : "Companheiro",
        document: gerarCpfUnico(data.sessionId),
        phone: pedido.whatsapp?.replace(/\D/g, "") ?? "00000000000",
        descricao: "Foto Camarada - sua foto com o Presidente",
        notificationUrl: `${origem}/api/public/webhook-pagamento`,
        externalId: data.sessionId,
      });
    } catch (e: any) {
      console.error("ERRO DETALHADO NO SERVER FN criarPagamento:", e);
      const msg = e?.message || "Falha ao gerar o Pix.";
      return {
        pixCode: "",
        pixImage: null as string | null,
        valorTotal: valor_total,
        paymentId: "",
        pago: false,
        erro: `Erro no servidor: ${msg.replace("ABACATEPAY_ERRO: ", "")}`,
      };
    }

    const pixCode = cobranca.pix_code || "";
    const pixImage = cobranca.pix_image || null;

    await atualizarCobrancaSePendente(data.sessionId, {
      bumps_selecionados: bumps,
      valor_total,
      payment_id: String(cobranca.id),
      pix_code: pixCode,
    });

    const atual = await getPedido(data.sessionId);
    const pago = !!atual && !pendente(atual.status);

    return {
      pixCode,
      pixImage,
      valorTotal: valor_total,
      paymentId: String(cobranca.id),
      pago,
      erro: null as string | null,
    };
  });


type FotoEntregue = { slug: string; nome: string; url: string };

/** Consulta o status do pedido; confirma o pagamento direto na AbacatePay se preciso. */
export const statusPedido = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ sessionId: sessao }).parse(input))
  .handler(async ({ data }) => {
    const mod = await import("./pedido.server");
    const pedido = await mod.getPedido(data.sessionId);
    if (!pedido) return { status: "nao_encontrado" as const, fotoUrl: null, fotos: [] as FotoEntregue[] };

    let status = pedido.status;

    const naoPago = status === "aguardando_pagamento" || status === "pendente";
    if (naoPago && pedido.payment_id) {
      try {
        const pg = await mod.consultarPagamento(pedido.payment_id);
        console.log(`[status] pedido ${data.sessionId} abacatepay=${pg.status}`);
        if (mod.pagamentoAprovado(pg.status)) {
          await mod.processarPagamentoConfirmado(data.sessionId);
          status = "pago";
        }
      } catch (e) {
        console.error("Falha ao consultar pagamento:", e);
      }
    }

    if (status === "pago" || status === "erro" || status === "gerando_foto") {
      try {
        await mod.gerarEEntregarFoto(data.sessionId);
      } catch {
        /* o erro fica salvo no pedido */
      }
      const atualizado = await mod.getPedido(data.sessionId);
      status = atualizado?.status ?? status;
      if (atualizado?.status === "foto_pronta" && atualizado.foto_gerada_url) {
        const bumps = Array.isArray(atualizado.bumps_selecionados)
          ? (atualizado.bumps_selecionados as string[])
          : [];
        const fotos = await mod.linksDasFotos(data.sessionId, bumps);
        return {
          status: "foto_pronta",
          fotoUrl:
            fotos[0]?.url ??
            (await mod.signedUrl("fotos-geradas", atualizado.foto_gerada_url, 60 * 60 * 24 * 7)),
          fotos,
        };
      }
      return { status, fotoUrl: null, fotos: [] as FotoEntregue[] };
    }

    let fotoUrl: string | null = null;
    let fotos: FotoEntregue[] = [];
    if (status === "foto_pronta" && pedido.foto_gerada_url) {
      const bumps = Array.isArray(pedido.bumps_selecionados) ? (pedido.bumps_selecionados as string[]) : [];
      fotos = await mod.linksDasFotos(data.sessionId, bumps);
      fotoUrl =
        fotos[0]?.url ??
        (await mod.signedUrl("fotos-geradas", pedido.foto_gerada_url, 60 * 60 * 24 * 7));
    }
    return { status, fotoUrl, fotos };
  });


// ───────────────────────────────────────────────────────────────────────────
// UPSELL — 3 fotos em ambientes diferentes, R$19,90
//
// O upsell e um PEDIDO NOVO, com sessao propria derivada da sessao de origem.
// Nao toca em criarPagamento nem em calcularTotal, que continuam exatamente
// como estavam. A sessao derivada e deterministica, entao clicar duas vezes no
// botao cai sempre na mesma linha em vez de criar dois pedidos.
//
// Depois de criado, o acompanhamento usa o statusPedido normal, passando o
// sessionId do upsell. Webhook, geracao, entrega, e-mail e UTMify funcionam sem
// nenhuma alteracao — para eles e so mais um pedido.
// ───────────────────────────────────────────────────────────────────────────
export const criarUpsell = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ sessionId: sessao }).parse(input))
  .handler(async ({ data }) => {
    const mod = await import("./pedido.server");

    const vazio = {
      sessionIdUpsell: "",
      pixCode: "",
      pixImage: null as string | null,
      valorTotal: mod.VALOR_UPSELL_CENTAVOS,
      pago: false,
    };

    const origem = (await mod.getPedido(data.sessionId)) as any;
    if (!origem) return { ...vazio, erro: "Pedido original não encontrado." };

    const bumpsOrigem = Array.isArray(origem.bumps_selecionados) ? (origem.bumps_selecionados as string[]) : [];
    if (bumpsOrigem.includes(mod.MARCA_UPSELL)) {
      return { ...vazio, erro: "Este pedido já é um upsell." };
    }

    // So oferece upsell para quem ja pagou a foto principal.
    const PAGO = ["pago", "gerando_foto", "foto_pronta", "erro"];
    if (!PAGO.includes(origem.status)) {
      return { ...vazio, erro: "A sua primeira foto ainda não foi confirmada." };
    }
    if (!origem.selfie_url) {
      return { ...vazio, erro: "Não encontramos a sua selfie para gerar as novas fotos." };
    }

    const sessaoUp = mod.sessaoDoUpsell(data.sessionId);
    const existente = (await mod.getPedido(sessaoUp)) as any;
    const pendente = (s: string) => s === "aguardando_pagamento" || s === "pendente";

    // Ja pago: nao gera cobranca nova, so devolve o estado para a tela acompanhar.
    if (existente && !pendente(existente.status)) {
      return {
        sessionIdUpsell: sessaoUp,
        pixCode: existente.pix_code ?? "",
        pixImage: null as string | null,
        valorTotal: existente.valor_total,
        pago: true,
        erro: null as string | null,
      };
    }

    // Cria (ou atualiza) o pedido do upsell herdando o necessario do original.
    // A selfie e a mesma: o cliente NAO precisa enviar nada de novo.
    await mod.upsertPedido(sessaoUp, {
      selfie_url: origem.selfie_url,
      email: origem.email,
      whatsapp: origem.whatsapp,
      cenario: origem.cenario,
      utm_source: origem.utm_source,
      utm_medium: origem.utm_medium,
      utm_campaign: origem.utm_campaign,
      utm_content: origem.utm_content,
      utm_term: origem.utm_term,
      fbclid: origem.fbclid,
      bumps_selecionados: [mod.MARCA_UPSELL],
      valor_total: mod.VALOR_UPSELL_CENTAVOS,
      status: "aguardando_pagamento",
    });

    // Sempre gera cobranca nova: o Pix expira em 1 hora e devolver um QR vencido
    // faria o cliente achar que o site nao funciona.
    const base = process.env["APP_URL"] ?? "https://fotocamarada.lovable.app";
    let cobranca;
    try {
      cobranca = await mod.criarCobrancaPix({
        valorCentavos: mod.VALOR_UPSELL_CENTAVOS,
        email: origem.email ?? "camarada@fotocamarada.com.br",
        name: origem.email ? String(origem.email).split("@")[0]!.slice(0, 30) : "Companheiro",
        document: mod.gerarCpfUnico(sessaoUp),
        phone: String(origem.whatsapp ?? "").replace(/\D/g, "") || "00000000000",
        descricao: "Foto Camarada - 3 fotos em novos ambientes",
        notificationUrl: `${base}/api/public/webhook-pagamento`,
        externalId: sessaoUp,
      });
    } catch (e: any) {
      console.error("[upsell] falha ao criar cobranca:", e);
      return {
        ...vazio,
        sessionIdUpsell: sessaoUp,
        erro: `Não conseguimos gerar o Pix agora: ${String(e?.message ?? "").replace("ABACATEPAY_ERRO: ", "")}`,
      };
    }

    await mod.atualizarCobrancaSePendente(sessaoUp, {
      payment_id: String(cobranca.id),
      pix_code: cobranca.pix_code || "",
    });

    console.log(`[upsell] pedido ${sessaoUp} criado a partir de ${data.sessionId}`);

    return {
      sessionIdUpsell: sessaoUp,
      pixCode: cobranca.pix_code || "",
      pixImage: cobranca.pix_image || null,
      valorTotal: mod.VALOR_UPSELL_CENTAVOS,
      pago: false,
      erro: null as string | null,
    };
  });
