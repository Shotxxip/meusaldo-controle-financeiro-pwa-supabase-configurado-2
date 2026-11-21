"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, CalendarClock, CheckCircle2, CircleAlert, Lightbulb, PieChart } from "lucide-react";
import { formatCurrency, totals } from "@/lib/utils/finance";
import type { Transaction } from "@/types/finance";

interface InsightsProps {
  transactions: Transaction[];
  monthFrom: string;
  monthTo: string;
  loading: boolean;
}

function dateKey(date: Date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

export function FinancialInsights({ transactions, monthFrom, monthTo, loading }: InsightsProps) {
  const data = useMemo(() => {
    const monthItems = transactions.filter(item => item.date.slice(0, 10) >= monthFrom && item.date.slice(0, 10) <= monthTo);
    const paid = totals(monthItems);
    const unpaid = monthItems.filter(item => item.type === "expense" && !item.is_paid);
    const unpaidValue = unpaid.reduce((sum, item) => sum + Number(item.amount), 0);
    const byCategory = new Map<string, number>();
    for (const item of monthItems) {
      if (item.type !== "expense" || !item.is_paid) continue;
      const name = item.category?.name || "Sem categoria";
      byCategory.set(name, (byCategory.get(name) || 0) + Number(item.amount));
    }
    const largest = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    const today = new Date();
    const nextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
    const start = dateKey(today);
    const end = dateKey(nextWeek);
    const upcoming = transactions
      .filter(item => item.type === "expense" && !item.is_paid && item.date.slice(0, 10) >= start && item.date.slice(0, 10) <= end)
      .sort((a, b) => a.date.localeCompare(b.date));

    let message = "Seu resumo fica mais completo conforme você registra movimentações.";
    if (monthItems.length > 0 && unpaid.length > 0) {
      message = "Existem despesas ainda não confirmadas neste mês. Revise os registros para manter o planejamento em dia.";
    } else if (monthItems.length > 0 && paid.expense > paid.income) {
      message = "As despesas confirmadas superaram as receitas neste mês. Confira os gastos por categoria abaixo.";
    } else if (monthItems.length > 0 && paid.income > 0) {
      message = "Seus lançamentos confirmados estão organizados. Continue acompanhando a evolução mensal.";
    }
    return { paid, unpaidValue, unpaidCount: unpaid.length, largest, upcoming, message };
  }, [transactions, monthFrom, monthTo]);

  return <section className="insights-section" aria-labelledby="insights-heading">
    <div className="insights-heading">
      <div><span className="eyebrow">VISÃO INTELIGENTE</span><h2 id="insights-heading">O que merece atenção</h2><p>Informações calculadas com seus lançamentos existentes.</p></div>
      <Link href="/avisos" className="text-link">Ver avisos <ArrowRight size={15} /></Link>
    </div>
    <div className="insights-grid">
      <article className="insights-card">
        <div className="insights-icon" aria-hidden="true"><CircleAlert size={19} /></div>
        <span className="insights-label">Despesas em aberto no mês</span>
        {loading ? <div className="insights-loading" aria-label="Carregando" /> : <>
          <strong className="insights-value">{formatCurrency(data.unpaidValue)}</strong>
          <span className="insights-detail">{data.unpaidCount === 1 ? "1 lançamento pendente" : data.unpaidCount + " lançamentos pendentes"}</span>
        </>}
      </article>
      <article className="insights-card">
        <div className="insights-icon" aria-hidden="true"><PieChart size={19} /></div>
        <span className="insights-label">Maior categoria de despesas pagas</span>
        {loading ? <div className="insights-loading" aria-label="Carregando" /> : <>
          <strong className="insights-value insights-category-name">{data.largest?.[0] ?? "Sem despesas pagas"}</strong>
          <span className="insights-detail">{data.largest ? formatCurrency(data.largest[1]) + " no mês selecionado" : "Nenhum valor para comparar"}</span>
        </>}
      </article>
      <article className="insights-card insights-card-highlight">
        <div className="insights-icon" aria-hidden="true"><CalendarClock size={19} /></div>
        <span className="insights-label">Pendências dos próximos 7 dias</span>
        {loading ? <div className="insights-loading" aria-label="Carregando" /> : <>
          <strong className="insights-value">{data.upcoming.length}</strong>
          <span className="insights-detail">{data.upcoming.length ? "Despesas com data informada nesse período" : "Nenhuma despesa pendente próxima"}</span>
          {data.upcoming.length > 0 && <div className="insights-upcoming" aria-label="Próximas despesas pendentes">
            {data.upcoming.slice(0, 2).map(item => <div key={item.id}>
              <span title={item.description}>{item.description}</span><span>{item.date.slice(8, 10)}/{item.date.slice(5, 7)}</span>
            </div>)}
          </div>}
        </>}
      </article>
    </div>
    {!loading && <div className="insights-note" role="status">
      {data.unpaidCount > 0 || data.paid.expense > data.paid.income ? <Lightbulb size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
      <span>{data.message}</span>
    </div>}
  </section>;
}
