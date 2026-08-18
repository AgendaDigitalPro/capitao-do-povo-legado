import React, { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Camera, Check, Gift, Image as ImageIcon, Mail, Phone, Shield, ShieldCheck, Sparkles, Star } from "lucide-react";
import { StickyCta } from "@/components/quiz/StickyCta";
import { capturarUtms, getSessionId } from "@/lib/sessao";
import { trackEtapa } from "@/lib/analytics";

import ex1 from "@/assets/exemplo-1.jpg";
import ex2 from "@/assets/exemplo-2.jpg";
import ex3 from "@/assets/exemplo-3.jpg";
import dep1 from "@/assets/depoimento-1.jpg";
import dep2 from "@/assets/depoimento-2.jpg";
import dep3 from "@/assets/depoimento-3.jpg";
import dep4 from "@/assets/depoimento-4.jpg";

function useIsMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sua foto com o Capitão | Capitão do Povo" },
      {
        name: "description",
        content:
          "Envie uma selfie e receba em minutos a foto que faltava: você ao lado do Capitão. Pagamento único, imagem gerada por IA.",
      },
      { property: "og:title", content: "Sua foto com o Capitão" },
      {
        property: "og:description",
        content: "Mande uma selfie e faça hoje a foto que ficou faltando esses anos todos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const exemplos = [
  { src: ex1, titulo: "Exemplo 1: Selfie com o Capitão" },
  { src: ex2, titulo: "Exemplo 2: Encontro em Brasília" },
  { src: ex3, titulo: "Exemplo 3: Ato verde e amarelo" },
];

const passos = [
  {
    icone: Sparkles,
    titulo: "Escolha o cenário",
    texto: "Selfie, ato patriota ou encontro em Brasília.",
  },
  {
    icone: Camera,
    titulo: "Envie sua selfie",
    texto: "Uma foto de frente, com boa luz. Só isso.",
  },
  {
    icone: ImageIcon,
    titulo: "Receba sua foto",
    texto: "Pronta pra postar no WhatsApp e nas redes.",
  },
];

const depoimentos = [
  {
    nome: "Antônio Ribeiro",
    user: "@antonio.patriota",
    texto:
      "“Coloquei no perfil e o pessoal do grupo veio tudo perguntar onde eu tinha tirado. Ficou tão real que ninguém acreditou!”",
    foto: dep1,
  },
  {
    nome: "Marlene Duarte",
    user: "@dona.marlene",
    texto:
      "“Botei minha foto com o Capitão no WhatsApp e o grupo da família inteiro quis fazer a sua também. Ficou muito real!”",
    foto: dep2,
  },
  {
    nome: "Jorge Almeida",
    user: "@jorge.brasil",
    texto:
      "“Nunca tive a chance de tirar uma foto com ele pessoalmente, mas essa aqui ficou de arrepiar. Já virou minha foto de perfil!”",
    foto: dep3,
  },
  {
    nome: "Sebastião Nunes",
    user: "@sebastiao.nunes",
    texto:
      "“Paguei no PIX e recebi na hora. Compartilhei no grupo e todo mundo pediu o link. Simples até pra mim que não manjo de celular!”",
    foto: dep4,
  },
];

const seguranca = [
  "Imagem gerada por IA",
  "Pagamento único, sem assinatura",
  "Sua foto é usada apenas para gerar o resultado",
  "Seus dados ficam protegidos do início ao fim",
  "Não é propaganda oficial nem apoio de figura pública",
];

function Stars() {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-star text-star" />
      ))}
    </span>
  );
}

function Index() {
  const isMounted = useIsMounted();

  // Garante o ID da sessão imediatamente na renderização
  const sessionId = getSessionId();

  useEffect(() => {
    trackEtapa('01_landing');
    capturarUtms();
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-md bg-card px-4 pb-0 shadow-sm">
      <div className="-mx-4 flex h-1.5">
        <span className="flex-1 bg-primary" />
        <span className="flex-1 bg-muted" />
        <span className="flex-1 bg-muted" />
        <span className="flex-1 bg-muted" />
        <span className="flex-1 bg-muted" />
        <span className="flex-1 bg-muted" />
      </div>

      {/* Hero */}
      <section className="-mx-4 bg-primary-dark px-4 pb-6 pt-6 text-center">
        <h1 className="text-[28px] font-extrabold leading-[1.15] tracking-tight text-primary-foreground">
          Sua foto ao lado do Capitão 🇧🇷
        </h1>
        <p className="mx-auto mt-2 max-w-[19rem] text-sm leading-snug text-primary-foreground/85">
          A inteligência artificial cria em minutos uma foto realista sua com ele.
        </p>

        <div className="mx-auto mt-5 w-full">
          <div className="overflow-hidden rounded-2xl border-4 border-card shadow-[0_12px_30px_-8px_rgba(0,0,0,0.45)]">
            <img
              src={ex1}
              alt="Exemplo de foto com o Capitão gerada por IA"
              className="w-full h-auto block"
            />
          </div>
        </div>

        <Link
          to="/etapa-2"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cta px-5 py-4 text-lg font-extrabold uppercase tracking-wide text-cta-foreground shadow-lg transition-transform hover:scale-[1.02]"
        >
          Criar minha foto agora
          <ArrowRight className="h-5 w-5" />
        </Link>

        <p className="mt-3 text-sm font-semibold text-primary-foreground">
          🔥 Mais de 12.000 patriotas já criaram a sua
        </p>
        <p className="mt-1 text-[11px] text-primary-foreground/70">
          Pagamento único de R$ 9,90 no Pix. Imagem fictícia gerada por IA.
        </p>
      </section>

      {/* Como funciona */}
      <section className="pt-6">
        <h2 className="text-lg font-bold">Como funciona</h2>
        <ol className="mt-3 space-y-2.5">
          {passos.map((p, i) => (
            <li
              key={p.titulo}
              className="flex items-center gap-3 rounded-xl border border-border p-3.5 shadow-sm"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <p.icone className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold">
                  {i + 1}. {p.titulo}
                </p>
                <p className="text-xs leading-snug text-muted-foreground">{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Bônus */}
      <section className="mt-5 flex gap-2 rounded-xl border border-primary/25 bg-highlight/60 p-3">
        <Gift className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-secondary-foreground">
          E leve de <strong>GRAÇA</strong> o bônus <strong>Poste Como Patriota</strong> com 20
          legendas prontas, figurinhas e papéis de parede.
        </p>
      </section>

      {/* Provas */}
      <section className="pt-6 text-center">
        <div className="flex flex-wrap justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Dados protegidos
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium">
            <Check className="h-3.5 w-3.5 text-primary" /> Garantia de satisfação
          </span>
        </div>
      </section>

      <hr className="my-6 border-border" />

      {/* Exemplos */}
      <section>
        <h2 className="text-lg font-bold">Exemplos de resultado</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Imagens de exemplo servem apenas para mostrar estilos possíveis. Elas não são clientes
          reais.
        </p>
        <div className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3">
          {exemplos.map((e) => (
            <figure key={e.titulo} className="w-[62%] shrink-0 snap-start">
              <div className="relative overflow-hidden rounded-lg">
                <img
                  src={e.src}
                  alt={e.titulo}
                  loading="lazy"
                  decoding="async"
                  width={512}
                  height={512}
                  className="aspect-[3/4] w-full object-cover"
                />
                <span className="absolute left-2 top-2 rounded bg-foreground/85 px-1.5 py-0.5 text-[9px] font-bold text-card">
                  EXEMPLO GERADO POR IA
                </span>
              </div>
              <figcaption className="mt-2">
                <span className="block text-sm font-semibold">{e.titulo}</span>
                <span className="block text-xs text-muted-foreground">
                  Imagem fictícia para demonstrar o estilo.
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>


      <hr className="my-6 border-border" />

      {/* Depoimentos */}
      <section>
        <h2 className="text-lg font-bold">Quem já usou aprova</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Mensagens de patriotas que já criaram e compartilharam a própria foto. Fotos ilustrativas.
        </p>
        <div className="mt-4 space-y-3">
          {depoimentos.map((d) => (
            <article key={d.user} className="rounded-xl border border-border p-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <img
                  src={d.foto}
                  alt={d.nome}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    {d.nome}
                    <span className="rounded bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                      BR
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{d.user}</p>
                </div>
                <Stars />
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-secondary-foreground">{d.texto}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA pós depoimentos */}
      <Link
        to="/etapa-2"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cta px-5 py-4 text-lg font-extrabold uppercase tracking-wide text-cta-foreground shadow-lg transition-transform hover:scale-[1.02]"
      >
        Quero minha foto
        <ArrowRight className="h-5 w-5" />
      </Link>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        🔥 Mais de 12.000 patriotas já criaram a sua
      </p>


      {/* Segurança */}
      <section className="mt-6 rounded-xl border border-border p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Shield className="h-4 w-4 text-primary" /> Segurança e transparência
        </h2>
        <ul className="mt-3 space-y-2">
          {seguranca.map((s) => (
            <li key={s} className="flex gap-2 text-sm text-secondary-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {s}
            </li>
          ))}
        </ul>
      </section>

      {/* CTA final */}
      <section className="mt-6 overflow-hidden rounded-2xl bg-primary-dark text-center">
        <div className="flex h-1.5">
          <span className="flex-1 bg-primary" />
          <span className="flex-1 bg-card" />
          <span className="flex-1 bg-primary" />
        </div>
        <div className="px-6 py-7">
          <h2 className="text-xl font-extrabold leading-snug text-primary-foreground">
            Pronto para criar sua imagem com o Capitão?
          </h2>
          <Link
            to="/etapa-2"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cta px-6 py-4 text-lg font-extrabold uppercase tracking-wide text-cta-foreground shadow-md transition-transform hover:scale-[1.02]"
          >
            Quero minha foto <ArrowRight className="h-5 w-5" />
          </Link>

          <p className="mt-4 text-[11px] text-primary-foreground/70">
            Imagem fictícia gerada por inteligência artificial.
          </p>
        </div>
      </section>

      <Footer />
      <div className="h-4" />
      <StickyCta to="/etapa-2" />
    </main>
  );
}

function Footer() {
  return (
    <footer className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm">
      <h3 className="text-base font-bold text-foreground">Meios de Contato</h3>
      <ul className="mt-3 space-y-2">
        <li className="flex items-center gap-2 text-secondary-foreground">
          <Mail className="h-4 w-4 text-primary" />
          <a href="mailto:b.anegocios22k@gmail.com" className="text-primary hover:underline">
            b.anegocios22k@gmail.com
          </a>
        </li>
        <li className="flex items-center gap-2 text-secondary-foreground">
          <Phone className="h-4 w-4 text-primary" />
          <a
            href="https://wa.me/553192626162"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            +55 31 92626162
          </a>
        </li>
      </ul>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <Link to="/termos-de-uso" className="text-muted-foreground hover:text-foreground">
          Termos de Uso
        </Link>
        <Link to="/privacidade" className="text-muted-foreground hover:text-foreground">
          Privacidade
        </Link>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        © 2026 Capitão do Povo - CNPJ: 63.109.167/0001-05
      </p>

    </footer>
  );
}
