import { createFileRoute } from "@tanstack/react-router";

/**
 * PAINEL DE MÉTRICAS AO VIVO
 *
 * Página HTML servida direto pelo servidor, consultando o banco a cada
 * carregamento. Atualiza sozinha a cada 60 segundos.
 *
 * Acesso: /api/public/painel?secret=camarada_painel_2026
 *
 * É LEITURA PURA. Não escreve nada, não altera pedido nenhum, não interfere
 * em pagamento, geração de foto ou tracking. Pode ser aberta à vontade.
 *
 * Não expõe e-mail, telefone nem documento de cliente — só números agregados.
 */
const SECRET = "camarada_painel_2026";

// Só vendas do AbacatePay. As de plataformas anteriores ficam de fora.
const BASE_PIX = "pix_char_";

// Precisa espelhar PRECOS de src/lib/pedido.functions.ts.
// Ao criar ou aposentar um order bump, atualize NOS DOIS lugares — senao o
// painel conta a venda mas calcula receita zero para o bump novo.
const PRECOS: Record<string, number> = {
  combo: 990,
  telegram: 2200,
  biografia: 599,
  cartilha: 599,
  adesivos: 599,
  wallpapers: 990,
  figurinhas: 990,
};

const NOMES: Record<string, string> = {
  combo: "Combo 3 Líderes",
  adesivos: "Adesivos Camaradas",
  biografia: "Biografia do Presidente",
  wallpapers: "Pack de Papéis de Parede",
  figurinhas: "Figurinhas pro WhatsApp",
  cartilha: "Cartilha da Militância (aposentado)",
  telegram: "Grupo VIP Telegram (aposentado)",
};

// O upsell NAO e order bump: e uma segunda compra, feita depois da entrega.
// Ele fica fora das tabelas de bump de proposito — misturar os dois faria o
// attach rate mentir. Aparece na sua propria secao.
const MARCA_UPSELL = "upsell_ambientes";

type Pedido = {
  valor_total: number;
  bumps_selecionados: unknown;
  status: string;
  created_at: string;
  payment_id: string;
};

export const Route = createFileRoute("/api/public/painel")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("secret") !== SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }

        // Filtro de período. Datas em horário de Brasília (UTC-3).
        const periodo = ["hoje", "7d", "tudo"].includes(url.searchParams.get("periodo") ?? "")
          ? (url.searchParams.get("periodo") as string)
          : "tudo";
        const agoraBR = new Date(Date.now() - 3 * 3600 * 1000);
        let corte: Date | null = null;
        if (periodo === "hoje") {
          corte = new Date(agoraBR.toISOString().slice(0, 10) + "T00:00:00.000Z");
          corte = new Date(corte.getTime() + 3 * 3600 * 1000);
        } else if (periodo === "7d") {
          corte = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        }
        const ROTULO: Record<string, string> = { hoje: "Hoje", "7d": "Últimos 7 dias", tudo: "Todo o período" };

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data, error } = await supabaseAdmin
          .from("pedidos")
          .select("valor_total, bumps_selecionados, status, created_at, payment_id")
          .not("payment_id", "is", null)
          .gte("valor_total", 500)
          .order("created_at", { ascending: true });

        if (error) {
          return new Response(`Erro ao consultar: ${error.message}`, { status: 500 });
        }

        const PAGO = new Set(["pago", "gerando_foto", "foto_pronta", "erro"]);
        const bumpsDe = (p: Pedido): string[] =>
          Array.isArray(p.bumps_selecionados) ? (p.bumps_selecionados as string[]) : [];
        const ehUpsell = (p: Pedido) => bumpsDe(p).includes(MARCA_UPSELL);

        const todos = ((data ?? []) as unknown as Pedido[]).filter(
          (p) =>
            String(p.payment_id ?? "").startsWith(BASE_PIX) &&
            (!corte || new Date(p.created_at) >= corte),
        );
        const pagos = todos.filter((p) => PAGO.has(p.status));

        // Separa as duas naturezas de venda.
        const principais = pagos.filter((p) => !ehUpsell(p));
        const upsells = pagos.filter(ehUpsell);
        const upsellsTentados = todos.filter(ehUpsell); // inclui quem gerou Pix e nao pagou

        // KPIs gerais (upsell entra no faturamento, porque e receita de verdade)
        const receita = pagos.reduce((s, p) => s + p.valor_total, 0);
        const comBump = principais.filter((p) => bumpsDe(p).filter((b) => b in PRECOS).length > 0).length;

        // Attach rate por bump — calculado SOBRE AS VENDAS PRINCIPAIS.
        const contagem: Record<string, number> = {};
        for (const p of principais) {
          for (const b of bumpsDe(p)) if (b in PRECOS) contagem[b] = (contagem[b] ?? 0) + 1;
        }
        const bumps = Object.entries(contagem)
          .map(([bump, vendas]) => ({
            bump,
            nome: NOMES[bump] ?? bump,
            vendas,
            attach: principais.length ? (vendas * 100) / principais.length : 0,
            receita: (vendas * (PRECOS[bump] ?? 0)) / 100,
          }))
          .sort((a, b) => b.vendas - a.vendas);
        const receitaBumps = bumps.reduce((s, b) => s + b.receita, 0);

        // Upsell: quantos receberam a oferta (foto entregue) e quantos compraram
        const entregues = principais.filter((p) => p.status === "foto_pronta").length;
        const receitaUpsell = upsells.reduce((s, p) => s + p.valor_total, 0) / 100;
        const taxaUpsell = entregues ? (upsells.length * 100) / entregues : 0;
        const conversaoPix = upsellsTentados.length
          ? (upsells.length * 100) / upsellsTentados.length
          : 0;

        // Com bump x sem bump (só vendas principais)
        const grupo = (temBump: boolean) => {
          const g = todos.filter(
            (p) => !ehUpsell(p) && bumpsDe(p).filter((b) => b in PRECOS).length > 0 === temBump,
          );
          const pg = g.filter((p) => PAGO.has(p.status));
          const rec = pg.reduce((s, p) => s + p.valor_total, 0);
          return {
            nome: temBump ? "Com bump" : "Sem bump",
            pix: g.length,
            pagos: pg.length,
            taxa: g.length ? (pg.length * 100) / g.length : 0,
            porPix: g.length ? rec / g.length / 100 : 0,
          };
        };
        const comSem = [grupo(true), grupo(false)];

        // Evolução diária (horário de Brasília)
        const porDia: Record<string, { vendas: number; total: number }> = {};
        for (const p of pagos) {
          const d = new Date(new Date(p.created_at).getTime() - 3 * 3600 * 1000)
            .toISOString()
            .slice(0, 10);
          porDia[d] = porDia[d] ?? { vendas: 0, total: 0 };
          porDia[d].vendas++;
          porDia[d].total += p.valor_total;
        }
        const dias = Object.entries(porDia)
          .sort()
          .map(([dia, v]) => ({ dia, vendas: v.vendas, ticket: v.total / v.vendas / 100 }));

        // Combinações (só vendas principais)
        const porCombo: Record<string, { vendas: number; total: number }> = {};
        for (const p of principais) {
          const bs = bumpsDe(p).filter((b) => b in PRECOS).slice().sort();
          const k = bs.length ? bs.map((b) => NOMES[b] ?? b).join(" + ") : "(sem bump)";
          porCombo[k] = porCombo[k] ?? { vendas: 0, total: 0 };
          porCombo[k].vendas++;
          porCombo[k].total += p.valor_total;
        }
        const combos = Object.entries(porCombo)
          .map(([combinacao, v]) => ({ combinacao, vendas: v.vendas, ticket: v.total / v.vendas / 100 }))
          .sort((a, b) => b.vendas - a.vendas)
          .slice(0, 10);

        const D = {
          kpi: {
            vendas: pagos.length,
            receita: receita / 100,
            ticket: pagos.length ? receita / pagos.length / 100 : 0,
            comBump,
            pctComBump: principais.length ? (comBump * 100) / principais.length : 0,
            receitaBumps,
            pctReceitaBumps: receita ? (receitaBumps * 10000) / receita / 100 : 0,
          },
          upsell: {
            vendidos: upsells.length,
            tentaram: upsellsTentados.length,
            entregues,
            taxa: taxaUpsell,
            conversaoPix,
            receita: receitaUpsell,
            pctReceita: receita ? (receitaUpsell * 10000) / receita / 100 : 0,
          },
          bumps,
          comSem,
          dias,
          combos,
          agora: new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " "),
        };

        const filtros = ["hoje", "7d", "tudo"]
          .map(
            (p) =>
              `<a class="fbtn${p === periodo ? " on" : ""}" href="?secret=${SECRET}&periodo=${p}">${ROTULO[p]}</a>`,
          )
          .join("");

        const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Foto Camarada — Painel ao vivo</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.js"></script>
<style>
:root{color-scheme:light}*{box-sizing:border-box}
body{margin:0;padding:22px;background:#faf9f7;color:#1a1a1a;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.wrap{max-width:980px;margin:0 auto}
h1{font-size:21px;margin:0 0 3px;letter-spacing:-.02em}
.sub{color:#6b6b6b;font-size:12px;margin-bottom:20px}
.live{display:inline-block;width:7px;height:7px;border-radius:50%;background:#1a7f37;margin-right:5px;animation:p 2s infinite}
@keyframes p{0%,100%{opacity:1}50%{opacity:.3}}
h2{font-size:14px;margin:26px 0 10px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:10px}
.kpi{background:#fff;border:1px solid #e8e6e1;border-radius:10px;padding:14px}
.kpi.verde{border-color:#bbf7d0;background:#f0fdf4}
.kpi .lbl{font-size:11px;color:#6b6b6b;text-transform:uppercase;letter-spacing:.04em}
.kpi .val{font-size:25px;font-weight:700;margin-top:5px;letter-spacing:-.03em}
.kpi.verde .val{color:#16a34a}
.kpi .note{font-size:11px;color:#8a8a8a;margin-top:3px}
.card{background:#fff;border:1px solid #e8e6e1;border-radius:10px;padding:16px;margin-top:10px}
.cw{position:relative;height:250px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6b6b6b;padding:7px 8px;border-bottom:1px solid #e8e6e1}
td{padding:8px;border-bottom:1px solid #f2f0ec}tr:last-child td{border-bottom:none}
.num{text-align:right;font-variant-numeric:tabular-nums}
.bar{height:6px;background:#e8e6e1;border-radius:3px;overflow:hidden;min-width:55px}
.bar>span{display:block;height:100%;background:#c8102e}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:760px){.g2{grid-template-columns:1fr}body{padding:13px}}
.pill{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
.good{background:#e6f4ea;color:#1a7f37}.bad{background:#fdecea;color:#b3261e}
.callout{background:#fff8e6;border:1px solid #f0e2bc;border-radius:10px;padding:14px;margin-top:10px;font-size:13px;line-height:1.6}
.filtros{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 16px}
.fbtn{display:inline-block;padding:7px 14px;border-radius:20px;border:1px solid #e8e6e1;background:#fff;color:#1a1a1a;text-decoration:none;font-size:13px;font-weight:600}
.fbtn.on{background:#c8102e;border-color:#c8102e;color:#fff}
.vazio{padding:26px 16px;text-align:center;color:#8a8a8a;font-size:13px}
.foot{margin-top:26px;padding-top:14px;border-top:1px solid #e8e6e1;font-size:11px;color:#8a8a8a;line-height:1.7}
</style></head><body><div class="wrap">
<h1>Foto Camarada — Painel de Vendas</h1>
<div class="sub"><span class="live"></span><span id="st">ao vivo</span> · ${ROTULO[periodo]} · ${D.kpi.vendas} vendas pagas · dados de ${D.agora}</div>
<div class="filtros">${filtros}</div>
<div class="kpis" id="kpis"></div>

<h2>Upsell — 3 ambientes (R$19,90, depois da entrega)</h2>
<div class="kpis" id="kupsell"></div>
<div class="callout" id="notaUpsell"></div>

<h2>Order bumps (no checkout, antes do pagamento)</h2>
<div class="card"><table><thead><tr><th>Order bump</th><th class="num">Vendas</th><th class="num">Attach</th><th style="width:22%"></th><th class="num">Receita</th></tr></thead><tbody id="tb"></tbody></table></div>

<h2>O bump derruba a conversão — e ainda assim compensa</h2>
<div class="card"><table><thead><tr><th>Grupo</th><th class="num">Pix gerados</th><th class="num">Pagaram</th><th class="num">Taxa de pagamento</th><th class="num">Receita por Pix</th></tr></thead><tbody id="tcs"></tbody></table></div>
<div class="callout"><strong>Como ler.</strong> Quem adiciona bump paga menos, mas cada Pix gerado com bump vale mais em receita. Os bumps custam conversão e mesmo assim aumentam o faturamento.<br><br><strong>Ressalva.</strong> É correlação, não causa — quem escolhe bump pode ser outro perfil de comprador. Para concluir de verdade seria preciso um teste A/B.</div>

<div class="g2">
<div><h2>Evolução diária</h2><div class="card"><div class="cw"><canvas id="cd"></canvas></div></div></div>
<div><h2>Attach rate</h2><div class="card"><div class="cw"><canvas id="cb"></canvas></div></div></div>
</div>

<h2>Combinações mais compradas</h2>
<div class="card"><table><thead><tr><th>Combinação</th><th class="num">Vendas</th><th class="num">Ticket médio</th></tr></thead><tbody id="tc"></tbody></table></div>

<div class="foot">
<strong>Base:</strong> vendas processadas pelo AbacatePay. Plataformas anteriores excluídas.<br>
<strong>Order bump</strong> é escolhido no checkout, antes de pagar. <strong>Upsell</strong> é uma segunda compra, oferecida depois da foto entregue. São contados separadamente de propósito: misturar os dois faria o attach rate mentir.<br>
<strong>Preços:</strong> Foto R$9,90 · Combo R$9,90 · Wallpapers R$9,90 · Figurinhas R$9,90 · Biografia e Adesivos R$5,99 · Upsell R$19,90.<br>
Página de leitura. Não altera nenhum pedido. Atualiza sozinha a cada 60 segundos.
</div></div>
<script>
const D=${JSON.stringify(D)};
const brl=n=>"R$ "+Number(n||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const pct=n=>Number(n||0).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+"%";
document.getElementById("kpis").innerHTML=\`
<div class="kpi"><div class="lbl">Vendas pagas</div><div class="val">\${D.kpi.vendas}</div><div class="note">inclui upsell</div></div>
<div class="kpi"><div class="lbl">Receita</div><div class="val">\${brl(D.kpi.receita)}</div></div>
<div class="kpi"><div class="lbl">Ticket médio</div><div class="val">\${brl(D.kpi.ticket)}</div></div>
<div class="kpi"><div class="lbl">Vendas com bump</div><div class="val">\${pct(D.kpi.pctComBump)}</div><div class="note">\${D.kpi.comBump} vendas</div></div>
<div class="kpi"><div class="lbl">Receita de bumps</div><div class="val">\${brl(D.kpi.receitaBumps)}</div><div class="note">\${pct(D.kpi.pctReceitaBumps)} do faturamento</div></div>\`;

document.getElementById("kupsell").innerHTML=\`
<div class="kpi verde"><div class="lbl">Upsells vendidos</div><div class="val">\${D.upsell.vendidos}</div><div class="note">de \${D.upsell.entregues} fotos entregues</div></div>
<div class="kpi verde"><div class="lbl">Taxa de upsell</div><div class="val">\${pct(D.upsell.taxa)}</div><div class="note">quem recebeu e comprou</div></div>
<div class="kpi verde"><div class="lbl">Receita do upsell</div><div class="val">\${brl(D.upsell.receita)}</div><div class="note">\${pct(D.upsell.pctReceita)} do faturamento</div></div>
<div class="kpi"><div class="lbl">Gerou Pix do upsell</div><div class="val">\${D.upsell.tentaram}</div><div class="note">clicaram no botão verde</div></div>
<div class="kpi"><div class="lbl">Pagou depois de gerar</div><div class="val">\${pct(D.upsell.conversaoPix)}</div><div class="note">do Pix até o pagamento</div></div>\`;

document.getElementById("notaUpsell").innerHTML = D.upsell.tentaram === 0
  ? "<strong>Ainda sem dados.</strong> A oferta aparece só depois que a foto é entregue. Assim que alguém clicar no botão verde, os números começam a aparecer aqui."
  : "<strong>Duas taxas, duas perguntas.</strong> A <em>taxa de upsell</em> mede se a oferta convence. O <em>pagou depois de gerar</em> mede se o segundo Pix é fricção demais — se muita gente clica e não paga, o problema é o esforço do pagamento, não a oferta.";

const vazio=n=>\`<tr><td colspan="\${n}" class="vazio">Nenhuma venda neste período.</td></tr>\`;
const mx=Math.max(...D.bumps.map(b=>b.attach),1);
document.getElementById("tb").innerHTML=D.bumps.length?D.bumps.map(b=>\`<tr><td>\${b.nome}</td><td class="num">\${b.vendas}</td><td class="num">\${pct(b.attach)}</td><td><div class="bar"><span style="width:\${(b.attach/mx*100).toFixed(0)}%"></span></div></td><td class="num">\${brl(b.receita)}</td></tr>\`).join(""):vazio(5);
document.getElementById("tcs").innerHTML=D.comSem.map(r=>\`<tr><td>\${r.nome}</td><td class="num">\${r.pix}</td><td class="num">\${r.pagos}</td><td class="num"><span class="pill \${r.taxa>=70?'good':'bad'}">\${pct(r.taxa)}</span></td><td class="num"><strong>\${brl(r.porPix)}</strong></td></tr>\`).join("");
document.getElementById("tc").innerHTML=D.combos.length?D.combos.map(c=>\`<tr><td>\${c.combinacao}</td><td class="num">\${c.vendas}</td><td class="num">\${brl(c.ticket)}</td></tr>\`).join(""):vazio(3);

new Chart(document.getElementById("cd"),{type:"line",data:{labels:D.dias.map(d=>d.dia.slice(5).split("-").reverse().join("/")),datasets:[{label:"Vendas",data:D.dias.map(d=>d.vendas),borderColor:"#c8102e",backgroundColor:"rgba(200,16,46,.08)",fill:true,tension:.3,yAxisID:"y"},{label:"Ticket médio (R$)",data:D.dias.map(d=>d.ticket),borderColor:"#2b6cb0",tension:.3,yAxisID:"y1"}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,position:"left"},y1:{beginAtZero:true,position:"right",grid:{drawOnChartArea:false}}},plugins:{legend:{labels:{boxWidth:10,font:{size:11}}}}}});
new Chart(document.getElementById("cb"),{type:"bar",data:{labels:D.bumps.map(b=>b.nome),datasets:[{label:"Attach (%)",data:D.bumps.map(b=>b.attach),backgroundColor:"#c8102e"}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,scales:{x:{beginAtZero:true}},plugins:{legend:{display:false}}}});
let s=60;setInterval(()=>{s--;document.getElementById("st").textContent=s>0?("atualiza em "+s+"s"):"atualizando...";if(s<=0)location.reload();},1000);
</script></body></html>`;

        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        });
      },
    },
  },
});
