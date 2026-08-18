import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Building2, Camera, ChevronLeft, Flag, Heart } from "lucide-react";
import { useState } from "react";
import { salvarEtapaPedido } from "@/lib/pedido-persistencia";
import { getSessionId } from "@/lib/sessao";
import { trackEtapa } from "@/lib/analytics";

export const Route = createFileRoute("/etapa-2")({
  head: () => ({
    meta: [
      { title: "Escolha o cenário | Foto Camarada" },
      {
        name: "description",
        content:
          "Escolha o cenário da sua foto com o nosso Presidente. Selfie, encontro em Brasília, ato popular ou evento especial.",
      },
      { property: "og:title", content: "Escolha o cenário da sua foto" },
      {
        property: "og:description",
        content: "Escolha como você quer aparecer ao lado do nosso Presidente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Etapa2,
});

const cenarios = [
  {
    id: "selfie",
    titulo: "Selfie com o Presidente",
    descricao: "Uma foto casual, como se fosse um registro rápido para postar.",
    icone: Camera,
  },
  {
    id: "brasilia",
    titulo: "Encontro em Brasília",
    descricao: "Um visual institucional, com clima de visita especial ao Planalto.",
    icone: Building2,
  },
  {
    id: "ato",
    titulo: "Ato popular",
    descricao: "Clima de comício com bandeiras vermelhas e muita energia na plateia.",
    icone: Flag,
  },
  {
    id: "encontro",
    titulo: "Encontro camarada",
    descricao: "Uma imagem calorosa, de companheiro encontrando seu grande líder.",
    icone: Heart,
  },
];

function Etapa2() {
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const navigate = useNavigate();

  async function handleContinuar() {
    if (selecionado && !salvando) {
      setErro(null);
      setSalvando(true);
      try {
        await trackEtapa('02_cenario');
        await salvarEtapaPedido({ sessionId: getSessionId(), cenario: selecionado });
        navigate({ to: "/etapa-3" });
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível salvar sua escolha.");
      } finally {
        setSalvando(false);
      }
    }
  }

  return (
    <main className="etapa-in mx-auto flex min-h-screen max-w-md flex-col bg-card px-4 shadow-sm">
      {/* Header */}
      <header className="-mx-4 px-4 pt-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Link>
          <span className="rounded-full bg-highlight px-3 py-1 text-[10px] font-bold tracking-wide text-primary">
            PASSO 1 DE 6
          </span>
        </div>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="barra-progresso h-full rounded-full bg-primary" style={{ width: "16.6%" }} />
        </div>
      </header>

      {/* Título */}
      <section className="pt-6">
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground">
          Primeiro, escolha o cenário da sua foto
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Quanto mais claro o objetivo, melhor a IA ajusta pose, luz e formato da imagem.
        </p>
      </section>

      {erro && <p role="alert" className="mt-4 text-xs font-semibold text-primary">{erro}</p>}

      {/* Opções */}
      <section className="mt-5 flex-1 space-y-3">
        {cenarios.map((c) => {
          const Icon = c.icone;
          const ativo = selecionado === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelecionado(c.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left shadow-sm transition-all ${
                ativo
                  ? "border-primary bg-highlight/70 ring-1 ring-primary"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  ativo ? "bg-primary text-primary-foreground" : "bg-highlight text-primary"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{c.titulo}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{c.descricao}</p>
              </div>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  ativo ? "border-primary bg-primary" : "border-muted bg-transparent"
                }`}
              >
                {ativo && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
              </span>
            </button>
          );
        })}
      </section>

      {/* Botão Continuar */}
      <div className="sticky bottom-0 z-40 -mx-4 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
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
