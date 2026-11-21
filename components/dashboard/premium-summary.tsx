"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Eye, EyeOff, ShieldCheck, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils/finance";

type Props = {
  loading: boolean;
  balance: number;
  income: number;
  expense: number;
  previousIncome: number;
  previousExpense: number;
};

function ChangeIndicator({ current, previous, positiveIsGood }: { current: number; previous: number; positiveIsGood: boolean }) {
  if (previous <= 0) return <span className="premium-trend-neutral">Sem comparativo no mês anterior</span>;
  const change = ((current - previous) / previous) * 100;
  const up = change > 0;
  const good = up === positiveIsGood;
  return <span className={Math.abs(change) < .05 ? "premium-trend-neutral" : good ? "premium-trend-good" : "premium-trend-alert"}>
    {Math.abs(change) < .05 ? "Estável" : `${up ? "+" : "−"}${Math.abs(change).toFixed(1)}%`} <span>vs. mês anterior</span>
  </span>;
}

export function PremiumSummary({ loading, balance, income, expense, previousIncome, previousExpense }: Props) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try { setHidden(localStorage.getItem("meusaldo-v7-hide-balance") === "true"); }
    catch { /* preference unavailable */ }
  }, []);
  function togglePrivacy() {
    setHidden(value => {
      try { localStorage.setItem("meusaldo-v7-hide-balance", String(!value)); } catch { /* preference unavailable */ }
      return !value;
    });
  }
  const display = (value: number) => loading ? <span className="premium-value-skeleton" aria-label="Carregando valor" /> : hidden ? "R$ ••••••" : formatCurrency(value);
  return <section className="premium-summary-grid" aria-label="Resumo financeiro">
    <article className="premium-balance-card">
      <div className="premium-balance-head">
        <span className="premium-balance-label"><Wallet size={17} /> Saldo atual</span>
        <button className="premium-privacy-button" type="button" onClick={togglePrivacy}
          aria-label={hidden ? "Mostrar valores financeiros" : "Ocultar valores financeiros"}
          aria-pressed={hidden} title={hidden ? "Mostrar valores" : "Ocultar valores"}>
          {hidden ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
      <strong className="premium-balance-value" aria-live="polite">{display(balance)}</strong>
      <div className="premium-balance-foot"><ShieldCheck size={15} /> Saldo acumulado de lançamentos pagos</div>
      <div className="premium-balance-decoration" aria-hidden="true" />
    </article>
    <article className="premium-metric-card">
      <div className="premium-metric-top"><span>Receitas do mês</span><span className="premium-metric-icon positive"><TrendingUp size={20} /></span></div>
      <strong>{display(income)}</strong>
      <div className="premium-metric-foot"><ArrowDownLeft size={16} /><ChangeIndicator current={income} previous={previousIncome} positiveIsGood /></div>
    </article>
    <article className="premium-metric-card">
      <div className="premium-metric-top"><span>Despesas do mês</span><span className="premium-metric-icon negative"><TrendingDown size={20} /></span></div>
      <strong>{display(expense)}</strong>
      <div className="premium-metric-foot"><ArrowUpRight size={16} /><ChangeIndicator current={expense} previous={previousExpense} positiveIsGood={false} /></div>
    </article>
  </section>;
}
