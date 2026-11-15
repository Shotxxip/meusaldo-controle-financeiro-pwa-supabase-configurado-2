"use client";

import { useMemo, useState } from "react";
import { addMonths, subMonths } from "date-fns";
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, CircleDollarSign, Plus, Search, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { useFinanceData } from "@/hooks/use-finance-data";
import { formatCurrency, getSixMonthLabels, monthLabel, monthRange, totals } from "@/lib/utils/finance";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { TransactionRow } from "@/components/transactions/transaction-row";
import type { Transaction } from "@/types/finance";
import { SavingsWidgets } from "@/components/savings/savings-widgets";

export function Dashboard() {
  const { transactions, categories, loading, error, refresh } = useFinanceData();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const range = monthRange(selectedMonth);
  const monthTransactions = useMemo(() => transactions.filter((item) => item.date >= range.from && item.date <= range.to), [transactions, range.from, range.to]);
  const paidMonthTotals = useMemo(() => totals(monthTransactions), [monthTransactions]);
  const allTimeTotals = useMemo(() => totals(transactions), [transactions]);
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
  const barData = useMemo(() => getSixMonthLabels(selectedMonth).map(({ key, label }) => {
    const items = transactions.filter((item) => item.date.startsWith(key));
    return { month: label, Receitas: items.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0), Despesas: items.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0) };
  }), [transactions, selectedMonth]);
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

    <section className="summary-grid">
      <article className="summary-card balance-card"><div className="summary-card-top"><span>Saldo atual</span><span className="summary-icon"><Wallet size={19} /></span></div><strong className="summary-value">{loading ? "••••••" : formatCurrency(allTimeTotals.balance)}</strong><div className="summary-foot"><span className="summary-foot-dot" />Saldo acumulado de lançamentos pagos</div></article>
      <article className="summary-card income-card"><div className="summary-card-top"><span>Receitas do mês</span><span className="summary-icon"><TrendingUp size={19} /></span></div><strong className="summary-value">{loading ? "••••••" : formatCurrency(paidMonthTotals.income)}</strong><div className="summary-foot"><ArrowDownLeft size={14} />Entradas confirmadas</div></article>
      <article className="summary-card expense-card"><div className="summary-card-top"><span>Despesas do mês</span><span className="summary-icon"><TrendingDown size={19} /></span></div><strong className="summary-value">{loading ? "••••••" : formatCurrency(paidMonthTotals.expense)}</strong><div className="summary-foot"><ArrowUpRight size={14} />Saídas confirmadas</div></article>
    </section>

    <SavingsWidgets />

    <section className="charts-grid">
      <article className="panel chart-panel"><div className="panel-heading"><div><h2>Despesas por categoria</h2><p>Distribuição dos gastos no período</p></div><span className="panel-kicker">{title}</span></div>
        {expensesByCategory.length ? <div className="donut-layout"><div className="donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expensesByCategory} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="86%" paddingAngle={3} stroke="none">{expensesByCategory.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value) => formatCurrency(Number(value))} /></PieChart></ResponsiveContainer><div className="donut-center"><span>Total</span><strong>{formatCurrency(expensesByCategory.reduce((sum, item) => sum + item.value, 0))}</strong></div></div><div className="chart-legend">{expensesByCategory.slice(0, 6).map((item) => <div className="legend-item" key={item.name}><span className="legend-color" style={{ backgroundColor: item.color }} /><span>{item.name}</span><strong>{formatCurrency(item.value)}</strong></div>)}</div></div> : <div className="empty-chart"><div className="empty-icon"><CircleDollarSign size={25} /></div><strong>Nenhuma despesa neste mês</strong><span>Seus gastos por categoria aparecerão aqui.</span></div>}
      </article>
      <article className="panel chart-panel"><div className="panel-heading"><div><h2>Receitas x despesas</h2><p>Comparativo dos últimos 6 meses</p></div><span className="panel-kicker">6 MESES</span></div>
        <div className="bar-chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={barData} margin={{ top: 8, right: 0, left: -18, bottom: 0 }} barGap={7}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickFormatter={(value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)} /><Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} /><Bar dataKey="Receitas" fill="#16a34a" radius={[5, 5, 0, 0]} maxBarSize={22} /><Bar dataKey="Despesas" fill="#f97316" radius={[5, 5, 0, 0]} maxBarSize={22} /></BarChart></ResponsiveContainer></div>
      </article>
    </section>

    <section className="panel transactions-panel"><div className="panel-heading transaction-heading"><div><h2>Movimentações recentes</h2><p>Seus últimos lançamentos</p></div><a href="/transacoes" className="text-link">Ver todas <ArrowRight size={15} /></a></div>
      <div className="transaction-toolbar"><div className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar lançamento..." aria-label="Buscar lançamento" /></div><div className="filter-tabs"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todas</button><button className={filter === "income" ? "active" : ""} onClick={() => setFilter("income")}>Receitas</button><button className={filter === "expense" ? "active" : ""} onClick={() => setFilter("expense")}>Despesas</button></div></div>
      {loading ? <div className="loading-list"><span className="loading-line" /><span className="loading-line" /><span className="loading-line" /></div> : recentTransactions.length ? <div className="transaction-list">{recentTransactions.map((item) => <TransactionRow key={item.id} transaction={item} onEdit={() => editTransaction(item)} onDelete={() => void deleteTransaction(item)} />)}</div> : <div className="empty-state"><div className="empty-icon"><Wallet size={24} /></div><strong>Nenhuma movimentação encontrada</strong><span>Adicione sua primeira receita ou despesa para começar.</span><button className="button button-secondary" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus size={16} /> Adicionar transação</button></div>}
    </section>
    <button className="mobile-fab" onClick={() => { setEditing(null); setDialogOpen(true); }} aria-label="Nova transação"><Plus size={24} /></button>
    <TransactionDialog open={dialogOpen} categories={categories} transaction={editing} onClose={() => { setDialogOpen(false); setEditing(null); }} onSaved={() => { void refresh(); }} />
  </div>;
}
