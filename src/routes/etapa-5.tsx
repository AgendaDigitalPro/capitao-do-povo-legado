import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { trackEtapa } from "@/lib/analytics";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronLeft,
  RefreshCw,
  ShieldCheck,
  X,

} from "lucide-react";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { salvarEtapaPedido } from "@/lib/pedido-persistencia";
import { getSessionId } from "@/lib/sessao";

export const Route = createFileRoute("/etapa-5")({
  head: () => ({
    meta: [
      { title: "Envie a sua foto | Foto Camarada" },
      {
        name: "description",
        content:
          "Envie uma foto sua de frente e com boa luz para a IA montar o seu registro ao lado do nosso Presidente.",
      },
      { property: "og:title", content: "Agora envie a sua foto" },
      {
        property: "og:description",
        content: "Escolha uma foto de frente e com boa luz. É ela que a IA vai usar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Etapa5,
});

function Etapa5() {
  const [preview, setPreview] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const galeriaRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  async function comprimir(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const max = 1600;
    const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * escala);
    const h = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas indisponivel");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", 0.85),
    );
    if (!blob) throw new Error("falha ao converter a imagem");
    return blob;
  }

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErro(null);
    setEnviando(true);
    setPreview(URL.createObjectURL(file));

    try {
      // Aceita qualquer formato: tenta converter para JPEG; se o navegador nao
      // souber decodificar (HEIC, TIFF, RAW...), envia o arquivo original.
      let corpo: Blob = file;
      let tipo = file.type || "application/octet-stream";
      let ext = (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
      try {
        corpo = await comprimir(file);
        tipo = "image/jpeg";
        ext = "jpg";
      } catch {
        if (!ext) ext = "bin";
      }

      const sessionId = getSessionId();
      const caminho = `${sessionId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("selfies")
        .upload(caminho, corpo, { contentType: tipo, upsert: false });
      if (error) throw error;
      await trackEtapa('05_upload');
      await salvarEtapaPedido({ sessionId, selfie_url: caminho });
      setPronto(true);
    } catch (err) {
      console.error("upload selfie", err);
      setPreview(null);
      setPronto(false);
      const detalhe = err instanceof Error ? err.message : "";
      setErro(
        `Nao conseguimos enviar a sua foto. Tente de novo, camarada.${detalhe ? ` (${detalhe})` : ""}`,
      );
    } finally {
      setEnviando(false);
      e.target.value = "";
    }
  }



  return (
    <main className="etapa-in mx-auto flex min-h-screen max-w-md flex-col bg-card px-4 shadow-sm">
      <header className="-mx-4 px-4 pt-4">
        <div className="flex items-center justify-between">
          <Link
            to="/etapa-4"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Link>
          <span className="rounded-full bg-highlight px-3 py-1 text-[10px] font-bold tracking-wide text-primary">
            PASSO 4 DE 6
          </span>
        </div>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="barra-progresso h-full rounded-full bg-primary" style={{ width: "66.6%" }} />
        </div>
      </header>

      <section className="pt-6">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Falta pouco pra sua foto! 🔥</p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-foreground">
          Agora envie a sua selfie 📸
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tire uma selfie com boa iluminação, rosto centralizado e sem óculos escuros.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-cta/40 bg-cta/5 p-3 text-center">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-cta">
              <Check className="h-4 w-4" /> BOA
            </span>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
              Rosto de frente, luz no rosto, sozinho na foto.
            </p>
          </div>
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-center">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
              <X className="h-4 w-4" /> RUIM
            </span>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
              Escura, de longe, com boné, óculos escuros ou mais gente.
            </p>
          </div>
        </div>
      </section>


      <input
        ref={galeriaRef}
        type="file"
        accept="image/*,.heic,.heif,.avif,.tif,.tiff"
        className="hidden"
        onChange={handleArquivo}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*,.heic,.heif,.avif,.tif,.tiff"
        capture="user"
        className="hidden"
        onChange={handleArquivo}
      />

      <section className="mt-5 flex-1 space-y-3">
        {preview ? (
          <div className="rounded-xl border border-primary/30 bg-highlight/60 p-5 text-center">
            <img
              src={preview}
              alt="Pré-visualização da sua selfie"
              className="mx-auto h-40 w-40 rounded-xl object-cover shadow-sm"
            />
            <h2 className="mt-4 text-lg font-extrabold text-primary">
              Boa escolha! Sua foto foi carregada 🔥
            </h2>
            <p className="mt-1 text-sm leading-snug text-primary/80">
              Agora toque no botão abaixo para seguir e gerar a sua foto com o Presidente.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => galeriaRef.current?.click()}
            className="flex min-h-[44px] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/50 bg-highlight/40 px-5 py-8 text-center transition-colors hover:bg-highlight/70"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Camera className="h-5 w-5" />
            </span>
            <span className="text-base font-extrabold uppercase tracking-wide text-primary">
              Enviar minha selfie 📸
            </span>
            <span className="text-xs leading-snug text-muted-foreground">
              Escolha uma foto sua da galeria. A gente ajusta o tamanho no seu navegador.
            </span>
          </button>
        )}


        {preview ? (
          <button
            type="button"
            onClick={() => galeriaRef.current?.click()}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-card px-5 py-3.5 text-sm font-bold uppercase tracking-wide text-primary shadow-sm transition-colors hover:bg-highlight/40"
          >
            <RefreshCw className="h-4 w-4" />
            Trocar foto
          </button>
        ) : (
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40"
          >
            <Camera className="h-4 w-4 text-primary" />
            Tirar foto agora
          </button>
        )}

        <p className="flex items-start gap-2 text-xs leading-snug text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          Sua foto é usada apenas para gerar a imagem e não é armazenada depois disso.
        </p>

        {enviando && (
          <p className="text-xs font-semibold text-primary">Enviando a sua foto...</p>
        )}
        {erro && <p role="alert" className="text-xs font-semibold text-primary">{erro}</p>}
      </section>

      <div className="sticky bottom-0 z-40 -mx-4 mt-5 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate({ to: "/etapa-6" })}
          disabled={!pronto || enviando}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-cta px-5 py-4 text-lg font-extrabold uppercase tracking-wide text-cta-foreground shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          Continuar
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>

    </main>
  );
}

