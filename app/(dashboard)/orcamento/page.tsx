"use client";

import { useEffect, useMemo, useState } from "react";
import { useFinanceData } from "@/hooks/use-finance-data";
import { formatCurrency } from "@/lib/utils/finance";

const KEY = "meusaldo-v6-budget";
type Limits = Record<string, number>;
export default function OrcamentoPage() {
  const { transactions, categories, loading, error } = useFinanceData();
  const [limits, setLimits] = useState<Limits>({});
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  useEffect(() => { try { setLimits(JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { setLimits({}); } }, []);
  const spending = useMemo(() => {
    const result: Limits = {};
    for (const t of transactions) if (t.type === "expense" && t.date.startsWith(month)) {
      result[t.category_id] = (result[t.category_id] || 0) + Number(t.amount);
    }
    return result;
  }, [transactions, month]);
  function update(id: string, raw: string) {
    const value = Math.max(0, Number(raw) || 0);
    const next = { ...limits, [id]: value };
    setLimits(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage may be disabled */ }
  }
  return <div className="content-page">
    <div className="page-heading"><div><span className="eyebrow">PLANEJAMENTO</span><h1>Orçamento mensal</h1><p>Defina limites para acompanhar seus gastos por categoria.</p></div></div>
    <section className="panel" style={{ padding: 22 }}>
      <label className="field"><span>Mês de referência</span><input className="text-input" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ maxWidth: 240 }} /></label>
      <p style={{ color: "var(--muted-foreground)", margin: "16px 0" }}>Os limites são salvos somente neste dispositivo. Valores de despesas incluem lançamentos pendentes.</p>
      {error && <div className="inline-error">{error}</div>}
      {loading ? <p>Carregando...</p> : categories.filter(c => c.type === "expense").map(c => {
        const spent = spending[c.id] || 0;
        const limit = limits[c.id] || 0;
        const ratio = limit > 0 ? spent / limit : 0;
        return <div key={c.id} style={{ padding: "18px 0", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <strong>{c.name}</strong><label style={{ display: "flex", alignItems: "center", gap: 8 }}>Limite (R$)<input aria-label={`Limite de ${c.name}`} type="number" min="0" step="0.01" className="text-input" style={{ width: 125 }} value={limit || ""} onChange={e => update(c.id, e.target.value)} /></label>
          </div>
          <p style={{ margin: "9px 0", color: ratio >= 1 && limit > 0 ? "var(--red)" : "var(--muted-foreground)" }}>Gasto: {formatCurrency(spent)}{limit > 0 ? ` de ${formatCurrency(limit)}` : " — sem limite definido"}</p>
          {limit > 0 && <div role="progressbar" aria-label={`Orçamento de ${c.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(ratio * 100))} style={{ height: 9, borderRadius: 8, background: "var(--border)", overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, ratio * 100)}%`, background: ratio >= 1 ? "var(--red)" : ratio >= .8 ? "var(--orange)" : "var(--primary)", transition: "width .3s" }} /></div>}
        </div>;
      })}
    </section>
  </div>;
}
