import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookOpen, Check, Copy, Loader2, Lock, QrCode, ShieldCheck, Star, Sticker } from "lucide-react";
import React, { useEffect, useState, useRef } from "react";
import { getBumps, getSessionId, getUtms, setBumps } from "@/lib/sessao";
import { trackEtapa } from "@/lib/analytics";
import { criarPagamento, statusPedido } from "@/lib/pedido.functions";
import ex1 from "@/assets/exemplo-1.jpg";
import ex2 from "@/assets/exemplo-2.jpg";

export const Route = createFileRoute("/oferta-especial")({
  head: () => ({
    meta: [
      { title: "Oferta Especial | Foto Camarada" },
      {
        name: "description",
        content: "Uma última chance camarada: sua foto com o Presidente por apenas R$ 9,90.",
      },
    ],
  }),
  component: OfertaEspecial,
});

const bumpsList = [
  {
    id: "biografia",
    icon: BookOpen,
    title: "Biografia do Presidente",
    text: "A história do nosso maior líder contada desde o começo: a vida do homem que o outro lado tentou derrubar e não conseguiu.",
    from: "R$ 19,90",
    price: "+ R$ 5,99",
    tag: "70% OFF SÓ AGORA",
  },
  {
    id: "cartilha",
    icon: Star,
    title: "Cartilha da Militância",
    text: "Comece o dia com coragem: frases, argumentos e respostas prontas pra quem defende o povo brasileiro.",
    from: "R$ 19,90",
    price: "+ R$ 5,99",
    tag: "70% OFF SÓ AGORA",
  },
  {
    id: "adesivos",
    icon: Sticker,
    title: "Adesivos Camaradas",
    text: "Cartela pronta pra imprimir e colar no carro, na moto ou no vidro: mostre de qual lado você está por onde passar.",
    from: "R$ 19,90",
    price: "+ R$ 5,99",
    tag: "70% OFF SÓ AGORA",
  },
];

const PLAYER_ID = "vid-6a790d62938fcc8146086e01";
const PLAYER_SRC =
  "https://scripts.converteai.net/cb0b2b29-6ed3-409f-ad3c-446c8096cc9c/players/6a790d62938fcc8146086e01/v4/player.js";
const VTurbSmartPlayer = "vturb-smartplayer" as any;

function OfertaEspecial() {
  const [selected, setSelected] = useState<string[]>([]);
  const [pixCode, setPixCode] = useState("");
  const [pixImage, setPixImage] = useState<string | null>(null);
  const [valorTotal, setValorTotal] = useState(990);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("pendente");
  const [mounted, setMounted] = useState(false);
  
  const navigate = useNavigate();

  // 1. Garantir consistência do session_id: ler direto do localStorage e sanitizar
  const [sessionId] = useState(() => {
    if (typeof window === "undefined") return "";
    const raw = window.localStorage.getItem("foto_camarada_session_id") || "";
    // Remove espaços, quebras de linha e caracteres invisíveis
    return raw.trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  });

  useEffect(() => {
    // Se não houver session_id sanitizado, volta para o início
    if (!sessionId) {
      console.warn("Downsell: session_id ausente no localStorage, voltando para landing.");
      navigate({ to: "/" });
      return;
    }
    setMounted(true);
    trackEtapa("downsell_page");

    // Load VSL script - Force re-injection to ensure initialization
    const scriptId = `vturb-script-${PLAYER_ID}`;
    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.remove();
    }
    
    const s = document.createElement("script");
    s.id = scriptId;
    s.src = PLAYER_SRC;
    s.async = true;
    s.dataset["vturbId"] = PLAYER_ID;
    document.head.appendChild(s);

    return () => {
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, [sessionId, navigate]);

  // Poll status if payment generated
  useEffect(() => {
    if (status !== "pendente" && status !== "aguardando_pagamento") return;
    if (!pixCode || !sessionId) return;

    const t = setInterval(async () => {
      try {
        const r = await statusPedido({ data: { sessionId } });
        if (r.status !== "pendente" && r.status !== "aguardando_pagamento") {
          setStatus(r.status);
          navigate({ to: "/etapa-8" });
        }
      } catch (e) {
        console.error("Erro poll status downsell:", e);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [status, pixCode, sessionId, navigate]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );

  const handlePagar = async () => {
    if (!sessionId) {
      navigate({ to: "/" });
      return;
    }

    setLoading(true);
    try {
      // 2. Validar que o pedido existe ANTES de navegar para a etapa-8
      const r = await statusPedido({ data: { sessionId } });
      
      // Se o pedido NÃO existe ou está sem email/whatsapp, redireciona para coleta de dados
      if (r.status === "nao_encontrado") {
        console.warn(`Downsell: pedido não encontrado para session_id ${sessionId}, redirecionando para coleta de dados.`);
        navigate({ to: "/etapa-6" });
        return;
      }

      // Prossiga normalmente seguindo o fluxo do quiz (salva bumps e vai pra etapa-8)
      setBumps(selected);
      navigate({ to: "/etapa-8" });
    } catch (e) {
      console.error("Erro ao validar pedido no downsell:", e);
      // Fallback: se houver erro técnico, tenta seguir o fluxo original
      setBumps(selected);
      navigate({ to: "/etapa-8" });
    } finally {
      setLoading(false);
    }
  };

  const copyPix = async () => {
    if (!pixCode) return;
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  if (!mounted) return null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-card px-4 pb-12 shadow-sm animate-in fade-in duration-500">
      <div className="bg-primary -mx-4 px-4 py-8 text-center text-primary-foreground">
        <h1 className="text-2xl font-black uppercase tracking-tight">
          Espera! Uma última chance 🚩
        </h1>
        <p className="mt-2 text-sm font-medium opacity-90">
          Você chegou até aqui, não deixa sua foto histórica passar. Só hoje por R$9,90.
        </p>
      </div>

      <div className="mt-6 aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg">
        <VTurbSmartPlayer id={PLAYER_ID} style={{ display: "block", margin: "0 auto", width: "100%" }}>
          <div
            className="vturb-player-placeholder"
            style={{
              position: "relative",
              width: "100%",
              padding: "56.25% 0 0",
              zIndex: 0,
              backgroundColor: "black",
            }}
          ></div>
        </VTurbSmartPlayer>
      </div>

      {!pixCode ? (
        <>
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-muted-foreground line-through decoration-primary decoration-2">R$ 49,90</span>
              <span className="text-4xl font-black text-primary">R$ 9,90</span>
            </div>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Preço social exclusivo de recuperação
            </p>
          </div>

          <section className="mt-8 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Adicione ao seu pedido</p>
            
            <div className="relative rounded-2xl border-2 border-primary/40 bg-card p-4 shadow-md ring-4 ring-primary/5">
              <span className="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-primary-foreground shadow-sm">
                <Star className="h-3 w-3 fill-current" />
                MAIS ESCOLHIDO
              </span>
              <label className="flex gap-4">
                <input
                  type="checkbox"
                  checked={selected.includes("combo")}
                  onChange={() => toggle("combo")}
                  className="mt-1 h-5 w-5 shrink-0 rounded-full border-2 border-primary/20 text-primary focus:ring-primary"
                />
                <div className="min-w-0">
                  <p className="text-sm font-black text-foreground">Combo 3 Líderes da Esquerda 🚩</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    A mesma selfie também com a <strong>Dilma</strong> e o <strong>Boulos</strong>.
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <img src={ex1} alt="Dilma" className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/10" />
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Dilma</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <img src={ex2} alt="Boulos" className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/10" />
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Boulos</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground line-through">R$ 39,90</span>
                    <span className="text-sm font-black text-primary">+ R$ 9,90</span>
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary uppercase">75% OFF</span>
                  </div>
                </div>
              </label>
            </div>

            {bumpsList.map((b) => (
              <div key={b.id} className="rounded-2xl border border-border bg-card/50 p-4 transition-colors hover:bg-card">
                <label className="flex gap-4">
                  <input
                    type="checkbox"
                    checked={selected.includes(b.id)}
                    onChange={() => toggle(b.id)}
                    className="mt-1 h-5 w-5 shrink-0 rounded-full border-2 border-primary/10 text-primary focus:ring-primary"
                  />
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
                      <b.icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-foreground">{b.title}</p>
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">{b.text}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-[10px] font-bold text-muted-foreground line-through">{b.from}</span>
                        <span className="text-sm font-black text-primary">{b.price}</span>
                        <span className="rounded bg-highlight px-2 py-0.5 text-[10px] font-black text-primary uppercase">{b.tag}</span>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </section>

          <div className="sticky bottom-0 -mx-4 mt-8 border-t border-border bg-card/95 px-4 py-4 backdrop-blur-md">
            <button
              onClick={handlePagar}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cta py-5 text-xl font-black uppercase tracking-wide text-cta-foreground shadow-xl transition-all hover:scale-[1.02] hover:brightness-110 active:scale-95 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Gerando Pix...
                </>
              ) : (
                "QUERO MINHA FOTO POR R$ 9,90"
              )}
            </button>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Seguro</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Criptografado</span>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-2xl border-2 border-primary/20 bg-highlight/30 p-6 text-center shadow-inner">
            <p className="text-sm font-bold uppercase tracking-tighter text-primary">
              Pix Gerado com Sucesso! 🚩
            </p>
            <div className="mt-4 flex justify-center">
              <div className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-black/5">
                <img
                  src={pixImage ? (pixImage.startsWith("data:") ? pixImage : `data:image/png;base64,${pixImage}`) : `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(pixCode)}`}
                  alt="QR Code Pix"
                  className="h-56 w-56"
                />
              </div>
            </div>
            
            <p className="mt-6 text-sm font-black text-foreground">
              Valor: R$ {(valorTotal / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>

            <button
              onClick={copyPix}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-cta py-4 text-lg font-black uppercase tracking-wide text-cta-foreground shadow-lg transition-all hover:brightness-110 active:scale-95"
            >
              <Copy className="h-5 w-5" />
              {copied ? "COPIADO! ✅" : "COPIAR CÓDIGO PIX"}
            </button>

            <div className="mt-6 space-y-3 text-left">
              <div className="flex gap-3 text-sm font-medium leading-snug text-muted-foreground">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">1</div>
                <p>Abra o app do seu banco e escolha <strong>Pix Copia e Cola</strong>.</p>
              </div>
              <div className="flex gap-3 text-sm font-medium leading-snug text-muted-foreground">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">2</div>
                <p>Cole o código e confirme o pagamento de <strong>R$ {(valorTotal / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>.</p>
              </div>
              <div className="flex gap-3 text-sm font-medium leading-snug text-muted-foreground">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">3</div>
                <p>Sua foto será liberada <strong>automaticamente</strong> nesta tela em segundos.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-primary/5 py-4">
             <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
             <span className="text-xs font-bold text-primary animate-pulse">Aguardando confirmação do pagamento...</span>
          </div>
        </div>
      )}
    </main>
  );
}
