"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Plus, Search, SlidersHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useFinanceData } from "@/hooks/use-finance-data";
import { formatCurrency, formatDate, monthLabel } from "@/lib/utils/finance";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import type { Transaction } from "@/types/finance";

export function TransactionsPage() {
  const { transactions, categories, loading, error, refresh } = useFinanceData();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const months = useMemo(() => [...new Set(transactions.map((item) => item.date.slice(0, 7)))].sort((a, b) => b.localeCompare(a)), [transactions]);
  const filtered = useMemo(() => transactions.filter((item) => {
    const query = search.toLowerCase();
    const matchesSearch = `${item.description} ${item.category?.name ?? ""}`.toLowerCase().includes(query);
    return matchesSearch && (typeFilter === "all" || item.type === typeFilter) && (statusFilter === "all" || (statusFilter === "paid" ? item.is_paid : !item.is_paid)) && (monthFilter === "all" || item.date.startsWith(monthFilter));
  }), [transactions, search, typeFilter, statusFilter, monthFilter]);

  function openEdit(item: Transaction) { setEditing(item); setDialogOpen(true); }
  async function deleteItem(item: Transaction) {
    if (!window.confirm(`Excluir "${item.description}"? Essa ação não pode ser desfeita.`)) return;
    const { createClient } = await import("@/lib/supabase/client");
    const { error: deleteError } = await createClient().from("transactions").delete().eq("id", item.id);
    if (deleteError) toast.error(deleteError.message); else { toast.success("Transação excluída."); refresh(); }
  }

  const total = filtered.reduce((sum, item) => sum + (item.type === "income" ? Number(item.amount) : -Number(item.amount)), 0);
  return <div className="content-page">
    <div className="page-heading"><div><span className="eyebrow">ENTRADAS E SAÍDAS</span><h1>Transações</h1><p>Consulte e organize todas as suas movimentações.</p></div><button className="button button-primary add-transaction-button" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus size={18} /> Nova transação</button></div>
    {error && <div className="inline-error">{error}</div>}
    <section className="panel transactions-manager">
      <div className="manager-topline"><div><span className="manager-label">RESULTADO DO FILTRO</span><strong>{formatCurrency(total)}</strong><small>{filtered.length} {filtered.length === 1 ? "lançamento" : "lançamentos"}</small></div><div className="filter-icon-label"><SlidersHorizontal size={17} /> Filtros</div></div>
      <div className="manager-filters"><div className="search-field manager-search"><Search size={17} /><input placeholder="Buscar por descrição ou categoria..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <select className="filter-select" aria-label="Filtrar tipo" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">Todos os tipos</option><option value="income">Receitas</option><option value="expense">Despesas</option></select>
        <select className="filter-select" aria-label="Filtrar status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos os status</option><option value="paid">Pagos/recebidos</option><option value="pending">Pendentes</option></select>
        <select className="filter-select" aria-label="Filtrar mês" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}><option value="all">Todos os meses</option>{months.map((month) => { const [year, monthNumber] = month.split("-").map(Number); const label = monthLabel(new Date(year, monthNumber - 1, 1)); return <option value={month} key={month}>{label}</option>; })}</select>
      </div>
      {loading ? <div className="loading-list"><span className="loading-line" /><span className="loading-line" /><span className="loading-line" /></div> : filtered.length ? <>
        <div className="desktop-table-wrap"><table className="data-table"><thead><tr><th>DESCRIÇÃO</th><th>DATA</th><th>CATEGORIA</th><th>TIPO</th><th>STATUS</th><th className="align-right">VALOR</th><th>AÇÕES</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><strong className="table-description">{item.description}</strong></td><td>{formatDate(item.date)}</td><td><span className="table-category"><i style={{ background: item.category?.color ?? "#64748b" }} />{item.category?.name ?? "Sem categoria"}</span></td><td><span className={`type-text ${item.type}`}>{item.type === "income" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}{item.type === "income" ? "Receita" : "Despesa"}</span></td><td><span className={`status-pill ${item.is_paid ? "paid" : "pending"}`}>{item.is_paid ? "Pago" : "Pendente"}</span></td><td className={`align-right table-value ${item.type === "income" ? "income-text" : "expense-text"}`}>{item.type === "income" ? "+" : "−"}{formatCurrency(Number(item.amount))}</td><td><div className="table-actions"><button className="icon-button row-action" onClick={() => openEdit(item)} aria-label="Editar"><span className="sr-only">Editar</span><Pencil size={15} /></button><button className="icon-button row-action delete-action" onClick={() => void deleteItem(item)} aria-label="Excluir"><span className="sr-only">Excluir</span><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>
        <div className="mobile-transaction-list">{filtered.map((item) => <div className="mobile-transaction-card" key={item.id}><div className="mobile-card-top"><div className="mobile-card-description"><strong>{item.description}</strong><span>{item.category?.name ?? "Sem categoria"} · {formatDate(item.date)}</span></div><strong className={`mobile-card-value ${item.type === "income" ? "income-text" : "expense-text"}`}>{item.type === "income" ? "+" : "−"}{formatCurrency(Number(item.amount))}</strong></div><div className="mobile-card-bottom"><span className={`status-pill ${item.is_paid ? "paid" : "pending"}`}>{item.is_paid ? "Pago" : "Pendente"}</span><div className="table-actions"><button className="button button-small button-ghost" onClick={() => openEdit(item)}>Editar</button><button className="button button-small button-danger-ghost" onClick={() => void deleteItem(item)}>Excluir</button></div></div></div>)}</div>
      </> : <div className="empty-state"><div className="empty-icon"><CalendarDays size={24} /></div><strong>Nenhuma transação encontrada</strong><span>Experimente alterar os filtros ou adicionar um novo lançamento.</span><button className="button button-secondary" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus size={16} /> Nova transação</button></div>}
    </section>
    <button className="mobile-fab" onClick={() => { setEditing(null); setDialogOpen(true); }} aria-label="Nova transação"><Plus size={24} /></button>
    <TransactionDialog open={dialogOpen} categories={categories} transaction={editing} onClose={() => { setDialogOpen(false); setEditing(null); }} onSaved={() => { void refresh(); }} />
  </div>;
}
