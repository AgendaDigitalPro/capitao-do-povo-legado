import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function StickyCta({
  label = "Criar minha foto agora",
  to,
  onClick,
}: {
  label?: string;
  to?: string;
  onClick?: () => void;
}) {
  const className =
    "flex w-full items-center justify-center gap-2 rounded-xl bg-cta px-5 py-4 text-lg font-extrabold uppercase tracking-wide text-cta-foreground shadow-lg transition-transform hover:scale-[1.02]";


  return (
    <div className="sticky bottom-0 z-40 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
      {to ? (
        <Link to={to} className={className}>
          {label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={className}>
          {label}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
