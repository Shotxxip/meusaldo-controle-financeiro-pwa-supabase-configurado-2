"use client";

import { useMemo, useState } from "react";
import { SavingsCelebration, celebrateSaving, celebrateMilestone } from "@/components/savings/savings-celebration";
import Link from "next/link";
import { ArrowRight, Check, PiggyBank, Plus, Target, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/finance";
import { useSavingsData } from "@/hooks/use-savings-data";
import type { GoalItem } from "@/types/goals";
import type { GoalAllocation } from "@/types/savings";

const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const parseMoney = (value: string) => {
  const clean = value.trim().replace(/\s/g, "");
  return Number(clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean);
};
const percent = (part: number, total: number) => total > 0 ? Math.min(100, Math.max(0, part / total * 100)) : 0;

function Progress({ value, label }: { value: number; label: string }) {
  return <div className="savings-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}><span style={{ width: `${value}%` }} /></div>;
}

function GoalCard({ goal, allocated, onAllocate }: { goal: GoalItem; allocated: number; onAllocate: () => void }) {
  const total = money(Number(goal.price) * Number(goal.quantity));
  const missing = Math.max(0, money(total - allocated));
  const progress = percent(allocated, total);
  return <article className="panel savings-goal-card">
    <div className="savings-goal-head">
      {goal.image_url ? <img src={goal.image_url} alt={goal.title} className="savings-goal-image" loading="lazy" referrerPolicy="no-referrer" /> : <div className="savings-goal-image savings-goal-fallback"><Target size={24} /></div>}
      <div className="savings-goal-title"><strong title={goal.title}>{goal.title}</strong><span>{goal.quantity} unidade(s) · {formatCurrency(total)}</span></div>
      {goal.is_purchased && <span className="savings-purchased"><Check size={13} /> Comprado</span>}
    </div>
    <div className="savings-goal-row"><span>Alocado: <strong>{formatCurrency(allocated)}</strong></span><strong>{progress.toFixed(0)}%</strong></div>
    <Progress value={progress} label={`Progresso de ${goal.title}`} />
    <div className="savings-goal-foot"><span>Falta Guardar: <strong>{formatCurrency(missing)}</strong></span><button type="button" className="button button-secondary" onClick={onAllocate} disabled={goal.is_purchased || missing <= 0}>Alocar Economias</button></div>
  </article>;
}

export function SavingsWidgets({ full = false }: { full?: boolean }) {
  const { goals, entries, allocations, userId, loading, error, refresh } = useSavingsData();
  const [goalToAllocate, setGoalToAllocate] = useState<GoalItem | null>(null);
  const [allocationAmount, setAllocationAmount] = useState("");
  const [savingAmount, setSavingAmount] = useState("");
  const [savingDescription, setSavingDescription] = useState("");
  const [savingDate, setSavingDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [savingOpen, setSavingOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [celebration, setCelebration] = useState<{ id: number; message: string } | null>(null);
  const showCelebration = (message: string) => setCelebration({ id: Date.now(), message });
  const totalSaved = useMemo(() => money(entries.reduce((sum, entry) => sum + Number(entry.amount), 0)), [entries]);
  const totalAllocated = useMemo(() => money(allocations.reduce((sum, item) => sum + Number(item.amount), 0)), [allocations]);
  const available = Math.max(0, money(totalSaved - totalAllocated));
  const activeGoals = goals.filter((goal) => !goal.is_purchased);
  const totalTarget = money(activeGoals.reduce((sum, goal) => sum + Number(goal.price) * Number(goal.quantity), 0));
  const coverage = percent(totalSaved, totalTarget);
  const allocatedByGoal = useMemo(() => {
    const map = new Map<string, number>();
    for (const allocation of allocations) map.set(allocation.goal_item_id, money((map.get(allocation.goal_item_id) ?? 0) + Number(allocation.amount)));
    return map;
  }, [allocations]);

  async function addSaving(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = money(parseMoney(savingAmount));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 99999999.99 || !savingDate) { toast.error("Informe uma data e um valor positivo válido."); return; }
    if (!userId) { toast.error("Faça login novamente."); return; }
    setSubmitting(true);
    try {
      const { error: insertError } = await createClient().from("savings_entries").insert({ user_id: userId, amount, description: savingDescription.trim() || null, date: new Date(`${savingDate}T12:00:00`).toISOString() });
      if (insertError) throw insertError;
      toast.success("Economia registrada."); showCelebration(celebrateSaving(amount)); setSavingOpen(false); setSavingAmount(""); setSavingDescription(""); await refresh();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Erro ao registrar economia."); }
    finally { setSubmitting(false); }
  }

  async function addAllocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!goalToAllocate || !userId) return;
    const amount = money(parseMoney(allocationAmount));
    const remaining = money(Number(goalToAllocate.price) * Number(goalToAllocate.quantity) - (allocatedByGoal.get(goalToAllocate.id) ?? 0));
    if (!Number.isFinite(amount) || amount <= 0 || amount > available || amount > remaining) { toast.error("Valor inválido ou superior ao disponível/necessário."); return; }
    setSubmitting(true);
    try {
      const { error: insertError } = await createClient().from("goal_allocations").insert({ user_id: userId, goal_item_id: goalToAllocate.id, amount });
      if (insertError) throw insertError;
      const previous = percent(allocatedByGoal.get(goalToAllocate.id) ?? 0, Number(goalToAllocate.price) * Number(goalToAllocate.quantity));
      const next = percent((allocatedByGoal.get(goalToAllocate.id) ?? 0) + amount, Number(goalToAllocate.price) * Number(goalToAllocate.quantity));
      const milestone = celebrateMilestone(previous, next, goalToAllocate.title);
      if (milestone) showCelebration(milestone);
      toast.success("Economias alocadas à meta."); setGoalToAllocate(null); setAllocationAmount(""); await refresh();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Não foi possível alocar."); }
    finally { setSubmitting(false); }
  }

  async function deleteSaving(id: string) {
    if (!window.confirm("Excluir este registro de economia? A exclusão não pode deixar alocações sem cobertura.")) return;
    const { error: deleteError } = await createClient().from("savings_entries").delete().eq("id", id).eq("user_id", userId);
    if (deleteError) toast.error(deleteError.message); else { toast.success("Registro excluído."); await refresh(); }
  }
  async function deleteAllocation(item: GoalAllocation) {
    if (!window.confirm("Desfazer esta alocação? O valor voltará a ficar disponível.")) return;
    const { error: deleteError } = await createClient().from("goal_allocations").delete().eq("id", item.id).eq("user_id", userId);
    if (deleteError) toast.error(deleteError.message); else { toast.success("Alocação desfeita."); await refresh(); }
  }

  return <div className="savings-section"><SavingsCelebration celebration={celebration} onClose={() => setCelebration(null)} />
    {full && <div className="page-heading"><div><span className="eyebrow">SEU PLANEJAMENTO FINANCEIRO</span><h1>Gerenciamento de Economias</h1><p>Registre dinheiro guardado e distribua entre suas metas.</p></div><button className="button button-primary" onClick={() => setSavingOpen(true)}><Plus size={17} /> Registrar economia</button></div>}
    {error && <div className="inline-error">{error}</div>}
    {full && <section className="savings-overview">
      <article className="summary-card income-card"><div className="summary-card-top"><span>Total Guardado</span><PiggyBank size={20} /></div><strong className="summary-value">{loading ? "Carregando..." : formatCurrency(totalSaved)}</strong><div className="summary-foot">Disponível para alocar: {formatCurrency(available)}</div><p className="savings-encouragement">Cada valor guardado é um passo para seus objetivos.</p></article>
      <article className="panel savings-coverage"><div className="panel-heading"><div><h2>Relatório de Cobertura</h2><p>Economias versus custo das metas ativas</p></div></div><strong className="savings-big-number">{coverage.toFixed(0)}%</strong><Progress value={coverage} label="Cobertura total das metas" /><div className="savings-coverage-detail"><span>Metas: {formatCurrency(totalTarget)}</span><strong>Falta cobrir: {formatCurrency(Math.max(0, money(totalTarget - totalSaved)))}</strong></div></article>
    </section>}
    <section className="savings-goals-section"><div className="panel-heading"><div><h2>{full ? "Alocação para Metas" : "Progresso das Metas"}</h2><p>{full ? "Distribua suas economias sem ultrapassar o saldo disponível." : "Veja quanto já foi reservado para cada objetivo."}</p></div>{!full && <Link href="/economias" className="text-link">Gerenciar economias <ArrowRight size={15} /></Link>}</div>
      {loading ? <p className="savings-muted">Carregando metas e economias...</p> : activeGoals.length ? <div className="savings-goals-grid">{activeGoals.map((goal) => <GoalCard key={goal.id} goal={goal} allocated={allocatedByGoal.get(goal.id) ?? 0} onAllocate={() => { setAllocationAmount(""); setGoalToAllocate(goal); }} />)}</div> : <div className="panel savings-empty">Nenhuma meta cadastrada. <Link href="/metas" className="text-link">Criar uma meta <ArrowRight size={14} /></Link></div>}
    </section>
    {full && <section className="panel savings-movements"><div className="panel-heading"><div><h2>Movimentações de Economia</h2><p>Últimos registros de dinheiro guardado</p></div><button className="button button-secondary" onClick={() => setSavingOpen(true)}><Plus size={15} /> Nova entrada</button></div>
      {entries.length ? <div className="savings-list">{entries.slice(0, 15).map((entry) => <div className="savings-list-item" key={entry.id}><div><strong>{entry.description || "Dinheiro guardado"}</strong><span>{new Date(entry.date).toLocaleDateString("pt-BR")}</span></div><strong>{formatCurrency(Number(entry.amount))}</strong><button className="icon-button" title="Excluir entrada" aria-label="Excluir entrada" onClick={() => void deleteSaving(entry.id)}><Trash2 size={16} /></button></div>)}</div> : <p className="savings-muted">Você ainda não registrou economias.</p>}
    </section>}
    {full && allocations.length > 0 && <section className="panel savings-movements"><div className="panel-heading"><div><h2>Alocações realizadas</h2><p>Desfaça uma alocação para liberar o valor novamente.</p></div></div><div className="savings-list">{allocations.map((item) => <div className="savings-list-item" key={item.id}><div><strong>{goals.find((g) => g.id === item.goal_item_id)?.title ?? "Meta removida"}</strong><span>{new Date(item.allocated_at).toLocaleDateString("pt-BR")}</span></div><strong>{formatCurrency(Number(item.amount))}</strong><button className="icon-button" aria-label="Desfazer alocação" title="Desfazer alocação" onClick={() => void deleteAllocation(item)}><X size={16} /></button></div>)}</div></section>}
    {goalToAllocate && <div className="savings-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setGoalToAllocate(null); }}><div className="panel savings-modal" role="dialog" aria-modal="true" aria-labelledby="allocate-title"><div className="savings-modal-title"><h2 id="allocate-title">Alocar Economias</h2><button className="icon-button" aria-label="Fechar" onClick={() => setGoalToAllocate(null)}><X size={18} /></button></div><p className="savings-muted">{goalToAllocate.title}</p><p className="savings-muted">Disponível: <strong>{formatCurrency(available)}</strong> · Falta na meta: <strong>{formatCurrency(Math.max(0, money(Number(goalToAllocate.price) * Number(goalToAllocate.quantity) - (allocatedByGoal.get(goalToAllocate.id) ?? 0))))}</strong></p><form onSubmit={(event) => void addAllocation(event)}><label className="savings-field">Valor a alocar (R$)<input required inputMode="decimal" placeholder="Ex.: 50,00" value={allocationAmount} onChange={(event) => setAllocationAmount(event.target.value)} /></label><button className="button button-primary" type="submit" disabled={submitting || available <= 0}>{submitting ? "Salvando..." : "Confirmar alocação"}</button></form></div></div>}
    {savingOpen && <div className="savings-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSavingOpen(false); }}><div className="panel savings-modal" role="dialog" aria-modal="true" aria-labelledby="saving-title"><div className="savings-modal-title"><h2 id="saving-title">Registrar economia</h2><button className="icon-button" aria-label="Fechar" onClick={() => setSavingOpen(false)}><X size={18} /></button></div><form onSubmit={(event) => void addSaving(event)}><label className="savings-field">Valor guardado (R$)<input required inputMode="decimal" placeholder="Ex.: 150,00" value={savingAmount} onChange={(event) => setSavingAmount(event.target.value)} /></label><label className="savings-field">Descrição (opcional)<input maxLength={500} placeholder="Ex.: Reserva do salário" value={savingDescription} onChange={(event) => setSavingDescription(event.target.value)} /></label><label className="savings-field">Data<input required type="date" value={savingDate} onChange={(event) => setSavingDate(event.target.value)} /></label><button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Salvando..." : "Guardar valor"}</button></form></div></div>}
  </div>;
}
