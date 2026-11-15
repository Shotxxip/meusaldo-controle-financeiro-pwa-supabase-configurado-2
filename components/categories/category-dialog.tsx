"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Category, TransactionType } from "@/types/finance";

const colors = ["#7c3aed", "#0d9488", "#16a34a", "#f97316", "#0ea5e9", "#ec4899", "#ef4444", "#64748b", "#ca8a04", "#2563eb"];
const icons = ["wallet", "briefcase-business", "trending-up", "utensils", "bus", "house", "gamepad-2", "heart-pulse", "shopping-bag", "book-open", "car", "coffee"];

export function CategoryDialog({ open, category, onClose, onSaved }: { open: boolean; category?: Category | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [color, setColor] = useState(colors[0]);
  const [icon, setIcon] = useState(icons[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setType(category?.type ?? "expense");
    setColor(category?.color ?? colors[0]);
    setIcon(category?.icon ?? icons[0]);
  }, [open, category]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return toast.error("Informe o nome da categoria.");
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw authError ?? new Error("Sessão expirada.");
      const values = { name: name.trim(), type, color, icon };
      const result = category
        ? await supabase.from("categories").update(values).eq("id", category.id).eq("user_id", user.id)
        : await supabase.from("categories").insert({ ...values, user_id: user.id });
      if (result.error) throw result.error;
      toast.success(category ? "Categoria atualizada." : "Categoria criada.");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? (error.message.includes("categories_user_name_type_unique") ? "Você já possui uma categoria com esse nome e tipo." : error.message) : "Não foi possível salvar a categoria.");
    } finally { setSaving(false); }
  }

  if (!open) return null;
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}><section className="modal-card category-modal" role="dialog" aria-modal="true" aria-labelledby="category-title">
    <header className="modal-header"><div><span className="eyebrow">ORGANIZAÇÃO</span><h2 id="category-title">{category ? "Editar categoria" : "Nova categoria"}</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar" disabled={saving}><X size={19} /></button></header>
    <form className="modal-form" onSubmit={submit}>
      <div className="field"><label htmlFor="category-name">Nome</label><input className="text-input" id="category-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Academia" maxLength={40} required autoFocus /></div>
      <div className="field"><label>Tipo</label><div className="type-switch"><button type="button" className={type === "expense" ? "selected expense-selected" : ""} onClick={() => setType("expense")}>Despesa</button><button type="button" className={type === "income" ? "selected income-selected" : ""} onClick={() => setType("income")}>Receita</button></div></div>
      <div className="field"><label>Cor</label><div className="color-picker">{colors.map((option) => <button key={option} type="button" className={`color-swatch ${color === option ? "chosen" : ""}`} style={{ backgroundColor: option }} onClick={() => setColor(option)} aria-label={`Selecionar cor ${option}`} aria-pressed={color === option} />)}</div></div>
      <div className="field"><label htmlFor="category-icon">Ícone</label><select className="text-input" id="category-icon" value={icon} onChange={(event) => setIcon(event.target.value)}>{icons.map((option) => <option key={option} value={option}>{option.replaceAll("-", " ")}</option>)}</select></div>
      <div className="modal-actions"><button type="button" className="button button-ghost" onClick={onClose} disabled={saving}>Cancelar</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle size={17} className="spin" /> : <Check size={17} />}{category ? "Salvar alterações" : "Criar categoria"}</button></div>
    </form>
  </section></div>;
}
