import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, Phone } from "lucide-react";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | Foto Camarada" },
      {
        name: "description",
        content:
          "Política de Privacidade do Foto Camarada. Entenda como tratamos seus dados, fotos e pagamentos.",
      },
      { property: "og:title", content: "Política de Privacidade | Foto Camarada" },
      {
        property: "og:description",
        content:
          "Política de Privacidade do Foto Camarada. Entenda como tratamos seus dados, fotos e pagamentos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-card px-4 py-6 shadow-sm">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Política de Privacidade</h1>
      <p className="mt-2 text-xs text-muted-foreground">Última atualização: 10 de agosto de 2026</p>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-secondary-foreground">
        <section>
          <h2 className="text-base font-bold text-foreground">1. Dados que coletamos</h2>
          <p className="mt-1.5">
            Coletamos apenas o necessário para entregar o serviço: selfie enviada, WhatsApp, e-mail, escolhas
            do quiz (cenário, enquadramento e clima) e dados do pagamento gerados pelo processador.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">2. Uso das fotos</h2>
          <p className="mt-1.5">
            A selfie enviada é usada exclusivamente para gerar a imagem solicitada. Não vendemos, alugamos
            nem compartilhamos suas fotos com terceiros para fins de marketing. As imagens geradas são de uso
            pessoal do cliente.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">3. Armazenamento e exclusão</h2>
          <p className="mt-1.5">
            Os arquivos ficam armazenados em ambiente seguro pelo tempo necessário para geração, entrega e
            suporte. Após esse período, são removidos automaticamente. Os dados de contato e pedido são
            mantidos para histórico e garantia.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">4. Pagamento</h2>
          <p className="mt-1.5">
            Os dados de pagamento são processados diretamente pelo Mercado Pago. Não armazenamos dados de
            cartão, chaves Pix ou senhas bancárias em nossos servidores.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">5. Cookies e rastreamento</h2>
          <p className="mt-1.5">
            Utilizamos apenas cookies e identificadores de sessão necessários para o funcionamento do quiz e
            do carrinho. Não usamos cookies de publicidade comportamental.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">6. Segurança</h2>
          <p className="mt-1.5">
            Aplicamos criptografia em trânsito, acesso restrito por papéis e monitoramento contínuo para
            proteger suas informações.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">7. Seus direitos</h2>
          <p className="mt-1.5">
            Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento, entrando em
            contato conosco.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">8. Contato</h2>
          <p className="mt-1.5">
            Para dúvidas sobre privacidade:
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
