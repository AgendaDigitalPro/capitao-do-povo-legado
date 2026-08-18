import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Clock, Copy, Download, ExternalLink, Loader2, MessageCircle, QrCode, Send, ShieldCheck, Smartphone, Sparkles, Star, Sticker } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { criarPagamento, criarUpsell, statusPedido } from "@/lib/pedido.functions";
import { getBumps, getSessionId, getUtms, restaurarSessao } from "@/lib/sessao";
import { supabase } from "@/integrations/supabase/client";
import { trackEtapa } from "@/lib/analytics";

export const Route = createFileRoute("/etapa-8")({
  head: () => ({
    meta: [
      { title: "Pague no Pix e libere a sua foto | Capitão do Povo" },
      {
        name: "description",
        content:
          "Copie o código Pix, pague no app do seu banco e volte para esta tela: a sua foto com o Capitão libera em poucos segundos.",
      },
      { property: "og:title", content: "Pague no Pix e libere a sua foto" },
      {
        property: "og:description",
        content: "Copie o código Pix, pague no banco e a sua foto libera aqui mesmo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Etapa8,
});

const steps = [
  { n: 1, title: "Toque em Copiar código Pix", text: "É o botão amarelo aqui embaixo." },
  {
    n: 2,
    title: "Abra o app do seu banco",
    text: "Escolha Pix, depois Pix Copia e Cola, cole o código e confirme. Se preferir, use o QR Code que está mais abaixo.",
  },
  {
    n: 3,
    title: "Volte para esta mesma tela",
    text: "Não feche esta aba, sua foto libera sozinha aqui, em poucos segundos.",
  },
];

const PAGOS = new Set(["pago", "gerando_foto", "foto_pronta", "erro"]);

const ROTULOS: Record<string, string> = {
  capitao: "Com o Capitão",
  flavio: "Com o Flávio",
  nikolas: "Com o Nikolas",
  gabinete: "No gabinete presidencial",
  motociata: "Na motociata, no meio do povo",
  mesa: "Na mesa do café",
};

type FotoEntregue = { slug: string; nome: string; url: string };

const chaveUpsell = (s: string) => `upsell_${s}`;
function lerLocal(k: string): string | null {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
}
function gravarLocal(k: string, v: string) {
  try {
    window.localStorage.setItem(k, v);
  } catch {
    /* armazenamento bloqueado, seguimos sem persistir */
  }
}

function useCountdown(start: number) {
  const [left, setLeft] = useState(start);
  useEffect(() => {
    const t = setInterval(() => setLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);
  const m = String(Math.floor(left / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function Etapa8() {
  // Restaura a sessão vinda do link do e-mail (?s=...). Roda durante o primeiro
  // render, antes de qualquer efeito.
  useState(() => {
    if (typeof window !== "undefined") {
      restaurarSessao(new URLSearchParams(window.location.search).get("s"));
    }
    return true;
  });

  const promo = useCountdown(14 * 60 + 36);
  const expira = useCountdown(59 * 60 + 34);
  const [copied, setCopied] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [valor, setValor] = useState(990);
  const [pixImage, setPixImage] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("aguardando_pagamento");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotos, setFotos] = useState<FotoEntregue[]>([]);
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
  const [baixando, setBaixando] = useState<string | null>(null);

  // ── UPSELL ────────────────────────────────────────────────────────────────
  // Bloco isolado: se qualquer coisa aqui falhar, a oferta some da tela e a
  // entrega da foto principal continua intacta.
  const [upSessao, setUpSessao] = useState<string | null>(null);
  const [upPix, setUpPix] = useState("");
  const [upPixImage, setUpPixImage] = useState<string | null>(null);
  const [upPago, setUpPago] = useState(false);
  const [upFotos, setUpFotos] = useState<FotoEntregue[]>([]);
  const [upCarregando, setUpCarregando] = useState(false);
  const [upCopiado, setUpCopiado] = useState(false);
  const [upFalhou, setUpFalhou] = useState(false);

  const listaFotos: FotoEntregue[] =
    fotos.length > 0
      ? fotos
      : fotoUrl
        ? [{ slug: "capitao", nome: "Capitão", url: fotoUrl }]
        : [];

  const baixarFoto = async (url: string, slug: string, sessao?: string) => {
    setBaixando(slug);
    try {
      let alvo = url;
      let resp = await fetch(alvo, { cache: "no-store" });
      if (!resp.ok) {
        const r = await statusPedido({ data: { sessionId: sessao ?? getSessionId() } });
        const renovada = r.fotos?.find((f) => f.slug === slug)?.url ?? r.fotoUrl;
        if (!sessao) {
          if (r.fotos?.length) setFotos(r.fotos);
          if (r.fotoUrl) setFotoUrl(r.fotoUrl);
        } else if (r.fotos?.length) {
          setUpFotos(r.fotos);
        }
        if (renovada) {
          alvo = renovada;
          resp = await fetch(alvo, { cache: "no-store" });
        }
      }
      if (!resp.ok) throw new Error("download indisponivel");
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = slug === "capitao" ? "foto-patriota.png" : `foto-patriota-${slug}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    } catch {
      window.open(url, "_blank");
    } finally {
      setBaixando(null);
    }
  };

  useEffect(() => {
    setSelectedBumps(getBumps());
    const salvo = lerLocal(chaveUpsell(getSessionId()));
    if (salvo) setUpSessao(salvo);
  }, []);

  useEffect(() => {
    let ativo = true;
    trackEtapa('09_pix_gerado');
    criarPagamento({ data: { sessionId: getSessionId(), bumps: getBumps(), utms: getUtms() } })
      .then((r) => {
        if (!ativo) return;
        setValor(r.valorTotal);
        if (r.pago) setStatus((s) => (s === "aguardando_pagamento" ? "pago" : s));
        if (r.erro) {
          setErro(r.erro);
          return;
        }
        setPixCode(r.pixCode);
        if (r.pixImage) setPixImage(r.pixImage);
      })
      .catch((err) => {
        if (ativo) {
          console.error("Catch etapa-8 criarPagamento:", err);
          setErro(err.message || "Não conseguimos gerar o seu Pix agora. Recarregue a página.");
        }
      });
    return () => {
      ativo = false;
    };
  }, []);


  useEffect(() => {
    if (status === "foto_pronta") return;
    const t = setInterval(async () => {
      try {
        const r = await statusPedido({ data: { sessionId: getSessionId() } });
        setStatus((atual) => {
          const jaPago = PAGOS.has(atual);
          const novoPago = PAGOS.has(r.status);
          if (r.status === 'gerando_foto' && atual !== 'gerando_foto') trackEtapa('10_aguardando');
          if (r.status === 'foto_pronta' && atual !== 'foto_pronta') trackEtapa('11_resultado');
          return jaPago && !novoPago ? atual : r.status;
        });
        if (r.fotoUrl) setFotoUrl(r.fotoUrl);
        if (r.fotos?.length) setFotos(r.fotos);
      } catch {
        /* tenta de novo no proximo ciclo */
      }
    }, 5000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (!upSessao || upFotos.length > 0) return;
    const t = setInterval(async () => {
      try {
        const r = await statusPedido({ data: { sessionId: upSessao } });
        if (PAGOS.has(r.status)) setUpPago(true);
        if (r.fotos?.length) setUpFotos(r.fotos);
      } catch {
        /* tenta de novo no proximo ciclo */
      }
    }, 5000);
    return () => clearInterval(t);
  }, [upSessao, upFotos.length]);

  const purchaseEnviado = useRef(false);
  useEffect(() => {
    if (!PAGOS.has(status)) return;
    if (purchaseEnviado.current) return;
    if (typeof window === "undefined" || !(window as any).fbq) return;

    const sessionId = getSessionId();
    const eventId = `purchase_${sessionId}`;
    try {
      if (window.localStorage.getItem(eventId)) {
        purchaseEnviado.current = true;
        return;
      }
      window.localStorage.setItem(eventId, "1");
    } catch {
      /* armazenamento bloqueado, seguimos com a trava em memoria */
    }

    purchaseEnviado.current = true;
    (window as any).fbq("track", "Purchase", { value: valor / 100, currency: "BRL" }, { eventID: eventId });
  }, [status, valor]);

  const pago = PAGOS.has(status);
  const temCombo = selectedBumps.includes("combo");
  const varias = listaFotos.length > 1;

  const reais = (valor / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  const copy = async () => {
    if (!pixCode) return;
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const pedirUpsell = async () => {
    setUpCarregando(true);
    try {
      const r = await criarUpsell({ data: { sessionId: getSessionId() } });
      if (r.erro || !r.sessionIdUpsell) {
        console.error("[upsell] recusado:", r.erro);
        setUpFalhou(true);
        return;
      }
      setUpSessao(r.sessionIdUpsell);
      gravarLocal(chaveUpsell(getSessionId()), r.sessionIdUpsell);
      setUpPix(r.pixCode || "");
      setUpPixImage(r.pixImage ?? null);
      if (r.pago) setUpPago(true);
    } catch (e) {
      console.error("[upsell] falha ao criar:", e);
      setUpFalhou(true);
    } finally {
      setUpCarregando(false);
    }
  };

  const copiarUpsell = async () => {
    if (!upPix) return;
    try {
      await navigator.clipboard.writeText(upPix);
      setUpCopiado(true);
      setTimeout(() => setUpCopiado(false), 2500);
    } catch {
      setUpCopiado(false);
    }
  };

  const mostrarUpsell = pago && listaFotos.length > 0 && !upFalhou;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-card px-4 pb-8 shadow-sm">
      <div className="-mx-4 bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground">
        <span className="inline-flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Promoção termina em <strong className="font-extrabold">{promo}</strong>
        </span>
      </div>

      <h1 className="pt-6 text-center text-xl font-bold leading-snug text-foreground">
        Siga o passo a passo para receber a sua foto
      </h1>

      <section className="mt-5 rounded-2xl border border-primary/25 bg-highlight/50 p-4">
        <ol className="space-y-4">
          {steps.map((s) => (
            <li key={s.n} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {s.n}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{s.title}</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
        {status === "foto_pronta"
          ? varias ? "Suas fotos estão prontas" : "Sua foto está pronta"
          : status === "gerando_foto"
            ? temCombo ? "Pagamento confirmado, gerando as suas fotos" : "Pagamento confirmado, gerando a sua foto"
            : status === "pago"
              ? "Pagamento confirmado"
              : status === "erro"
                ? "Pagamento confirmado. Tivemos um problema ao gerar, estamos tentando de novo"
                : `Falta pagar R$ ${reais}`}
      </p>


      {pago && (
        <section className="mt-4 rounded-2xl border border-primary/30 bg-highlight/60 p-4 text-center">
          {listaFotos.length > 0 ? (
            <>
              {varias && (
                <p className="mb-4 text-base font-extrabold text-primary">
                  Suas {listaFotos.length} fotos estão prontas, patriota 🇧🇷
                </p>
              )}
              <div className={varias ? "space-y-6" : ""}>
                {listaFotos.map((f) => (
                  <div key={f.slug}>
                    {varias && (
                      <p className="mb-2 text-left text-sm font-bold text-foreground">
                        {ROTULOS[f.slug] ?? f.nome}
                      </p>
                    )}
                    <img
                      src={f.url}
                      alt={`Sua foto ${ROTULOS[f.slug] ?? f.nome} gerada por IA`}
                      className="mx-auto w-full rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => baixarFoto(f.url, f.slug)}
                      disabled={baixando === f.slug}
                      className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-cta px-5 py-4 text-lg font-extrabold uppercase tracking-wide text-cta-foreground shadow-lg transition-all hover:brightness-110 disabled:opacity-70"
                    >
                      <Download className="h-5 w-5" />
                      {baixando === f.slug ? "Preparando o download..." : varias ? "Baixar esta foto" : "Baixar minha foto"}
                    </button>
                  </div>
                ))}
              </div>

              {temCombo && listaFotos.length < 3 && (
                <p className="mt-4 text-xs leading-snug text-muted-foreground">
                  As demais fotos do seu combo ainda estão sendo geradas. Deixe esta tela aberta que
                  elas aparecem aqui, e também vão para o seu e-mail.
                </p>
              )}

              <p className="mt-3 text-xs text-muted-foreground">
                Também enviamos {varias ? "as suas fotos" : "a sua foto"} para o seu e-mail, patriota.
              </p>
            </>
          ) : (
            <ProgressoGeracao combo={temCombo} />
          )}
        </section>
      )}

      {/* ── OFERTA DOS 3 AMBIENTES ─────────────────────────────────────────── */}
      {mostrarUpsell && (
        <section className="mt-6 rounded-2xl border-2 border-primary/50 bg-primary/5 p-4">
          {upFotos.length > 0 ? (
            <>
              <p className="text-center text-base font-extrabold text-primary">
                Suas {upFotos.length} fotos novas estão prontas 🇧🇷
              </p>
              <div className="mt-4 space-y-6">
                {upFotos.map((f) => (
                  <div key={f.slug}>
                    <p className="mb-2 text-sm font-bold text-foreground">{ROTULOS[f.slug] ?? f.nome}</p>
                    <img
                      src={f.url}
                      alt={`Sua foto ${ROTULOS[f.slug] ?? f.nome} gerada por IA`}
                      className="mx-auto w-full rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => baixarFoto(f.url, f.slug, upSessao ?? undefined)}
                      disabled={baixando === f.slug}
                      className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-cta px-5 py-4 text-base font-extrabold uppercase tracking-wide text-cta-foreground shadow-lg transition-all hover:brightness-110 disabled:opacity-70"
                    >
                      <Download className="h-5 w-5" />
                      {baixando === f.slug ? "Preparando..." : "Baixar esta foto"}
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Enviamos as três para o seu e-mail também.
              </p>
            </>
          ) : upPago ? (
            <div className="text-center">
              <p className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Pagamento confirmado! Gerando as suas 3 fotos novas
              </p>
              <p className="mt-2 text-xs leading-snug text-muted-foreground">
                Leva alguns minutos, patriota. Elas aparecem aqui e também vão para o seu e-mail.
              </p>
            </div>
          ) : upSessao && upPix ? (
            <>
              <p className="text-center text-sm font-extrabold text-foreground">
                Falta só pagar R$ 19,90 no Pix
              </p>
              <button
                type="button"
                onClick={copiarUpsell}
                className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-cta px-5 py-4 text-lg font-extrabold uppercase tracking-wide text-cta-foreground shadow-lg transition-all hover:brightness-110"
              >
                <Copy className="h-5 w-5" />
                {upCopiado ? "COPIADO! ✅" : "COPIAR CÓDIGO PIX"}
              </button>
              <div className="mt-4 flex justify-center">
                <div className="rounded-xl bg-card p-3 shadow-sm ring-1 ring-border">
                  <img
                    src={
                      upPixImage
                        ? upPixImage.startsWith("data:")
                          ? upPixImage
                          : `data:image/png;base64,${upPixImage}`
                        : `https://api.qrserver.com/v1/create-qr-code/?size=440x440&data=${encodeURIComponent(upPix)}`
                    }
                    alt="QR Code Pix das 3 fotos em novos ambientes"
                    width={220}
                    height={220}
                    loading="lazy"
                    className="h-[220px] w-[220px] max-w-full"
                  />
                </div>
              </div>
              <p className="mt-3 text-center text-xs leading-snug text-muted-foreground">
                Assim que o pagamento cair, as três fotos aparecem aqui sozinhas. Não feche a tela.
              </p>
            </>
          ) : (
            <>
              <p className="flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-wide text-primary">
                <Sparkles className="h-4 w-4" />
                Só agora, nesta tela
              </p>
              <h2 className="mt-2 text-center text-lg font-extrabold leading-snug text-foreground">
                Quer a sua foto em mais 3 lugares?
              </h2>
              <p className="mt-2 text-center text-sm leading-snug text-muted-foreground">
                A <strong className="text-foreground">mesma foto sua</strong>, agora no gabinete
                presidencial, no meio da motociata e na mesa do café.
              </p>
              <p className="mt-3 rounded-xl border border-primary/30 bg-card p-3 text-center text-sm font-bold leading-snug text-foreground">
                Você não precisa mandar selfie de novo. Já está tudo pronto aqui, é só pagar.
              </p>
              <p className="mt-4 flex items-end justify-center gap-2">
                <span className="text-sm text-muted-foreground line-through">R$ 59,70</span>
                <span className="text-3xl font-extrabold text-primary">R$ 19,90</span>
                <span className="pb-1 text-sm font-semibold text-foreground">as três</span>
              </p>
              <button
                type="button"
                onClick={pedirUpsell}
                disabled={upCarregando}
                className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-cta px-5 py-4 text-lg font-extrabold uppercase tracking-wide text-cta-foreground shadow-lg transition-all hover:brightness-110 disabled:opacity-70"
              >
                <Sparkles className="h-5 w-5" />
                {upCarregando ? "Gerando o seu Pix..." : "QUERO AS 3 FOTOS POR R$ 19,90"}
              </button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Pagamento único no Pix. As fotos chegam aqui e no seu e-mail.
              </p>
            </>
          )}
        </section>
      )}

      {pago && selectedBumps.length > 0 && (
        <section className="mt-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Seus bônus, patriota 🇧🇷</h2>
          <div className="grid gap-3">
            {selectedBumps.map((bumpId) => {
              if (bumpId === "wallpapers") {
                return <BonusCard key={bumpId} title="Pack de Papéis de Parede" icon={Smartphone} actionLabel="Baixar wallpapers" href="/wallpapers_patriota.zip" />;
              }
              if (bumpId === "figurinhas") {
                return <BonusCard key={bumpId} title="Figurinhas Patriotas pro WhatsApp" icon={MessageCircle} actionLabel="Baixar figurinhas" href="/figurinhas_patriota.zip" />;
              }
              if (bumpId === "biografia") {
                return <BonusCard key={bumpId} title="A História do Capitão" icon={BookOpen} actionLabel="Baixar PDF" storagePath="biografia_capitao.pdf" />;
              }
              if (bumpId === "adesivos") {
                return <BonusCard key={bumpId} title="Adesivos Patriotas" icon={Sticker} actionLabel="Baixar PDF" storagePath="adesivos_patriotas.pdf" />;
              }
              return null;
            })}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={copy}
        disabled={!pixCode || pago}
        className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-cta px-5 py-4 text-lg font-extrabold uppercase tracking-wide text-cta-foreground shadow-lg transition-all hover:brightness-110 disabled:opacity-70"
      >
        <Copy className="h-5 w-5" />
        {copied ? "COPIADO! ✅" : pixCode ? "COPIAR CÓDIGO PIX" : "Gerando o seu Pix..."}
      </button>

      <p className="mt-3 text-center text-xs text-muted-foreground">Este código expira em {expira}</p>
      <p className="mt-1 text-center text-xs font-semibold text-foreground">
        Após o pagamento, sua foto será gerada automaticamente.
      </p>
      {erro && <p className="mt-2 text-center text-xs font-semibold text-destructive">{erro}</p>}

      <div className={`mt-5 border-t border-border pt-5 ${pago || !pixCode ? "hidden" : ""}`}>
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
          <QrCode className="h-4 w-4 text-primary" />
          Ou, se preferir, pague com o QR Code
        </p>

        <div className="mt-4 flex justify-center">
          <div className="rounded-xl bg-card p-3 shadow-sm ring-1 ring-border">
            <img
              src={pixImage ? (pixImage.startsWith("data:") ? pixImage : `data:image/png;base64,${pixImage}`) : `https://api.qrserver.com/v1/create-qr-code/?size=440x440&data=${encodeURIComponent(pixCode)}`}
              alt="QR Code Pix para liberar a sua foto com o Capitão"
              width={260}
              height={260}
              loading="lazy"
              className="h-[260px] w-[260px] max-w-full"
            />
          </div>
        </div>

        <p className="mt-3 text-center text-xs leading-snug text-muted-foreground">
          Escaneie com o celular de quem vai pagar. No mesmo aparelho, use o botão amarelo acima.
        </p>

        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Pagamento processado em ambiente seguro
        </p>
      </div>

      <section className="mt-6 rounded-2xl border border-primary/20 bg-highlight/40 p-4">
        <p className="text-xs font-extrabold tracking-wide text-primary">COMO VOCÊ RECEBE</p>
        <ul className="mt-3 space-y-2 text-sm leading-snug text-foreground">
          <li>Assim que o Pix confirmar, já começa.</li>
          <li>É só acompanhar a barrinha enchendo.</li>
          <li>A foto abre aqui quando terminar.</li>
          <li>E ainda vai pro seu email, com um bônus.</li>
        </ul>
      </section>
    </main>
  );
}

function BonusCard({
  title,
  icon: Icon,
  actionLabel,
  href,
  storagePath,
  isExternal = false,
}: {
  title: string;
  icon: any;
  actionLabel: string;
  href?: string;
  storagePath?: string;
  isExternal?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const abrirPdf = async () => {
    if (!storagePath) return;
    setLoading(true);
    try {
      const { data } = await supabase.storage.from("bonus").createSignedUrl(storagePath, 60 * 60, { download: true });
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-highlight/30 p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{title}</p>
        {storagePath ? (
          <button
            type="button"
            onClick={abrirPdf}
            disabled={loading}
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            {loading ? "Preparando..." : actionLabel} <Download className="h-3 w-3" />
          </button>
        ) : (
          <a
            href={href}
            target={isExternal ? "_blank" : undefined}
            download={!isExternal}
            rel={isExternal ? "noreferrer" : undefined}
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            {actionLabel} {isExternal ? <ExternalLink className="h-3 w-3" /> : <Download className="h-3 w-3" />}
          </a>
        )}
      </div>
    </div>
  );
}

const MENSAGENS_GERACAO = [
  "Recebendo a sua selfie...",
  "Reconhecendo o seu rosto...",
  "Chamando o Capitão para a foto...",
  "Ajustando iluminação e enquadramento...",
  "Aplicando os detalhes finais...",
  "Quase lá, patriota. Não feche esta tela.",
];

const MENSAGENS_COMBO = [
  "Recebendo a sua selfie...",
  "Reconhecendo o seu rosto...",
  "Chamando o Capitão para a foto...",
  "Agora o Flávio e o Nikolas entram no quadro...",
  "Ajustando iluminação e enquadramento das 3...",
  "Quase lá, patriota. Não feche esta tela.",
];

function ProgressoGeracao({ combo = false }: { combo?: boolean }) {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const progresso = Math.min(95, 95 * (1 - Math.exp(-segundos / 110)));
  const mensagens = combo ? MENSAGENS_COMBO : MENSAGENS_GERACAO;
  const mensagem = mensagens[Math.min(mensagens.length - 1, Math.floor(segundos / 30))]!;
  const m = String(Math.floor(segundos / 60)).padStart(2, "0");
  const s = String(segundos % 60).padStart(2, "0");

  return (
    <div className="text-left">
      <p className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
        <Loader2 className="h-4 w-4 animate-spin" />
        {combo ? "Gerando as suas 3 fotos" : "Gerando a sua foto com o Capitão"}
      </p>

      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-primary/15">
        <div className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear" style={{ width: `${progresso}%` }}>
          <div className="h-full w-full animate-pulse rounded-full bg-primary-foreground/20" />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>{mensagem}</span>
        <span>{m}:{s}</span>
      </div>

      <p className="mt-3 text-center text-sm font-extrabold text-primary">NÃO FECHE ESTA PÁGINA</p>
      <p className="mt-1 text-center text-xs leading-snug text-muted-foreground">
        Isso pode levar alguns minutos, patriota. Se fechar sem querer, é só voltar por este mesmo
        link no mesmo aparelho que a sua foto aparece aqui, e ela também vai para o seu e-mail.
      </p>
    </div>
  );
}
