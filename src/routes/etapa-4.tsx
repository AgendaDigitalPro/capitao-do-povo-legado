import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronLeft } from "lucide-react";
import { useState } from "react";
import depoimento4 from "@/assets/depoimento-4.jpg";
import { salvarEtapaPedido } from "@/lib/pedido-persistencia";
import { getSessionId } from "@/lib/sessao";
import { trackEtapa } from "@/lib/analytics";

export const Route = createFileRoute("/etapa-4")({
  head: () => ({
    meta: [
      { title: "Escolha o clima da imagem | Foto Camarada" },
      {
        name: "description",
        content:
          "Escolha o clima da sua foto com o nosso Presidente: camarada discreta, ato com bandeiras ou encontro popular.",
      },
      { property: "og:title", content: "Escolha o clima da imagem" },
      {
        property: "og:description",
        content: "Quanto mais claro o objetivo, melhor a IA ajusta pose, luz e formato da imagem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Etapa4,
});

const climas = [
  { id: "discreta", titulo: "Camarada discreta" },
  { id: "bandeiras", titulo: "Ato com bandeiras vermelhas" },
  { id: "popular", titulo: "Encontro popular" },
];

function Etapa4() {
  const [selecionado, setSelecionado] = useState<string | null>("discreta");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const navigate = useNavigate();

  async function handleContinuar() {
    if (selecionado && !salvando) {
      setErro(null);
      setSalvando(true);
      try {
        await trackEtapa('04_clima');
        await salvarEtapaPedido({ sessionId: getSessionId(), clima: selecionado });
        navigate({ to: "/etapa-5" });
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível salvar sua escolha.");
      } finally {
        setSalvando(false);
      }
    }
  }

  return (
    <main className="etapa-in mx-auto flex min-h-screen max-w-md flex-col bg-card px-4 shadow-sm">
      <header className="-mx-4 px-4 pt-4">
        <div className="flex items-center justify-between">
          <Link
            to="/etapa-3"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Link>
          <span className="rounded-full bg-highlight px-3 py-1 text-[10px] font-bold tracking-wide text-primary">
            PASSO 3 DE 6
          </span>
        </div>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="barra-progresso h-full rounded-full bg-primary" style={{ width: "50%" }} />
        </div>
      </header>

      <section className="pt-6">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Quase lá, camarada!</p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-foreground">
          Escolha o clima da imagem
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Quanto mais claro o objetivo, melhor a IA ajusta pose, luz e formato da imagem.
        </p>
      </section>

      {erro && <p role="alert" className="mt-4 text-xs font-semibold text-primary">{erro}</p>}

      <section className="mt-5 flex-1 space-y-3">
        {climas.map((c) => {
          const ativo = selecionado === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelecionado(c.id)}
              className={`flex w-full items-center justify-between rounded-xl border p-4 text-left shadow-sm transition-all ${
                ativo
                  ? "border-primary bg-highlight/70 ring-1 ring-primary"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <p className="text-sm font-semibold text-foreground">{c.titulo}</p>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  ativo
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted bg-transparent"
                }`}
              >
                {ativo && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </section>

      <section className="mt-5 rounded-xl bg-secondary/40 p-4">
        <div className="flex items-start gap-3">
          <img
            src={depoimento4}
            alt="Camarada que usou o Foto Camarada"
            className="h-11 w-11 rounded-full object-cover ring-2 ring-primary/20"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug text-foreground">
              "Paguei no PIX e recebi na hora. Compartilhei no grupo e todo mundo pediu o link.
              Simples até pra mim que não manjo de celular!"
            </p>
            <p className="mt-2 text-xs font-semibold text-foreground">
              Geraldo Nunes
              <span className="ml-1 font-normal text-muted-foreground">• camarada BR</span>
            </p>
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 z-40 -mx-4 mt-5 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={handleContinuar}
          disabled={!selecionado || salvando}
          className="flex w-full items-center justify-center gap-2 min-h-[44px] rounded-xl bg-cta px-5 py-4 text-lg font-extrabold uppercase tracking-wide text-cta-foreground shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          {salvando ? "Salvando..." : "Continuar"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </main>
  );
}
