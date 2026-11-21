"use client";

import { useEffect, useMemo, useState } from "react";
import { useFinanceData } from "@/hooks/use-finance-data";
import { formatCurrency } from "@/lib/utils/finance";

type Recurring = { id: string; title: string; amount: number; day: number; categoryId: string; enabled: boolean };
const KEY = "meusaldo-v6-recurring";
const nowMonth = () => new Date().toLocaleDateString("en-CA").slice(0, 7);
function dateOf(month: string, day: number) {
  const [year, num] = month.split("-").map(Number);
  const max = new Date(year, num, 0).getDate();
  return new Date(year, num - 1, Math.min(day, max), 12);
}
export default function RecorrentesPage() {
  const { categories, transactions, loading, error } = useFinanceData();
  const [items, setItems] = useState<Recurring[]>([]);
  const [month, setMonth] = useState(nowMonth);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("10");
  const [categoryId, setCategoryId] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      const data: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(data)) setItems(data.filter(x => x && typeof x.id === "string" && typeof x.title === "string" && Number.isFinite(x.amount)));
    } catch { setItems([]); }
  }, []);
  function persist(next: Recurring[]) {
    setItems(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); setSaved(true); }
    catch { setSaved(false); }
  }
  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!title.trim() || !Number.isFinite(value) || value <= 0 || !categoryId) return;
    persist([...items, { id: crypto.randomUUID(), title: title.trim().slice(0, 80), amount: value, day: Number(day), categoryId, enabled: true }]);
    setTitle(""); setAmount("");
  }
  const schedule = useMemo(() => items.filter(x => x.enabled).map(x => {
    const due = dateOf(month, x.day);
    // A monthly item is considered matched only when its category, amount and month line up.
    const matched = transactions.some(t => t.type === "expense" && t.category_id === x.categoryId && t.date.slice(0, 7) === month && Math.abs(Number(t.amount) - x.amount) < .01 && t.description.toLocaleLowerCase() === x.title.toLocaleLowerCase());
    return { ...x, due, matched };
  }).sort((a,b) => a.due.getTime() - b.due.getTime()), [items, month, transactions]);
  const sum = schedule.reduce((acc, x) => acc + x.amount, 0);
  return <div className="content-page">
    <div className="page-heading"><div><span className="eyebrow">PLANEJAMENTO</span><h1>Contas recorrentes</h1><p>Organize despesas que se repetem todos os meses.</p></div></div>
    <section className="panel" style={{ padding: 22, marginBottom: 20 }}>
      <h2>Adicionar conta fixa</h2>
      <form onSubmit={add} style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", alignItems: "end" }}>
        <label className="field"><span>Descrição</span><input className="text-input" required maxLength={80} placeholder="Ex.: Internet" value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label className="field"><span>Valor (R$)</span><input className="text-input" required type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <label className="field"><span>Dia do mês</span><input className="text-input" type="number" min="1" max="31" required value={day} onChange={e => setDay(e.target.value)} /></label>
        <label className="field"><span>Categoria</span><select className="text-input" required value={categoryId} onChange={e => setCategoryId(e.target.value)}><option value="">Selecione</option>{categories.filter(x => x.type === "expense").map(x => <option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
        <button className="button button-primary" type="submit">Adicionar</button>
      </form>
      <p className="field-hint" style={{ marginTop: 12 }}>Estas contas são lembretes salvos apenas neste dispositivo. Não geram nem alteram transações automaticamente.</p>
      {saved && <p role="status" style={{ color: "var(--green)" }}>Lista salva neste dispositivo.</p>}
    </section>
    <section className="panel" style={{ padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "center" }}><h2>Previsão do mês: {formatCurrency(sum)}</h2><input aria-label="Mês de referência" type="month" className="text-input" style={{ maxWidth: 190 }} value={month} onChange={e => setMonth(e.target.value)} /></div>
      {error && <p className="inline-error">{error}</p>}
      {loading ? <p>Carregando...</p> : schedule.map(x => <div key={x.id} style={{ padding: "15px 0", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div><strong>{x.title}</strong><p style={{ color: "var(--muted-foreground)", margin: "5px 0" }}>Dia {x.due.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · {x.matched ? "Lançamento correspondente encontrado" : "Sem lançamento correspondente"}</p></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><strong>{formatCurrency(x.amount)}</strong><button type="button" className="button button-ghost button-small" onClick={() => persist(items.filter(y => y.id !== x.id))}>Excluir</button></div>
      </div>)}
      {!schedule.length && <p>Você ainda não cadastrou contas recorrentes.</p>}
    </section>
  </div>;
}
