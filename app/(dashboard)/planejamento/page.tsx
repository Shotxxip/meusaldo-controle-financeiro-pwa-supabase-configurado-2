"use client";

import { useMemo, useState } from "react";
import { useSavingsData } from "@/hooks/use-savings-data";
import { useFinanceData } from "@/hooks/use-finance-data";
import { formatCurrency } from "@/lib/utils/finance";

const BR_MONTH = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
function estimateMonths(remaining: number, monthly: number) {
  if (remaining <= 0) return "Meta alcançada!";
  if (monthly <= 0) return "Informe um valor mensal para estimar.";
  const count = Math.ceil(remaining / monthly);
  if (count > 600) return "Mais de 50 anos no ritmo informado.";
  const future = new Date();
  future.setMonth(future.getMonth() + count);
  return `Previsão: ${BR_MONTH.format(future)} (${count} ${count === 1 ? "mês" : "meses"}).`;
}
export default function PlanejamentoPage() {
  const { goals, entries, allocations, loading, error } = useSavingsData();
  const { transactions } = useFinanceData();
  const [monthly, setMonthly] = useState<Record<string,string>>({});
  const allocatedByGoal = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of allocations) totals.set(item.goal_item_id, (totals.get(item.goal_item_id) || 0) + Number(item.amount));
    return totals;
  }, [allocations]);
  const totalSaved = entries.reduce((value, item) => value + Number(item.amount), 0);
  const paidTransactions = transactions.filter(x => x.is_paid).length;
  const awards = [
    { title: "Primeiro passo", detail: "Registrou sua primeira economia", achieved: entries.length >= 1 },
    { title: "Construindo um hábito", detail: "Registrou cinco economias", achieved: entries.length >= 5 },
    { title: "Dez registros", detail: "Acompanhou dez lançamentos financeiros", achieved: transactions.length >= 10 },
    { title: "Meta alcançada", detail: "Completou uma meta financeira", achieved: goals.some(g => allocatedByGoal.get(g.id)! >= Number(g.price) * Number(g.quantity)) },
    { title: "Organização em dia", detail: "Registrou cinco pagamentos", achieved: paidTransactions >= 5 }
  ];
  return <div className="content-page">
    <div className="page-heading"><div><span className="eyebrow">OBJETIVOS E EVOLUÇÃO</span><h1>Meu planejamento</h1><p>Estime a conclusão de metas e acompanhe suas conquistas.</p></div></div>
    {error && <div className="inline-error">{error}</div>}
    {loading ? <p>Carregando metas...</p> : <>
      <section className="panel" style={{ padding: 22, marginBottom: 20 }}>
        <h2>Previsão de metas</h2><p style={{ color: "var(--muted-foreground)" }}>Simulação baseada no valor mensal que você informar. Não cria transferências nem movimenta dinheiro.</p>
        {goals.filter(g => !g.is_purchased).map(g => {
          const total = Number(g.price) * Number(g.quantity);
          const saved = allocatedByGoal.get(g.id) || 0;
          const remaining = Math.max(0, total - saved);
          const monthlyValue = Number(monthly[g.id] || 0);
          return <div key={g.id} style={{ borderBottom: "1px solid var(--border)", padding: "18px 0", display: "grid", gap: 8 }}>
            <strong>{g.title}</strong><span>Alocado: {formatCurrency(saved)} de {formatCurrency(total)} · Falta: {formatCurrency(remaining)}</span>
            <label className="field"><span>Quanto pretende guardar por mês (R$)</span><input aria-label={`Valor mensal para ${g.title}`} className="text-input" type="number" min="0" step="0.01" style={{ maxWidth: 180 }} value={monthly[g.id] || ""} onChange={e => setMonthly(prev => ({ ...prev, [g.id]: e.target.value }))} /></label>
            <span style={{ color: "var(--primary)", fontWeight: 700 }}>{estimateMonths(remaining, monthlyValue)}</span>
          </div>;
        })}
        {!goals.length && <p>Crie uma meta para começar a planejar.</p>}
      </section>
      <section className="panel" style={{ padding: 22 }}>
        <h2>Conquistas</h2><p>Você já registrou {formatCurrency(totalSaved)} em economias.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          {awards.map(a => <article key={a.title} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 16, opacity: a.achieved ? 1 : .62 }}>
            <div style={{ fontSize: 22 }} aria-hidden="true">{a.achieved ? "🏆" : "🔒"}</div>
            <strong>{a.title}</strong><p style={{ color: "var(--muted-foreground)" }}>{a.detail}</p><span>{a.achieved ? "Conquistada" : "Em andamento"}</span>
          </article>)}
        </div>
      </section>
    </>}
  </div>;
}
