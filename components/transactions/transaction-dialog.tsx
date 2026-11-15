"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { maskCurrencyInput, parseCurrencyInput, toDateInput } from "@/lib/utils/finance";
import type { Category, Transaction, TransactionInput, TransactionType } from "@/types/finance";

interface Props {
  open: boolean;
  categories: Category[];
  transaction?: Transaction | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TransactionDialog({ open, categories, transaction, onClose, onSaved }: Props) {
  const [type, setType] = useState<TransactionType>("expense");
  const [description, setDescription] = useState("");
  const [amountText, setAmountText] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(toDateInput());
  const [isPaid, setIsPaid] = useState(true);
  const [saving, setSaving] = useState(false);
  const availableCategories = useMemo(() => categories.filter((category) => category.type === type), [categories, type]);

  useEffect(() => {
    if (!open) return;
    const nextType = transaction?.type ?? "expense";
    setType(nextType);
    setDescription(transaction?.description ?? "");
    setAmountText(transaction ? Number(transaction.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "");
    setCategoryId(transaction?.category_id ?? categories.find((category) => category.type === nextType)?.id ?? "");
    setDate(transaction?.date?.slice(0, 10) ?? toDateInput());
    setIsPaid(transaction?.is_paid ?? true);
  }, [open, transaction, categories]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !saving) onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, saving]);

  function changeType(value: TransactionType) {
    setType(value);
    setCategoryId(categories.find((category) => category.type === value)?.id ?? "");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = parseCurrencyInput(amountText);
    if (!description.trim()) return toast.error("Informe uma descrição.");
    if (amount <= 0) return toast.error("Informe um valor maior que zero.");
    if (!categoryId) return toast.error("Crie ou selecione uma categoria para este tipo.");
    const payload: TransactionInput = { description: description.trim(), amount, type, category_id: categoryId, date, is_paid: isPaid };
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError ?? new Error("Sessão expirada. Entre novamente.");
      const result = transaction
        ? await supabase.from("transactions").update(payload).eq("id", transaction.id).eq("user_id", user.id)
        : await supabase.from("transactions").insert({ ...payload, user_id: user.id });
      if (result.error) throw result.error;
      toast.success(transaction ? "Transação atualizada." : "Transação adicionada.");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a transação.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <section className="modal-card transaction-modal" role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title">
      <header className="modal-header"><div><span className="eyebrow">MOVIMENTAÇÃO FINANCEIRA</span><h2 id="transaction-modal-title">{transaction ? "Editar transação" : "Nova transação"}</h2></div><button className="icon-button" onClick={onClose} disabled={saving} aria-label="Fechar"><X size={19} /></button></header>
      <form onSubmit={handleSubmit} className="modal-form">
        <div className="type-switch" role="group" aria-label="Tipo da transação"><button type="button" className={type === "expense" ? "selected expense-selected" : ""} onClick={() => changeType("expense")}>Despesa</button><button type="button" className={type === "income" ? "selected income-selected" : ""} onClick={() => changeType("income")}>Receita</button></div>
        <div className="field"><label htmlFor="transaction-description">Descrição</label><input id="transaction-description" className="text-input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: Compra no mercado" maxLength={120} required autoFocus /></div>
        <div className="form-grid"><div className="field"><label htmlFor="transaction-amount">Valor</label><div className="money-input"><span>R$</span><input id="transaction-amount" inputMode="decimal" value={amountText} onChange={(event) => setAmountText(maskCurrencyInput(event.target.value))} placeholder="0,00" required /></div></div>
        <div className="field"><label htmlFor="transaction-date">Data</label><div className="input-icon-wrap"><CalendarDays size={17} /><input id="transaction-date" className="text-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></div></div></div>
        <div className="field"><label htmlFor="transaction-category">Categoria</label><select id="transaction-category" className="text-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required><option value="">Selecione uma categoria</option>{availableCategories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select>{availableCategories.length === 0 && <small className="field-hint">Não há categorias deste tipo. Cadastre uma em Categorias.</small>}</div>
        <label className="paid-toggle"><span><strong>Status do lançamento</strong><small>{isPaid ? "Este valor já foi recebido/pago" : "Este valor ainda está pendente"}</small></span><button type="button" role="switch" aria-checked={isPaid} className={`switch ${isPaid ? "on" : ""}`} onClick={() => setIsPaid((value) => !value)}><span /></button></label>
        <div className="modal-actions"><button type="button" className="button button-ghost" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="button button-primary" disabled={saving || availableCategories.length === 0}>{saving ? <LoaderCircle size={17} className="spin" /> : <Check size={17} />}{transaction ? "Salvar alterações" : "Adicionar transação"}</button></div>
      </form>
    </section>
  </div>;
}
