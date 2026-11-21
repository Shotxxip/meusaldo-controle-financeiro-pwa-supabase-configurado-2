"use client";

import { useMemo } from "react";
import { useFinanceData } from "@/hooks/use-finance-data";
import { formatCurrency } from "@/lib/utils/finance";

function csvCell(value: string | number | boolean) {
  const text = String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}
function safeCsvCell(value: string) {
  return /^[=+@\-\t\r]/.test(value.trimStart()) ? "'" + value : value;
}
export default function RelatoriosPage() {
  const { transactions, loading, error } = useFinanceData();
  const months = useMemo(() => {
    const data = new Map<string, { income: number; expense: number }>();
    for (const item of transactions) {
      const month = item.date.slice(0, 7);
      const totals = data.get(month) ?? { income: 0, expense: 0 };
      if (item.type === "income") totals.income += Number(item.amount);
      else totals.expense += Number(item.amount);
      data.set(month, totals);
    }
    return [...data].sort(([a], [b]) => b.localeCompare(a));
  }, [transactions]);
  const categories = useMemo(() => {
    const data = new Map<string, number>();
    for (const item of transactions.filter(t => t.type === "expense")) {
      const category = item.category?.name ?? "Sem categoria";
      data.set(category, (data.get(category) ?? 0) + Number(item.amount));
    }
    return [...data].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [transactions]);
  function downloadCsv() {
    const columns = ["Data", "Descrição", "Categoria", "Tipo", "Valor", "Status"];
    const rows = transactions.map(item => [
      item.date, safeCsvCell(item.description), safeCsvCell(item.category?.name ?? ""),
      item.type === "income" ? "Receita" : "Despesa",
      Number(item.amount).toFixed(2), item.is_paid ? "Pago" : "Pendente"
    ]);
    const csv = "\uFEFF" + [columns, ...rows].map(row => row.map(csvCell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = "meusaldo-transacoes.csv";
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="content-page">
    <div className="page-heading"><div><span className="eyebrow">ANÁLISE FINANCEIRA</span><h1>Relatórios</h1><p>Compare seus meses e exporte seus lançamentos.</p></div>
      <button className="button button-primary" disabled={loading || !!error} onClick={downloadCsv}>Exportar CSV</button></div>
    {error && <p className="inline-error">{error}</p>}
    {loading ? <p>Carregando...</p> : <>
      <section className="panel" style={{ padding: 24, marginBottom: 18 }}><h2>Resumo por mês</h2>
        <div style={{ overflowX: "auto" }}><table className="data-table"><thead><tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Saldo</th></tr></thead><tbody>
          {months.map(([month, t]) => <tr key={month}><td>{month}</td><td>{formatCurrency(t.income)}</td><td>{formatCurrency(t.expense)}</td><td>{formatCurrency(t.income - t.expense)}</td></tr>)}
        </tbody></table></div>{!months.length && <p>Sem lançamentos para analisar.</p>}
      </section>
      <section className="panel" style={{ padding: 24 }}><h2>Maiores categorias de despesas</h2>
        {categories.map(([name, total]) => <div key={name} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}><span>{name}</span><strong>{formatCurrency(total)}</strong></div>)}
        {!categories.length && <p>Sem despesas registradas.</p>}
      </section>
    </>}
  </div>;
}
