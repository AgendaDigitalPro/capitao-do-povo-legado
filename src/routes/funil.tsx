import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { carregarFunil } from "@/lib/funil.functions";

export const Route = createFileRoute("/funil")({
  component: FunilDashboard,
});

function FunilDashboard() {
  const [data, setData] = useState<{ etapas: { etapa: string; count: number }[]; pagos: number }>({ etapas: [], pagos: 0 });
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("Tudo");
  const [atualizado, setAtualizado] = useState(0);
  const buscar = useServerFn(carregarFunil);

  async function carregarDados() {
    const dias =
      periodo === "Tudo" ? null : periodo === "Hoje" ? 1 : periodo === "Últimos 7 dias" ? 7 : 30;
    try {
      const results = await buscar({ data: { dias } });
      setData(results ?? { etapas: [], pagos: 0 });
    } catch {
      setData({ etapas: [], pagos: 0 });
    }
    setLoading(false);
    setAtualizado(0);
  }

  useEffect(() => {
    carregarDados();
    const t = setInterval(() => {
        setAtualizado(v => v + 1);
        if (atualizado + 1 >= 60) carregarDados();
    }, 1000);
    return () => clearInterval(t);
  }, [periodo, atualizado]);

  const etapas = [
    { id: "01_landing", nome: "Landing" },
    { id: "02_cenario", nome: "Cenário" },
    { id: "03_enquadramento", nome: "Enquadramento" },
    { id: "04_clima", nome: "Clima" },
    { id: "05_upload", nome: "Upload" },
    { id: "06_dados", nome: "Dados" },
    { id: "08_checkout", nome: "Checkout" },
    { id: "09_pix_gerado", nome: "Pix Gerado" },
    { id: "10_aguardando", nome: "Aguardando" },
    { id: "11_resultado", nome: "Resultado" },
  ];

  const contagens = etapas.map(e => ({
    ...e,
    count: data.etapas.find(d => d.etapa === e.id)?.count ?? 0,
  }));

  const totalLanding = contagens[0]?.count || 0;
  const totalPagos = data.pagos || 0;

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-4 text-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#DC2626]">Funil Foto Camarada — Analytics</h1>
        <span className="text-xs text-muted-foreground">Atualizado há {atualizado}s</span>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {["Hoje", "Últimos 7 dias", "Últimos 30 dias", "Tudo"].map(p => (
            <button key={p} onClick={() => setPeriodo(p)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${periodo === p ? "bg-[#DC2626]" : "bg-[#222]"}`}>
                {p}
            </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <MetricCard label="Sessões Iniciadas" value={totalLanding} />
        <MetricCard label="Chegaram no Checkout" value={contagens[6]?.count || 0} />
        <MetricCard label="Gerou Pix" value={contagens[7]?.count || 0} />
        <MetricCard label="Vendas Pagas" value={totalPagos} />
        <MetricCard label="Conversão Real" value={((totalPagos) / (totalLanding || 1) * 100).toFixed(1) + "%"} />
        <MetricCard label="Conversão Pix" value={((contagens[7]?.count || 0) / (totalLanding || 1) * 100).toFixed(1) + "%"} />
      </div>

      <div className="space-y-4">
        {contagens.map((e, i) => {
            const prevItem = i === 0 ? null : contagens[i-1];
            const prevCount = prevItem ? prevItem.count : e.count;
            const currentTotalLanding = contagens[0] ? contagens[0].count : 0;
            const avancos = prevCount ? (e.count / (prevCount || 1) * 100).toFixed(0) : "100";
            const global = currentTotalLanding ? (e.count / currentTotalLanding * 100).toFixed(0) : "0";
            const cor = Number(avancos) > 60 ? "bg-[#16A34A]" : Number(avancos) > 40 ? "bg-[#EAB308]" : "bg-[#DC2626]";
            return (
                <div key={e.id}>
                    <div className="flex justify-between text-xs mb-1">
                        <span>{e.nome} ({e.count})</span>
                        <div className="flex gap-2 text-[10px] text-muted-foreground">
                          {i > 0 && <span>{avancos}% avanço</span>}
                          <span>{global}% global</span>
                        </div>
                    </div>
                    <div className="h-4 w-full bg-[#222] rounded-full overflow-hidden">
                        <div className={`h-full ${cor} transition-all`} style={{ width: `${global}%` }} />
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string, value: string | number }) {
    return (
        <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">
            <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
        </div>
    );
}
