"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addMonths, subMonths } from "date-fns";
import { ArrowLeft, ArrowRight, CalendarDays, CircleDollarSign, Plus, Search, Wallet, X, PiggyBank, Target, SlidersHorizontal } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Bar, BarChart, Area, AreaChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { useFinanceData } from "@/hooks/use-finance-data";
import { formatCurrency, monthLabel, monthRange, totals } from "@/lib/utils/finance";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { TransactionRow } from "@/components/transactions/transaction-row";
import type { Transaction } from "@/types/finance";
import { SavingsWidgets } from "@/components/savings/savings-widgets";
import { PremiumSummary } from "@/components/dashboard/premium-summary";

export function Dashboard() {
  const { transactions, categories, loading, error, refresh } = useFinanceData();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [chartMonths, setChartMonths] = useState<6 | 12>(6);
  const [chartStyle, setChartStyle] = useState<"area" | "bars">("area");
  const [quickOpen, setQuickOpen] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [sections, setSections] = useState({ goals: true, charts: true, recent: true });
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("meusaldo-v7-dashboard-sections") || "{}");
      if (saved && typeof saved === "object") {
        setSections({ goals: saved.goals !== false, charts: saved.charts !== false, recent: saved.recent !== false });
      }
    } catch { /* keep defaults */ }
  }, []);
  function toggleSection(key: keyof typeof sections) {
    setSections(previous => {
      const next = { ...previous, [key]: !previous[key] };
      try { localStorage.setItem("meusaldo-v7-dashboard-sections", JSON.stringify(next)); } catch { /* private browsing */ }
      return next;
    });
  }


  const range = monthRange(selectedMonth);
  const monthTransactions = useMemo(() => transactions.filter((item) => item.date >= range.from && item.date <= range.to), [transactions, range.from, range.to]);
  const paidMonthTotals = useMemo(() => totals(monthTransactions), [monthTransactions]);
  const allTimeTotals = useMemo(() => totals(transactions), [transactions]);
  const previousMonthTotals = useMemo(() => {
    const previous = monthRange(subMonths(selectedMonth, 1));
    return totals(transactions.filter(item => item.date >= previous.from && item.date <= previous.to));
  }, [transactions, selectedMonth]);
  const expensesByCategory = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();
    monthTransactions.filter((item) => item.type === "expense").forEach((item) => {
      const key = item.category_id;
      const current = map.get(key) ?? { name: item.category?.name ?? "Sem categoria", value: 0, color: item.category?.color ?? "#64748b" };
      current.value += Number(item.amount);
      map.set(key, current);
    });
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [monthTransactions]);
  const chartData = useMemo(() => Array.from({ length: chartMonths }, (_, index) => {
    const date = subMonths(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1), chartMonths - 1 - index);
    const key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    const items = transactions.filter(item => item.date.startsWith(key));
    return {
      month: date.toLocaleDateString("pt-BR", { month: "short" }),
      Receitas: items.filter(item => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0),
      Despesas: items.filter(item => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0)
    };
  }), [transactions, selectedMonth, chartMonths]);
  const recentTransactions = useMemo(() => transactions.filter((item) => {
    const matchesText = `${item.description} ${item.category?.name ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const matchesType = filter === "all" || item.type === filter;
    return matchesText && matchesType;
  }).slice(0, 6), [transactions, search, filter]);

  function changeMonth(direction: number) {
    setSelectedMonth((current) => direction < 0 ? subMonths(current, 1) : addMonths(current, 1));
  }
  function editTransaction(item: Transaction) { setEditing(item); setDialogOpen(true); }
  async function deleteTransaction(item: Transaction) {
    if (!window.confirm(`Excluir a transação "${item.description}"? Essa ação não pode ser desfeita.`)) return;
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("transactions").delete().eq("id", item.id);
    if (deleteError) toast.error(deleteError.message); else { toast.success("Transação excluída."); refresh(); }
  }

  const title = monthLabel(selectedMonth);
  return <div className="dashboard-page">
    <div className="page-heading dashboard-heading"><div><span className="eyebrow">SEU RESUMO FINANCEIRO</span><h1>Visão geral</h1><p>Acompanhe suas movimentações e mantenha tudo em equilíbrio.</p></div><button className="button button-primary add-transaction-button" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus size={18} /> Nova transação</button></div>
    {error && <div className="inline-error">{error}</div>}
    <div className="month-toolbar"><div className="month-label"><CalendarDays size={17} /><strong>{title}</strong></div><div className="month-controls"><button className="icon-button" onClick={() => changeMonth(-1)} aria-label="Mês anterior"><ArrowLeft size={17} /></button><button className="month-today" onClick={() => setSelectedMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Este mês</button><button className="icon-button" onClick={() => changeMonth(1)} aria-label="Próximo mês"><ArrowRight size={17} /></button></div></div>

    <PremiumSummary loading={loading} balance={allTimeTotals.balance}
      income={paidMonthTotals.income} expense={paidMonthTotals.expense}
      previousIncome={previousMonthTotals.income} previousExpense={previousMonthTotals.expense} />

    <div className="premium-section-controls">
      <div><span className="eyebrow">SEU ESPAÇO</span><h2>Painel personalizado</h2></div>
      <div className="premium-section-menu">
        <button type="button" className="button button-ghost" aria-expanded={showCustomizer}
          onClick={() => setShowCustomizer(value => !value)}>
          <SlidersHorizontal size={16} /> Personalizar painéis
        </button>
        {showCustomizer && <div className="premium-section-popover">
          {([
            ["goals", "Minhas metas"],
            ["charts", "Gráficos"],
            ["recent", "Últimas transações"]
          ] as const).map(([key, label]) => <label key={key} className="premium-section-option">
            <input type="checkbox" checked={sections[key]} onChange={() => toggleSection(key)} />
            <span>{label}</span>
          </label>)}
        </div>}
      </div>
    </div>
    {sections.goals && <SavingsWidgets />}

    {sections.charts && <section className="charts-grid">
      <article className="panel chart-panel"><div className="panel-heading"><div><h2>Despesas por categoria</h2><p>Gastos registrados no mês (inclui pendentes)</p></div><span className="panel-kicker">{title}</span></div>
        {expensesByCategory.length ? <div className="donut-layout"><div className="donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expensesByCategory} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="86%" paddingAngle={3} stroke="none">{expensesByCategory.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value) => formatCurrency(Number(value))} /></PieChart></ResponsiveContainer><div className="donut-center"><span>Total</span><strong>{formatCurrency(expensesByCategory.reduce((sum, item) => sum + item.value, 0))}</strong></div></div><div className="chart-legend">{expensesByCategory.slice(0, 6).map((item) => <div className="legend-item" key={item.name}><span className="legend-color" style={{ backgroundColor: item.color }} /><span>{item.name}</span><strong>{formatCurrency(item.value)}</strong></div>)}</div></div> : <div className="empty-chart"><div className="empty-icon"><CircleDollarSign size={25} /></div><strong>Nenhuma despesa neste mês</strong><span>Seus gastos por categoria aparecerão aqui.</span></div>}
      </article>
      <article className="panel chart-panel"><div className="panel-heading premium-chart-heading">
        <div><h2>Evolução financeira</h2><p>Valores registrados (inclui pendentes)</p></div>
        <div className="premium-chart-filters">
          <div className="premium-chart-switch" role="group" aria-label="Período">
            <button type="button" className={chartMonths === 6 ? "active" : ""} aria-pressed={chartMonths === 6} onClick={() => setChartMonths(6)}>6M</button>
            <button type="button" className={chartMonths === 12 ? "active" : ""} aria-pressed={chartMonths === 12} onClick={() => setChartMonths(12)}>12M</button>
          </div>
          <div className="premium-chart-switch" role="group" aria-label="Visualização">
            <button type="button" className={chartStyle === "area" ? "active" : ""} aria-pressed={chartStyle === "area"} onClick={() => setChartStyle("area")}>Linha</button>
            <button type="button" className={chartStyle === "bars" ? "active" : ""} aria-pressed={chartStyle === "bars"} onClick={() => setChartStyle("bars")}>Barras</button>
          </div>
        </div>
      </div>
        <div className="bar-chart-wrap" role="img" aria-label={"Gráfico de receitas e despesas dos últimos " + chartMonths + " meses"}>
          <ResponsiveContainer width="100%" height="100%">
            {chartStyle === "area" ? <AreaChart data={chartData} margin={{ top: 12, right: 4, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="v7-income" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--green)" stopOpacity={0.25} /><stop offset="95%" stopColor="var(--green)" stopOpacity={0} /></linearGradient>
                <linearGradient id="v7-expense" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--orange)" stopOpacity={0.20} /><stop offset="95%" stopColor="var(--orange)" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} interval="preserveStartEnd" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickFormatter={(value: number) => value >= 1000 ? (value / 1000).toFixed(1) + "k" : String(value)} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Area type="monotone" dataKey="Receitas" stroke="var(--green)" fill="url(#v7-income)" strokeWidth={2.5} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="Despesas" stroke="var(--orange)" fill="url(#v7-expense)" strokeWidth={2.5} activeDot={{ r: 5 }} />
            </AreaChart> : <BarChart data={chartData} margin={{ top: 8, right: 0, left: -18, bottom: 0 }} barGap={7}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} interval="preserveStartEnd" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickFormatter={(value: number) => value >= 1000 ? (value / 1000).toFixed(1) + "k" : String(value)} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar dataKey="Receitas" fill="var(--green)" radius={[5, 5, 0, 0]} maxBarSize={23} />
              <Bar dataKey="Despesas" fill="var(--orange)" radius={[5, 5, 0, 0]} maxBarSize={23} />
            </BarChart>}
          </ResponsiveContainer>
        </div>
      </article>
    </section>}


    {sections.recent && <section className="panel transactions-panel"><div className="panel-heading transaction-heading"><div><h2>Movimentações recentes</h2><p>Seus últimos lançamentos</p></div><a href="/transacoes" className="text-link">Ver todas <ArrowRight size={15} /></a></div>
      <div className="transaction-toolbar"><div className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar lançamento..." aria-label="Buscar lançamento" /></div><div className="filter-tabs"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todas</button><button className={filter === "income" ? "active" : ""} onClick={() => setFilter("income")}>Receitas</button><button className={filter === "expense" ? "active" : ""} onClick={() => setFilter("expense")}>Despesas</button></div></div>
      {loading ? <div className="loading-list"><span className="loading-line" /><span className="loading-line" /><span className="loading-line" /></div> : recentTransactions.length ? <div className="transaction-list">{recentTransactions.map((item) => <TransactionRow key={item.id} transaction={item} onEdit={() => editTransaction(item)} onDelete={() => void deleteTransaction(item)} />)}</div> : <div className="empty-state"><div className="empty-icon"><Wallet size={24} /></div><strong>Nenhuma movimentação encontrada</strong><span>Adicione sua primeira receita ou despesa para começar.</span><button className="button button-secondary" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus size={16} /> Adicionar transação</button></div>}
    </section>}
    <div className="premium-quick-actions">
      {quickOpen && <nav className="premium-quick-menu" aria-label="Ações rápidas">
        <button type="button" onClick={() => { setQuickOpen(false); setEditing(null); setDialogOpen(true); }}><Plus size={18} /> Nova transação</button>
        <Link href="/economias?registrar=1" onClick={() => setQuickOpen(false)}><PiggyBank size={18} /> Guardar dinheiro</Link>
        <Link href="/metas" onClick={() => setQuickOpen(false)}><Target size={18} /> Ver minhas metas</Link>
      </nav>}
      <button className="premium-quick-trigger" type="button" onClick={() => setQuickOpen(value => !value)}
        aria-label={quickOpen ? "Fechar ações rápidas" : "Abrir ações rápidas"} aria-expanded={quickOpen}>
        {quickOpen ? <X size={24} /> : <Plus size={24} />}
      </button>
    </div>
    <TransactionDialog open={dialogOpen} categories={categories} transaction={editing} onClose={() => { setDialogOpen(false); setEditing(null); }} onSaved={() => { void refresh(); }} />
  </div>;
}
