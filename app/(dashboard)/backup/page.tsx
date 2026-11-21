"use client";

import { useMemo } from "react";
import { useFinanceData } from "@/hooks/use-finance-data";
import { useSavingsData } from "@/hooks/use-savings-data";
import { formatCurrency } from "@/lib/utils/finance";

function download(name: string, text: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export default function BackupPage() {
  const finances = useFinanceData();
  const savings = useSavingsData();
  const loading = finances.loading || savings.loading;
  const error = finances.error || savings.error;
  const totals = useMemo(() => ({
    transactions: finances.transactions.length,
    categories: finances.categories.length,
    goals: savings.goals.length,
    savings: savings.entries.length,
    allocations: savings.allocations.length,
    totalSavings: savings.entries.reduce((n,s) => n + Number(s.amount), 0)
  }), [finances.transactions, finances.categories, savings.goals, savings.entries, savings.allocations]);
  function exportBackup() {
    if (loading || error) return;
    const payload = {
      format: "meusaldo-backup", version: 1, exportedAt: new Date().toISOString(),
      note: "Arquivo somente de exportação. A importação automática não está disponível.",
      finance: { transactions: finances.transactions, categories: finances.categories },
      savings: { goals: savings.goals, entries: savings.entries, allocations: savings.allocations }
    };
    download(`meusaldo-backup-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(payload, null, 2));
  }
  return <div className="content-page"><div className="page-heading"><div><span className="eyebrow">SEUS DADOS</span><h1>Backup</h1><p>Exporte uma cópia dos dados financeiros que estão na sua conta.</p></div></div>
    <section className="panel" style={{ maxWidth: 650, padding: 24, display: "grid", gap: 12 }}>
      <h2>Exportar backup JSON</h2>
      <p>Inclui {totals.transactions} lançamentos, {totals.categories} categorias, {totals.goals} metas, {totals.savings} economias e {totals.allocations} alocações.</p>
      <p>Total de economias registradas: <strong>{formatCurrency(totals.totalSavings)}</strong>.</p>
      {error && <div className="inline-error">{error}</div>}
      <button type="button" className="button button-primary" disabled={loading || !!error} onClick={exportBackup}>{loading ? "Carregando..." : "Baixar backup JSON"}</button>
      <p className="field-hint">Este arquivo contém informações financeiras privadas. Guarde-o em local seguro. A importação automática ainda não está disponível e nenhuma informação será apagada ou restaurada nesta tela.</p>
    </section>
  </div>;
}
