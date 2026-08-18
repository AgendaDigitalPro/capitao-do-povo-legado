import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, ChevronLeft, Gift, Lock, MessageCircle, ShieldCheck, Smartphone, Star, Sticker, X } from "lucide-react";
import React, { useEffect, useState, useRef } from "react";
import ex1 from "@/assets/exemplo-1.jpg";
import ex2 from "@/assets/exemplo-2.jpg";
import { setBumps } from "@/lib/sessao";
import { trackEtapa } from "@/lib/analytics";


export const Route = createFileRoute("/etapa-7")({
  head: () => ({
    meta: [
      { title: "Libere a sua foto com o Presidente | Foto Camarada" },
      {
        name: "description",
        content:
          "Por R$ 9,90 no Pix você libera a sua foto ao lado do Presidente e ainda leva bônus exclusivos da militância.",
      },
      { property: "og:title", content: "Libere a sua foto com o Presidente" },
      {
        property: "og:description",
        content: "R$ 9,90 no Pix para liberar a sua foto e os bônus da militância.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Etapa7,
});

// Cartilha da Militância e Grupo VIP Telegram foram REMOVIDOS desta tela por
// baixa adesão medida em produção: 3,6% e 0,9% respectivamente. Cada oferta a
// mais na tela custa conversão num público de 60+, e essas duas não pagavam o
// espaço que ocupavam.
//
// Elas continuam existindo em PRECOS (pedido.functions.ts) e na entrega da
// etapa-8, para que quem já comprou não perca o acesso.
const bumps = [
  {
    id: "combo-visual", // apenas marcador de ordem; o combo tem bloco próprio abaixo
    hidden: true,
    icon: Star,
    title: "",
    text: "",
    from: "",
    price: "",
    tag: "",
  },
  {
    id: "figurinhas",
    icon: MessageCircle,
    title: "Figurinhas Camaradas pro WhatsApp",
    text: "Bom dia, boa noite, força camarada. 8 figurinhas pra usar todo dia no grupo da família e mostrar de que lado você está.",
    from: "R$ 19,90",
    price: "+ R$ 9,90",
    tag: "50% OFF SÓ AGORA",
  },
  {
    id: "wallpapers",
    icon: Smartphone,
    title: "Pack de Papéis de Parede",
    text: "5 artes exclusivas em alta resolução pra deixar a tela do seu celular com a nossa cor. Toda vez que você olhar, lembra de que lado está.",
    from: "R$ 19,90",
    price: "+ R$ 9,90",
    tag: "50% OFF SÓ AGORA",
  },
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
    id: "adesivos",
    icon: Sticker,
    title: "Adesivos Camaradas",
    text: "Cartela pronta pra imprimir e colar no carro, na moto ou no vidro: mostre de qual lado você está por onde passar.",
    from: "R$ 19,90",
    price: "+ R$ 5,99",
    tag: "70% OFF SÓ AGORA",
  },
].filter((b) => !("hidden" in b && b.hidden));


function Etapa7() {
  const [selected, setSelected] = useState<string[]>([]);
  const [showOffer, setShowOffer] = useState(false);
  const isPurchasing = useRef(false);

  const navigate = useNavigate();

  const irParaPagamento = (bumps: string[]) => {
    isPurchasing.current = true;
    setBumps(bumps);
    navigate({ to: "/etapa-8" });
  };


  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );

  useEffect(() => {
    trackEtapa('08_checkout');
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "InitiateCheckout");
    }
  }, []);


  return (
    <main className="etapa-in mx-auto flex min-h-screen max-w-md flex-col bg-card px-4 pb-4 shadow-sm">
      <header className="-mx-4 px-4 pt-4">
        <div className="flex items-center justify-between">
          <Link
            to="/etapa-6"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Link>
          <span className="rounded-full bg-highlight px-3 py-1 text-[10px] font-bold tracking-wide text-primary">
            PASSO 6 DE 6
          </span>
        </div>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-full rounded-full bg-primary" />
        </div>
      </header>

      <h1 className="pt-6 text-xl font-bold leading-snug text-foreground">
        Para liberar a sua foto com o Presidente
      </h1>

      <section className="mt-4 rounded-2xl border border-primary/25 bg-highlight/60 p-4">
        <p className="text-sm font-semibold leading-snug text-foreground">
          Sua foto exclusiva com o Presidente, pronta pra usar no WhatsApp, Instagram e Facebook.
        </p>
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Preço promocional de lançamento
        </p>
        <p className="mt-1 flex items-end gap-2">
          <span className="text-sm text-muted-foreground line-through">De R$49,90</span>
          <span className="text-3xl font-extrabold text-primary">R$9,90</span>
          <span className="pb-1 text-base font-semibold text-foreground">no Pix</span>
        </p>
        <p className="mt-1 text-xs font-bold text-cta">Você economiza R$40,00 (80% off)</p>
        <p className="mt-3 text-sm leading-snug text-muted-foreground">
          Esse valor cobre só o nosso trabalho e fortalece o nosso lado, em apoio ao nosso Presidente 🚩
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/25 bg-card p-3">
          <Gift className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm font-semibold leading-snug text-foreground">
            E você ainda leva um bônus especial de presente.
          </p>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-cta/30 bg-cta/5 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cta" />
          <p className="text-sm font-semibold leading-snug text-foreground">
            🛡️ Satisfação garantida ou seu dinheiro de volta em 7 dias.
          </p>
        </div>

        <p className="mt-4 text-center text-sm font-extrabold tracking-wide text-foreground">
          APOIE A NOSSA LUTA
        </p>
      </section>


      <section className="mt-5 space-y-3">
        <div className="relative rounded-2xl border border-primary/40 bg-card p-4 shadow-sm">
          <span className="absolute -top-2 right-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            <Star className="h-3 w-3 fill-current" />
            MAIS ESCOLHIDO
          </span>
          <label className="flex gap-3">
            <input
              type="checkbox"
              checked={selected.includes("combo")}
              onChange={() => toggle("combo")}
              className="mt-1 h-4 w-4 shrink-0 rounded-full border-border text-primary focus:ring-primary"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">
                Combo 3 Líderes da Esquerda 🚩
              </p>
              <p className="mt-2 inline-block rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground">
                SUA FOTO VIRA 3, POR SÓ + R$ 9,90
              </p>
              <p className="mt-2 text-xs leading-snug text-muted-foreground">
                A mesma selfie também com a <strong className="text-foreground">Dilma</strong> e o{" "}
                <strong className="text-foreground">Boulos</strong>. Enquanto a direita treme, você já
                mostra de que lado tá, com o maior time popular do país. 🚩
              </p>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <img
                    src={ex1}
                    alt="Exemplo de foto com liderança de esquerda"
                    loading="lazy"
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <span className="text-xs font-semibold text-foreground">Dilma</span>
                </div>
                <div className="flex items-center gap-2">
                  <img
                    src={ex2}
                    alt="Exemplo de foto em ato popular"
                    loading="lazy"
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <span className="text-xs font-semibold text-foreground">Boulos</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                  75% SÓ AGORA
                </span>
                <span className="text-xs text-muted-foreground line-through">R$ 39,90</span>
                <span className="text-sm font-bold text-primary">+ R$ 9,90</span>
              </div>
            </div>
          </label>
        </div>
      </section>

      <p className="mt-6 text-xs font-semibold text-muted-foreground">Adicione ao seu pedido</p>

      <section className="mt-2 space-y-3">
        {bumps.map((b) => (
          <div key={b.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <label className="flex gap-3">
              <input
                type="checkbox"
                checked={selected.includes(b.id)}
                onChange={() => toggle(b.id)}
                className="mt-1 h-4 w-4 shrink-0 rounded-full border-border text-primary focus:ring-primary"
              />
              <div className="flex min-w-0 gap-3">
                <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <b.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">{b.title}</p>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">{b.text}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground line-through">{b.from}</span>
                    <span className="text-sm font-bold text-primary">{b.price}</span>
                    <span className="rounded-md bg-highlight px-2 py-0.5 text-[10px] font-bold text-primary">
                      {b.tag}
                    </span>
                  </div>
                </div>
              </div>
            </label>
          </div>
        ))}
      </section>

      <div className="sticky bottom-0 z-40 -mx-4 mt-6 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => {
            isPurchasing.current = true;
            setShowOffer(true);
          }}
          className="w-full min-h-[44px] rounded-xl bg-cta px-5 py-4 text-lg font-extrabold uppercase tracking-wide text-cta-foreground shadow-lg transition-all hover:brightness-110"
        >
          Pagar R$ 9,90 no Pix e baixar minha foto
        </button>
        <p className="mt-2 text-center text-[11px] leading-snug text-muted-foreground">
          Na próxima tela você vê o QR Code, sua foto libera assim que o pagamento confirmar.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Lock className="h-3.5 w-3.5 text-cta" /> Pagamento 100% Seguro
          </span>
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-cta" /> Tecnologia Criptografada
          </span>
        </div>

        {/* Popup de downsell removido em favor da rota /oferta-especial */}

      </div>

      {showOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-y-auto rounded-2xl bg-card p-5 shadow-xl">
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setShowOffer(false)}
              className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <p className="text-center text-lg font-bold text-primary">🚩</p>
            <h2 className="mt-1 text-center text-lg font-bold text-foreground">
              Espera aí, camarada 🚩
            </h2>
            <p className="mt-2 text-center text-sm leading-snug text-muted-foreground">
              Tem certeza que você não quer aproveitar nenhuma das nossas promoções pra ajudar o nosso
              Presidente e fortalecer o nosso lado? Dá pra levar tudo de uma vez, junto com a sua foto.
            </p>

            <div className="relative mt-4 rounded-2xl border border-primary/40 bg-highlight/50 p-4">
              <span className="absolute -top-2 right-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                <Star className="h-3 w-3 fill-current" />
                MAIS ESCOLHIDO
              </span>
              <label className="flex gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes("combo")}
                  onChange={() => toggle("combo")}
                  className="mt-1 h-4 w-4 shrink-0 rounded-full border-border text-primary focus:ring-primary"
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">Combo 3 Líderes da Esquerda 🚩</p>
                  <p className="mt-2 inline-block rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground">
                    SUA FOTO VIRA 3, POR SÓ + R$ 9,90
                  </p>
                  <p className="mt-2 text-xs leading-snug text-muted-foreground">
                    A mesma selfie também com a <strong className="text-foreground">Dilma</strong> e o{" "}
                    <strong className="text-foreground">Boulos</strong>. Enquanto a direita treme, você
                    já mostra de que lado tá, com o maior time popular do país. 🚩
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={ex1}
                        alt="Exemplo de foto com liderança de esquerda"
                        loading="lazy"
                        className="h-8 w-8 rounded-full object-cover"
                      />
                      <span className="text-xs font-semibold text-foreground">Dilma</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <img
                        src={ex2}
                        alt="Exemplo de foto em ato popular"
                        loading="lazy"
                        className="h-8 w-8 rounded-full object-cover"
                      />
                      <span className="text-xs font-semibold text-foreground">Boulos</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                      75% SÓ AGORA
                    </span>
                    <span className="text-xs text-muted-foreground line-through">R$ 39,90</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-primary">+ R$ 9,90</p>
                </div>
              </label>
            </div>

            <p className="mt-5 text-xs font-semibold text-muted-foreground">Adicione ao seu pedido</p>

            <div className="mt-2 space-y-3">
              {bumps.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-dashed border-border bg-card p-4"
                >
                  <label className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(b.id)}
                      onChange={() => toggle(b.id)}
                      className="mt-1 h-4 w-4 shrink-0 rounded-full border-border text-primary focus:ring-primary"
                    />
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <b.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">{b.title}</p>
                        <p className="mt-1 text-xs leading-snug text-muted-foreground">{b.text}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground line-through">{b.from}</span>
                          <span className="text-sm font-bold text-primary">{b.price}</span>
                        </div>
                        <span className="mt-2 inline-block rounded-md bg-highlight px-2 py-0.5 text-[10px] font-bold text-primary">
                          {b.tag}
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => irParaPagamento(selected)}
              className="mt-5 block w-full rounded-xl bg-primary px-5 py-4 text-center text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90"
            >
              Sim, quero aproveitar
            </button>
            <button
              type="button"
              onClick={() => irParaPagamento([])}
              className="mt-3 block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Agora não, só a minha foto
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
