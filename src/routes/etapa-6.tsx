import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, Lightbulb } from "lucide-react";
import { useState } from "react";
import { salvarEtapaPedido } from "@/lib/pedido-persistencia";
import { getSessionId } from "@/lib/sessao";
import { trackEtapa } from "@/lib/analytics";

export const Route = createFileRoute("/etapa-6")({
  head: () => ({
    meta: [
      { title: "Dados para entrega | Capitão do Povo" },
      {
        name: "description",
        content:
          "Informe seu WhatsApp e e-mail para receber a sua foto ao lado do Capitão e os bônus exclusivos.",
      },
      { property: "og:title", content: "Receba a sua foto com o Capitão" },
      {
        property: "og:description",
        content: "Informe seu WhatsApp e e-mail para receber a sua foto e os bônus.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Etapa6,
});

function Etapa6() {
  const navigate = useNavigate();
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [aceitaNovidades, setAceitaNovidades] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleContinuar() {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErro("Confira o seu e-mail: é pra lá que a sua foto vai.");
      return;
    }
    setErro(null);
    setSalvando(true);
    await trackEtapa('06_dados');
    try {
      await salvarEtapaPedido({
        sessionId: getSessionId(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        status: "aguardando_pagamento",
      });
      navigate({ to: "/etapa-7" });
    } catch (err) {
      console.error("salvar contato", err);
      const detalhe = err instanceof Error ? err.message : "Não foi possível acessar o banco de dados.";
      setErro(`Não conseguimos salvar os seus dados. ${detalhe}`);
    } finally {
      setSalvando(false);
    }

  }

  return (
    <main className="etapa-in mx-auto flex min-h-screen max-w-md flex-col bg-card px-4 shadow-sm">
      <header className="-mx-4 px-4 pt-4">
        <div className="flex items-center justify-between">
          <Link
            to="/etapa-5"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Link>
          <span className="rounded-full bg-highlight px-3 py-1 text-[10px] font-bold tracking-wide text-primary">
            PASSO 5 DE 6
          </span>
        </div>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="barra-progresso h-full rounded-full bg-primary" style={{ width: "83.3%" }} />
        </div>
      </header>

      <section className="pt-6">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Falta pouco! 🇧🇷</p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-foreground">
          Onde você quer receber a sua foto?
        </h1>
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-highlight/50 p-3">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm font-semibold leading-snug text-primary">
            Enviaremos sua foto por WhatsApp e e-mail para você não perder.
          </p>
        </div>
      </section>


      <section className="mt-5 space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="whatsapp"
            className="text-sm font-semibold text-foreground"
          >
            📱 Seu WhatsApp (com DDD)
          </label>
          <div className="flex overflow-hidden rounded-xl border border-border bg-background shadow-sm focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20">
            <div className="flex items-center gap-1.5 border-r border-border bg-muted px-3 text-sm font-semibold text-foreground">
              <span className="text-xs">BR</span>
              <span>+55</span>
            </div>
            <input
              id="whatsapp"
              type="tel"
              inputMode="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(11) 91234-5678"
              className="w-full bg-transparent px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <p className="text-xs leading-snug text-muted-foreground">
            É por aqui que a gente entrega a sua foto e os seus bônus.
          </p>
        </div>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={aceitaNovidades}
            onChange={(e) => setAceitaNovidades(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-xs leading-snug text-muted-foreground">
            Quero receber lembretes da minha compra e novidades no WhatsApp.
          </span>
        </label>

        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-sm font-semibold text-foreground"
          >
            📧 Seu e-mail, é pra lá que a sua foto vai
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seuemail@exemplo.com"
            className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
          />
          <p className="text-xs leading-snug text-muted-foreground">
            Enviamos sua foto e um bônus exclusivo pra cá assim você não perde, nem trocando de celular.
          </p>
        </div>
      </section>

      {erro && <p role="alert" className="mt-4 text-xs font-semibold text-destructive">{erro}</p>}

      <div className="sticky bottom-0 z-40 -mx-4 mt-8 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={handleContinuar}
          disabled={salvando}
          className="flex w-full items-center justify-center gap-2 min-h-[44px] rounded-xl bg-cta px-5 py-4 text-lg font-extrabold uppercase tracking-wide text-cta-foreground shadow-lg transition-all hover:brightness-110"
        >
          {salvando ? "Salvando..." : "Continuar"}
          <ArrowRight className="h-5 w-5" />
        </button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Seus dados estão seguros 🔒
        </p>
      </div>
    </main>
  );
}
