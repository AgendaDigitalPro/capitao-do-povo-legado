import { supabaseAdmin } from "@/integrations/supabase/client.server";
export type Pedido = {
  id: string;
  session_id: string;
  cenario: string | null;
  enquadramento: string | null;
  clima: string | null;
  selfie_url: string | null;
  whatsapp: string | null;
  email: string | null;
  bumps_selecionados: string[];
  valor_total: number;
  status: string;
  payment_id: string | null;
  foto_gerada_url: string | null;
};
type PedidoPatch = Record<string, unknown>;
export async function upsertPedido(sessionId: string, patch: PedidoPatch) {
  const { data, error } = await supabaseAdmin
    .from("pedidos")
    .upsert({ session_id: sessionId, ...patch } as never, { onConflict: "session_id" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as Pedido;
}
export async function getPedido(sessionId: string) {
  const { data } = await supabaseAdmin.from("pedidos").select("*").eq("session_id", sessionId).maybeSingle();
  return (data as unknown as Pedido | null) ?? null;
}
export async function getPedidoByPayment(paymentId: string) {
  const { data } = await supabaseAdmin.from("pedidos").select("*").eq("payment_id", paymentId).maybeSingle();
  return (data as unknown as Pedido | null) ?? null;
}
export async function setStatus(sessionId: string, patch: PedidoPatch) {
  const { error } = await supabaseAdmin.from("pedidos").update(patch as never).eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}
export async function atualizarCobrancaSePendente(sessionId: string, patch: PedidoPatch) {
  const { error } = await supabaseAdmin
    .from("pedidos")
    .update(patch as never)
    .eq("session_id", sessionId)
    .in("status", ["aguardando_pagamento", "pendente"]);
  if (error) throw new Error(error.message);
}
export async function signedUrl(bucket: string, path: string, seconds = 3600) {
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, seconds);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
// Remove o prefixo do bucket do caminho, caso o valor salvo venha com o bucket na frente.
// Ex: "selfies/abc/foto.jpg" com bucket "selfies" -> "abc/foto.jpg"
// Isso evita o caminho duplicado "selfies/selfies/..." que faz a selfie não carregar.
function caminhoDentroDoBucket(bucket: string, caminho: string): string {
  let limpo = String(caminho).trim().replace(/^\/+/, "");
  const prefixo = `${bucket}/`;
  while (limpo.startsWith(prefixo)) {
    limpo = limpo.slice(prefixo.length);
  }
  return limpo;
}
const ABACATEPAY_BASE = "https://api.abacatepay.com/v1";
export function gerarCpfUnico(sessionId: string): string {
  let h1 = 7;
  let h2 = 13;
  for (let i = 0; i < sessionId.length; i++) {
    const c = sessionId.charCodeAt(i);
    h1 = (h1 * 31 + c) % 1000000007;
    h2 = (h2 * 37 + c * (i + 1)) % 1000000009;
  }
  const base = (String(h1) + String(h2)).replace(/\D/g, "").padEnd(9, "1").slice(0, 9);
  const digitos = base.split("").map(Number);
  const verificador = (nums: number[], pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < nums.length; i++) soma += nums[i]! * (pesoInicial - i);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = verificador(digitos, 10);
  const d2 = verificador([...digitos, d1], 11);
  return digitos.join("") + String(d1) + String(d2);
}
export async function criarCobrancaPix(args: {
  valorCentavos: number;
  email: string;
  name: string;
  document: string;
  phone?: string;
  descricao: string;
  notificationUrl: string;
  externalId: string;
}) {
  const token = process.env["ABACATEPAY_API_KEY"];
  if (!token) throw new Error("ABACATEPAY_API_KEY não configurado");
  const payload = {
    amount: Math.round(args.valorCentavos),
    expiresIn: 3600,
    description: args.descricao,
    customer: {
      name: args.name,
      cellphone: args.phone ?? "00000000000",
      email: args.email,
      taxId: args.document.replace(/\D/g, ""),
    },
    metadata: { externalId: args.externalId },
  };
  const res = await fetch(`${ABACATEPAY_BASE}/pixQrCode/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`ABACATEPAY_ERRO: ${body}`);
  const json = JSON.parse(body);
  const d = json?.data ?? {};
  return { id: d.id, status: d.status, pix_code: d.brCode, pix_image: d.brCodeBase64 };
}
const STATUS_PAGOS = new Set(["paid", "approved", "aprovado", "completed", "complete", "success", "succeeded", "confirmed", "settled"]);
export function pagamentoAprovado(status: unknown) {
  return STATUS_PAGOS.has(String(status ?? "").toLowerCase().trim());
}
export async function consultarPagamento(cobrancaId: string) {
  const token = process.env["ABACATEPAY_API_KEY"];
  if (!token) throw new Error("ABACATEPAY_API_KEY não configurado");
  const res = await fetch(`${ABACATEPAY_BASE}/pixQrCode/check?id=${encodeURIComponent(cobrancaId)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`AbacatePay consulta erro [${res.status}]`);
  const json = JSON.parse(body);
  return { id: json?.data?.id ?? cobrancaId, status: json?.data?.status };
}
// Cenários oferecidos no quiz. As chaves selfie / brasilia / ato / encontro são
// as que o funil realmente usa hoje. "camarada" nunca foi escolhido por nenhum
// cliente, mas fica aqui por segurança: se algum pedido antigo tiver esse valor,
// ele continua gerando normalmente.
//
// Antes desta versão, "encontro" e "camarada" tinham exatamente o mesmo texto —
// um abraço genérico em ambiente casual, que não correspondia ao que a landing
// promete ("encontro em Brasília"). Foi reescrito.
const PROMPTS: Record<string, string> = {
  selfie:
    "Close-up selfie of two people together, arm extended holding the phone, both smiling warmly at the camera, indoors in a simple Brazilian home, soft natural window light, slight camera tilt, authentic candid smartphone photo, sharp faces, shallow depth of field, photorealistic",
  brasilia:
    "Two people standing side by side inside a grand official government palace hall, tall windows and polished marble floor, formal suits, confident posture, both smiling at the camera, soft diffused daylight from the side, wide institutional interior, photorealistic editorial photograph",
  ato:
    "Two people together in the middle of a large outdoor street demonstration, dense crowd behind them, red flags and banners raised, both smiling and energetic, late afternoon sunlight, slight motion in the background crowd, photojournalistic street photograph, sharp faces",
  encontro:
    "Two people meeting and greeting each other warmly, shaking hands and smiling face to face, elegant reception room with wooden panels and flags in the background, formal attire, warm indoor lighting, respectful and emotional moment, photorealistic documentary photograph",
  camarada:
    "Two people side by side outdoors in a simple Brazilian neighborhood street, both smiling at the camera, casual everyday clothes, warm golden afternoon light, relaxed and friendly mood, photorealistic candid photograph",

  // ── AMBIENTES EXCLUSIVOS DO UPSELL ─────────────────────────────────────────
  // Três cenários deliberadamente distintos entre si e dos de cima: um interior
  // formal sentado, um exterior com multidão, e um interior íntimo de mesa.
  // A diferença visual entre eles é o que justifica vender "3 ambientes".
  gabinete:
    "Two people seated together in a presidential office, dark wooden desk and bookshelves behind, national flags standing in the corner, both in formal attire leaning slightly toward each other while smiling, warm lamp light mixed with window daylight, dignified and calm atmosphere, photorealistic portrait photograph",
  comicio:
    "Two people standing together on an outdoor stage above a huge cheering crowd, arms raised in celebration, red flags waving everywhere below, open sky at golden hour, powerful backlight and lens flare, wide dramatic angle from the stage, photorealistic event photograph",
  mesa:
    "Two people sitting across a small table in a modest Brazilian kitchen, cups of coffee between them, laughing in the middle of a conversation, checkered tablecloth, simple domestic background, warm morning light through a window, intimate and homey atmosphere, photorealistic candid photograph",
};

// Ambientes vendidos no upsell de R$19,90. A ordem aqui é a ordem de entrega.
export const AMBIENTES_UPSELL = [
  { slug: "gabinete", nome: "No gabinete presidencial", cenario: "gabinete" },
  { slug: "comicio", nome: "No comício, no meio do povo", cenario: "comicio" },
  { slug: "mesa", nome: "Na mesa do café", cenario: "mesa" },
];

// Marcacao que identifica um pedido de upsell. Fica em bumps_selecionados para
// nao exigir mudanca de schema. Nao existe em PRECOS de proposito: o upsell nao
// passa por calcularTotal, ele tem valor fixo.
export const MARCA_UPSELL = "upsell_ambientes";
export const VALOR_UPSELL_CENTAVOS = 1990;

// ───────────────────────────────────────────────────────────────────────────
// SESSAO DO UPSELL
//
// O upsell e um PEDIDO NOVO, nao uma segunda cobranca no mesmo pedido. Se
// reaproveitasse a linha original, o payment_id da primeira venda seria
// sobrescrito, o status voltaria a pendente, a tela de entrega sumiria e o
// webhook (que ignora pedido com status foto_pronta) nunca confirmaria.
//
// O id da sessao do upsell e DERIVADO do pedido de origem, de forma
// deterministica: o mesmo pedido sempre produz o mesmo id. Isso da idempotencia
// de graca — se o cliente clicar duas vezes no botao, o upsert cai na mesma
// linha em vez de criar dois pedidos.
// ───────────────────────────────────────────────────────────────────────────
function hexDeterministico(semente: string, tamanho: number): string {
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0x01000193 >>> 0;
  let saida = "";
  for (let volta = 0; saida.length < tamanho; volta++) {
    for (let j = 0; j < semente.length; j++) {
      const c = semente.charCodeAt(j);
      h1 = Math.imul((h1 ^ c) >>> 0, 16777619) >>> 0;
      h2 = Math.imul((h2 + c * (j + 1 + volta)) >>> 0, 2654435761) >>> 0;
    }
    saida += ((h1 ^ h2) >>> 0).toString(16).padStart(8, "0");
  }
  return saida.slice(0, tamanho);
}

/** Id de sessao do upsell derivado do pedido original. Formato UUID v4 valido. */
export function sessaoDoUpsell(sessionIdOrigem: string): string {
  const h = hexDeterministico(`${sessionIdOrigem}|${MARCA_UPSELL}`, 32);
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    "4" + h.slice(13, 16),
    "8" + h.slice(17, 20),
    h.slice(20, 32),
  ].join("-");
}

// ───────────────────────────────────────────────────────────────────────────
// ORDER BUMP "combo" — Combo 3 Lideres da Esquerda
//
// A oferta da etapa 7 promete "SUA FOTO VIRA 3": a mesma selfie, no mesmo
// cenario escolhido no quiz, tambem com a Dilma e o Boulos.
//
// A referencia do Presidente vem do bucket "referencias" do Storage. As duas
// novas vem da pasta publica public/referencias do proprio site.
// ───────────────────────────────────────────────────────────────────────────
const APP_BASE = process.env["APP_URL"] ?? "https://fotocamarada.lovable.app";
const LIDERES_COMBO = [
  { slug: "dilma", nome: "Dilma" },
  { slug: "boulos", nome: "Boulos" },
];

/**
 * Devolve os links assinados de TODAS as fotos que existem para o pedido.
 *
 * - Pedido de upsell: as 3 fotos de ambiente.
 * - Pedido normal com combo: principal + Dilma + Boulos.
 * - Pedido normal sem combo: apenas a principal — comportamento de sempre.
 *
 * Foto que ainda nao existe simplesmente nao entra na lista.
 */
export async function linksDasFotos(sessionId: string, bumps: string[], seconds = 60 * 60 * 24 * 7) {
  const alvos: { slug: string; nome: string; path: string }[] = bumps.includes(MARCA_UPSELL)
    ? AMBIENTES_UPSELL.map((a) => ({ slug: a.slug, nome: a.nome, path: `${sessionId}-${a.slug}.png` }))
    : [
        { slug: "lula", nome: "Presidente", path: `${sessionId}.png` },
        ...(bumps.includes("combo")
          ? LIDERES_COMBO.map((l) => ({ slug: l.slug, nome: l.nome, path: `${sessionId}-${l.slug}.png` }))
          : []),
      ];

  const encontradas: { slug: string; nome: string; url: string }[] = [];
  for (const a of alvos) {
    try {
      encontradas.push({ slug: a.slug, nome: a.nome, url: await signedUrl("fotos-geradas", a.path, seconds) });
    } catch {
      /* foto ainda nao gerada — apenas nao entra na lista */
    }
  }
  return encontradas;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function extrairUrl(payload: unknown): string | null {
  const visto = new Set<unknown>();
  const busca = (node: unknown): string | null => {
    if (typeof node === "string") return /^https?:\/\/\S+\.(png|jpg|jpeg|webp)/i.test(node) ? node : null;
    if (!node || typeof node !== "object" || visto.has(node)) return null;
    visto.add(node);
    for (const value of Object.values(node as Record<string, unknown>)) {
      const found = busca(value);
      if (found) return found;
    }
    return null;
  };
  return busca(payload);
}
export async function gerarImagemKie(args: { prompt: string; imageUrls: string[] }) {
  const key = process.env["KIE_API_KEY"];
  if (!key) throw new Error("KIE_API_KEY nao configurado");
  const res = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen3/image-to-image",
      input: {
        prompt: args.prompt,
        negative_prompt: "blurry, low quality, distorted, deformed faces, extra limbs, bad anatomy, watermark, text overlay",
        image_urls: args.imageUrls.slice(0, 3),
        resolution: "1K",
        image_size: "1:1",
        output_format: "png",
        prompt_extend: false,
        nsfw_checker: false,
      },
    }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`KIE erro [${res.status}]: ${raw}`);
  const json = JSON.parse(raw);
  const direta = extrairUrl(json);
  if (direta) return direta;
  const taskId = json['data']?.taskId ?? json['taskId'];
  if (!taskId) throw new Error(`KIE nao retornou imagem nem task: ${raw}`);
  for (let i = 0; i < 36; i++) {
    await sleep(5000);
    const r = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, { headers: { Authorization: `Bearer ${key}` } });
    if (!r.ok) continue;
    const body = await r.json();
    const estado = String(body['data']?.state ?? "").toLowerCase();
    if (estado === "fail" || estado === "error") throw new Error(`KIE falhou: ${JSON.stringify(body)}`);
    if (estado === "success") {
      const resultJson = body['data']?.resultJson;
      const parsed = typeof resultJson === "string" ? JSON.parse(resultJson) : resultJson;
      const url = parsed?.resultUrls?.[0] ?? extrairUrl(body);
      if (url) return url;
    }
    const found = extrairUrl(body);
    if (found) return found;
  }
  throw new Error("KIE demorou demais");
}
async function paraDataUrl(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Falha ao baixar imagem [${r.status}]`);
  const tipo = r.headers.get("content-type") ?? "image/jpeg";
  const buf = new Uint8Array(await r.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return `data:${tipo};base64,${btoa(bin)}`;
}
export async function gerarImagemLovable(args: { prompt: string; imageUrls: string[] }) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY nao configurado");
  const imagens = await Promise.all(args.imageUrls.map(paraDataUrl));
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: [{ type: "text", text: args.prompt }, ...imagens.map((url) => ({ type: "image_url", image_url: { url } }))] }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) throw new Error(`Lovable AI erro [${res.status}]`);
  const json = await res.json();
  const dataUrl = json['choices']?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl) throw new Error("Lovable AI nao retornou imagem");
  const base64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Gera UMA foto: tenta a KIE e, se falhar, cai no fallback do Lovable.
async function gerarBytesFoto(prompt: string, imageUrls: string[], etiqueta: string): Promise<Uint8Array> {
  try {
    const urlGerada = await gerarImagemKie({ prompt, imageUrls });
    const imgRes = await fetch(urlGerada);
    return new Uint8Array(await imgRes.arrayBuffer());
  } catch (errKie) {
    console.error(`[gerarFoto] KIE falhou para ${etiqueta}, tentando fallback Lovable:`, errKie);
    return await gerarImagemLovable({ prompt, imageUrls });
  }
}

export async function processarPagamentoConfirmado(sessionId: string) {
  const pedido = await getPedido(sessionId);
  if (!pedido) return;
  const pendente = pedido.status === "aguardando_pagamento" || pedido.status === "pendente";
  if (pendente) {
    console.log(`[processarPagamento] confirmando status PAGO para ${sessionId}`);
    await setStatus(sessionId, { status: "pago" });
  }
  await enviarVendaUtmify(sessionId);
  try {
    await gerarEEntregarFoto(sessionId);
  } catch (err) {
    console.error(`[processarPagamento] erro geracao ${sessionId}:`, err);
  }
}
export async function reivindicarGeracao(sessionId: string) {
  const limite = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("pedidos")
    .update({ status: "gerando_foto", erro: null } as never)
    .eq("session_id", sessionId)
    .or(`status.in.(aguardando_pagamento,pago,erro),and(status.eq.gerando_foto,updated_at.lt.${limite})`)
    .select("session_id");
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}
export async function gerarEEntregarFoto(sessionId: string) {
  const pedido = await getPedido(sessionId);
  if (!pedido || pedido.status === "foto_pronta") return;
  const reivindicado = await reivindicarGeracao(sessionId);
  if (!reivindicado) return;
  try {
    // Corrige o caminho da selfie: remove o prefixo "selfies/" caso o valor salvo já venha
    // com o bucket na frente, evitando o caminho duplicado "selfies/selfies/...".
    const selfiePath = caminhoDentroDoBucket("selfies", pedido.selfie_url ?? `${sessionId}.jpg`);
    const selfieAssinada = await signedUrl("selfies", selfiePath);
    const referenciaAssinada = await signedUrl("referencias", "presidente.jpg");

    const bumps = Array.isArray(pedido.bumps_selecionados) ? (pedido.bumps_selecionados as string[]) : [];
    const ehUpsell = bumps.includes(MARCA_UPSELL);
    const temCombo = bumps.includes("combo");

    // Monta a lista de fotos a gerar.
    //   upsell  -> 3 fotos, sempre com o Presidente, em 3 ambientes diferentes
    //   combo   -> principal + Dilma + Boulos, no cenario escolhido no quiz
    //   nenhum  -> uma foto so, exatamente como sempre foi
    const promptDoQuiz = PROMPTS[pedido.cenario ?? "selfie"] ?? PROMPTS["selfie"]!;
    const tarefas: { slug: string; referencia: string; destino: string; prompt: string }[] = ehUpsell
      ? AMBIENTES_UPSELL.map((a) => ({
          slug: a.slug,
          referencia: referenciaAssinada,
          destino: `${sessionId}-${a.slug}.png`,
          prompt: PROMPTS[a.cenario]!,
        }))
      : [
          {
            slug: "lula",
            referencia: referenciaAssinada,
            destino: `${sessionId}.png`,
            prompt: promptDoQuiz,
          },
          ...(temCombo
            ? LIDERES_COMBO.map((l) => ({
                slug: l.slug,
                referencia: `${APP_BASE}/referencias/${l.slug}.jpg`,
                destino: `${sessionId}-${l.slug}.png`,
                prompt: promptDoQuiz,
              }))
            : []),
        ];

    if (ehUpsell) console.log(`[gerarFoto] upsell 3 ambientes para ${sessionId}`);
    else if (temCombo) console.log(`[gerarFoto] combo 3 lideres ativo para ${sessionId}`);

    // Em paralelo: o cliente espera o tempo de UMA geracao, nao de tres. Isso
    // tambem evita estourar a janela de 3 min do reivindicarGeracao.
    const resultados = await Promise.allSettled(
      tarefas.map(async (t) => {
        const bytes = await gerarBytesFoto(t.prompt, [t.referencia, selfieAssinada], `${sessionId}/${t.slug}`);
        const up = await supabaseAdmin.storage
          .from("fotos-geradas")
          .upload(t.destino, bytes, { contentType: "image/png", upsert: true });
        if (up.error) throw new Error(up.error.message);
        return t.destino;
      }),
    );

    // A primeira foto e obrigatoria: se ela falhar, o pedido vai para "erro"
    // exatamente como antes. As demais sao best-effort — o cliente recebe o que
    // deu certo e a falha fica registrada no log.
    const principal = resultados[0]!;
    if (principal.status === "rejected") throw principal.reason;
    const destinoPrincipal = tarefas[0]!.destino;

    const extras: string[] = [];
    for (const r of resultados.slice(1)) {
      if (r.status === "fulfilled") extras.push(r.value);
      else console.error(`[gerarFoto] foto adicional falhou para ${sessionId}:`, r.reason);
    }
    if (tarefas.length > 1 && extras.length < tarefas.length - 1) {
      console.error(
        `[gerarFoto] ATENCAO ${sessionId}: pago por ${tarefas.length} fotos mas so ${extras.length + 1} foram geradas`,
      );
    }

    await setStatus(sessionId, { status: "foto_pronta", foto_gerada_url: destinoPrincipal, erro: null });
    const links = await Promise.all(
      [destinoPrincipal, ...extras].map((d) => signedUrl("fotos-geradas", d, 60 * 60 * 24 * 7)),
    );
    if (pedido.email) await enviarEmail(pedido.email, links, ehUpsell, sessionId);
  } catch (e: any) {
    await setStatus(sessionId, { status: "erro", erro: e.message });
    throw e;
  }
}
export async function enviarEmail(
  email: string,
  linkFoto: string | string[],
  ehUpsell = false,
  sessionId?: string,
) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return;
  const links = Array.isArray(linkFoto) ? linkFoto : [linkFoto];
  const principal = links[0] ?? "";
  const blocos = links
    .map(
      (l) =>
        `<p><img src="${l}" style="max-width:100%;border-radius:10px" /></p><p><a href="${l}" style="background:#c8102e;color:#fff;padding:10px 18px;text-decoration:none;border-radius:10px;display:inline-block">Baixar esta foto</a></p>`,
    )
    .join("");

  const titulo = ehUpsell
    ? "Suas fotos nos 3 ambientes chegaram!"
    : links.length > 1
      ? "Suas fotos chegaram!"
      : "Sua foto chegou!";
  const assunto = ehUpsell
    ? "🚩 Suas 3 fotos em novos ambientes chegaram, camarada!"
    : links.length > 1
      ? "🚩 Suas fotos com os 3 líderes chegaram, camarada!"
      : "🚩 Sua foto com o Presidente chegou, camarada!";

  // Oferta dos 3 ambientes. Só entra no e-mail de quem AINDA NAO comprou o
  // upsell — quem ja comprou recebe o e-mail de entrega dele, sem oferta.
  // O link carrega a sessao (?s=), entao o cliente cai direto no checkout com
  // a foto dele, sem refazer o quiz.
  const oferta =
    !ehUpsell && sessionId
      ? `
    <div style="margin-top:28px;padding:20px;border:2px solid #16a34a;border-radius:14px;background:#f0fdf4">
      <p style="margin:0;font-size:12px;font-weight:bold;color:#16a34a;text-transform:uppercase;letter-spacing:1px">Só para quem já é camarada</p>
      <h2 style="margin:8px 0 0;font-size:20px;color:#1a1a1a">Quer a sua foto em mais 3 lugares?</h2>
      <p style="margin:10px 0 0;font-size:15px;line-height:1.5;color:#444">
        A <strong>mesma foto sua</strong>, agora no gabinete presidencial, no meio do comício
        e na mesa do café.
      </p>
      <p style="margin:14px 0 0;padding:12px;background:#fff;border-radius:10px;font-size:15px;font-weight:bold;color:#1a1a1a;text-align:center">
        Você não precisa mandar selfie de novo.<br>Já está tudo pronto, é só pagar.
      </p>
      <p style="margin:16px 0 0;text-align:center">
        <span style="font-size:15px;color:#888;text-decoration:line-through">R$ 59,70</span>
        <span style="font-size:30px;font-weight:bold;color:#16a34a;margin-left:8px">R$ 19,90</span>
        <span style="font-size:15px;color:#444"> as três</span>
      </p>
      <p style="margin:18px 0 0;text-align:center">
        <a href="${APP_BASE}/etapa-8?s=${sessionId}" style="background:#16a34a;color:#fff;padding:16px 26px;text-decoration:none;border-radius:12px;display:inline-block;font-size:17px;font-weight:bold">
          QUERO AS 3 FOTOS
        </a>
      </p>
      <p style="margin:12px 0 0;text-align:center;font-size:12px;color:#888">
        Pagamento único no Pix. As fotos chegam na tela e no seu e-mail.
      </p>
    </div>`
      : "";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      // Dominio fotocamarada.online verificado no Resend (DKIM + SPF).
      from: process.env["EMAIL_FROM"] || "Foto Camarada <contato@fotocamarada.online>",
      to: [email],
      subject: assunto,
      html: `<div style="font-family:Arial;padding:24px;max-width:600px;margin:0 auto"><h1 style="color:#c8102e">${titulo}</h1>${blocos || `<p><a href="${principal}">Baixar Foto</a></p>`}${oferta}</div>`,
    }),
  });
}
async function reivindicarEnvioUtmify(sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from("pedidos")
    .update({ utmify_enviado: true, utmify_enviado_at: new Date().toISOString() } as never)
    .eq("session_id", sessionId)
    .eq("utmify_enviado", false)
    .select("session_id");
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}
function dataUtmify(valor?: string | null) {
  const d = valor ? new Date(valor) : new Date();
  return d.toISOString().slice(0, 19).replace("T", " ");
}
export async function enviarVendaUtmify(sessionId: string) {
  try {
    const token = process.env["UTMIFY_API_TOKEN"];
    if (!token) {
      console.warn("[utmify] TOKEN AUSENTE");
      return { success: false, error: "TOKEN AUSENTE" };
    }
    const pedido = (await getPedido(sessionId)) as any;
    if (!pedido) return { success: false, error: "PEDIDO NÃO ENCONTRADO" };

    if (pedido.utmify_enviado) {
      console.log(`[utmify] venda já enviada anteriormente para ${sessionId}`);
      return { success: true, already_sent: true };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VALOR DA VENDA
    //
    // A UTMify exibe o valor no dashboard a partir de commission.totalPriceInCents.
    // products[].priceInCents e apenas detalhe do item e NAO alimenta o painel.
    //
    // pedido.valor_total ja esta em CENTAVOS no banco (990 = R$9,90), o mesmo
    // numero entregue ao AbacatePay. Enviar o proprio numero, sem multiplicar
    // nem dividir. Math.round garante inteiro, exigencia da API.
    // ─────────────────────────────────────────────────────────────────────────
    const total = Number(pedido.valor_total ?? 0);
    const valorEmCentavos = Math.round(total);

    const bumps = Array.isArray(pedido.bumps_selecionados) ? (pedido.bumps_selecionados as string[]) : [];
    const ehUpsell = bumps.includes(MARCA_UPSELL);

    const body = {
      orderId: pedido.payment_id || sessionId,
      platform: "FotoCamarada",
      paymentMethod: "pix",
      status: "paid",
      createdAt: dataUtmify(pedido.created_at),
      approvedDate: dataUtmify(),
      customer: {
        name: pedido.email?.split("@")[0] || "Camarada",
        email: pedido.email || `${sessionId}@fotocamarada.com.br`,
        phone: pedido.whatsapp || null,
        document: gerarCpfUnico(sessionId),
        country: "BR",
      },
      products: [
        {
            id: ehUpsell ? "upsell-3-ambientes" : "foto-camarada",
            name: ehUpsell ? "Upsell 3 Ambientes" : "Foto Camarada",
            quantity: 1,
            priceInCents: valorEmCentavos,
            planId: ehUpsell ? "upsell" : "plano_unico",
            planName: ehUpsell ? "3 Ambientes" : "Foto Única"
        }
      ],
      trackingParameters: {
        utm_source: pedido.utm_source || null,
        utm_medium: pedido.utm_medium || null,
        utm_campaign: pedido.utm_campaign || null,
        utm_content: pedido.utm_content || null,
        utm_term: pedido.utm_term || null,
      },
      commission: {
        totalPriceInCents: valorEmCentavos,
        gatewayFeeInCents: 0,
        userCommissionInCents: valorEmCentavos
      },
      isTest: false,
    };
    console.log(`[utmify] valor_total(bruto)=${pedido.valor_total} -> totalPriceInCents=${valorEmCentavos}${ehUpsell ? " (UPSELL)" : ""}`);
    const res = await fetch("https://api.utmify.com.br/api-credentials/orders", {
      method: "POST",
      headers: {
        "x-api-token": token,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(body),
    });
    const responseText = await res.text();
    if (!res.ok) {
        console.error(`[utmify] falha [${res.status}]: ${responseText}`);
        return { success: false, status: res.status, error: responseText };
    }

    await reivindicarEnvioUtmify(sessionId);
    console.log(`[utmify] venda enviada com sucesso sessionId=${sessionId}`);
    return { success: true };
  } catch (e: any) {
    console.error("[utmify] falha fatal:", e);
    return { success: false, error: e.message };
  }
}
