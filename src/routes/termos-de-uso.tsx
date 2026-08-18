import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, Phone } from "lucide-react";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso | Foto Camarada" },
      {
        name: "description",
        content:
          "Termos de Uso do Foto Camarada. Leia as regras para uso do serviço de geração de imagens por IA.",
      },
      { property: "og:title", content: "Termos de Uso | Foto Camarada" },
      {
        property: "og:description",
        content:
          "Termos de Uso do Foto Camarada. Leia as regras para uso do serviço de geração de imagens por IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermosDeUso,
});

function TermosDeUso() {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-card px-4 py-6 shadow-sm">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Termos de Uso</h1>
      <p className="mt-2 text-xs text-muted-foreground">Última atualização: 10 de agosto de 2026</p>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-secondary-foreground">
        <section>
          <h2 className="text-base font-bold text-foreground">1. Sobre o serviço</h2>
          <p className="mt-1.5">
            O Foto Camarada gera imagens fictícias por inteligência artificial a partir de uma selfie
            enviada pelo usuário. O resultado é uma imagem de entretenimento pessoal e não possui valor
            documental, jornalístico ou oficial.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">2. Uso permitido</h2>
          <p className="mt-1.5">
            O serviço destina-se exclusivamente a uso pessoal, não comercial e não político-partidário. É
            proibido usar as imagens geradas para desinformação, campanhas eleitorais, propaganda partidária,
            assédio, discriminação ou qualquer fim ilícito.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">3. Pagamento</h2>
          <p className="mt-1.5">
            O valor cobrado é de pagamento único, sem renovação automática. O pagamento é processado via
            Pix/Mercado Pago. A imagem só é gerada após a confirmação do pagamento.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">4. Garantia de satisfação</h2>
          <p className="mt-1.5">
            Em caso de falha técnica na geração ou entrega da imagem, o usuário pode solicitar a
            reemissão/reembolso em até 7 dias, mediante comprovação do pagamento.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">5. Responsabilidade</h2>
          <p className="mt-1.5">
            As imagens são criadas por IA e podem apresentar imperfeições. Não nos responsabilizamos pelo uso
            indevido das imagens geradas pelo usuário. O usuário declara ter direito de uso da foto enviada e
            que esta não infringe direitos de terceiros.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">6. Contato</h2>
          <p className="mt-1.5">
            Dúvidas podem ser enviadas por e-mail ou WhatsApp:
          </p>
          <ul className="mt-2 space-y-1.5">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <a href="mailto:b.anegocios22k@gmail.com" className="text-primary hover:underline">
                b.anegocios22k@gmail.com
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <a href="https://wa.me/553192626162" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                +55 31 92626162
              </a>
            </li>
          </ul>
        </section>
      </div>

      <footer className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        <p>CNPJ: 63.109.167/0001-05</p>
        <p className="mt-1">Foto Camarada</p>
      </footer>
    </main>
  );
}
