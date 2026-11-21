"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useFinanceData } from "@/hooks/use-finance-data";
import { formatCurrency } from "@/lib/utils/finance";

function localDate(date: string) { const [y,m,d] = date.slice(0,10).split("-").map(Number); return new Date(y,m-1,d,12); }
export default function AvisosPage() {
  const { transactions, loading, error } = useFinanceData();
  const today = new Date();
  today.setHours(12,0,0,0);
  const alerts = useMemo(() => transactions.filter(t => t.type === "expense" && !t.is_paid).map(t => ({
    ...t, days: Math.round((localDate(t.date).getTime() - today.getTime()) / 86400000)
  })).filter(t => t.days <= 7).sort((a,b) => a.days-b.days), [transactions, today.getTime()]);
  return <div className="content-page">
    <div className="page-heading"><div><span className="eyebrow">CENTRAL DE AVISOS</span><h1>Notificações</h1><p>Despesas pendentes próximas do vencimento ou atrasadas.</p></div></div>
    <section className="panel" style={{ padding: 22 }}>
      <p className="field-hint">Avisos exibidos dentro do aplicativo. Não enviamos notificações push nem alteramos o status de pagamento automaticamente.</p>
      {error && <p className="inline-error">{error}</p>}
      {loading ? <p>Carregando...</p> : alerts.map(t => <div key={t.id} style={{ borderBottom: "1px solid var(--border)", padding: "16px 0", display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div><strong>{t.description}</strong><p style={{ margin: "5px 0", color: t.days < 0 ? "var(--red)" : "var(--muted-foreground)" }}>{t.days < 0 ? `Atrasada há ${-t.days} dia(s)` : t.days === 0 ? "Vence hoje" : `Vence em ${t.days} dia(s)`} · {t.date.slice(8,10)}/{t.date.slice(5,7)}</p></div>
        <strong>{formatCurrency(Number(t.amount))}</strong>
      </div>)}
      {!loading && !error && !alerts.length && <p>Você não tem despesas pendentes vencidas ou com vencimento nos próximos sete dias.</p>}
      <Link href="/transacoes" className="button button-secondary" style={{ marginTop: 16 }}>Ver transações</Link>
    </section>
  </div>;
}
