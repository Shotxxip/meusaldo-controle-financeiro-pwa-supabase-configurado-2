"use client";

import { useState } from "react";
import { Briefcase, Bus, Car, Coffee, Gamepad2, HeartPulse, House, Plus, ShoppingBag, TrendingUp, Utensils, Wallet, Pencil, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useFinanceData } from "@/hooks/use-finance-data";
import { CategoryDialog } from "@/components/categories/category-dialog";
import type { Category } from "@/types/finance";

const iconMap = { wallet: Wallet, "briefcase-business": Briefcase, "trending-up": TrendingUp, utensils: Utensils, bus: Bus, house: House, "gamepad-2": Gamepad2, "heart-pulse": HeartPulse, "shopping-bag": ShoppingBag, "book-open": BookOpen, car: Car, coffee: Coffee } as const;

function CategoryCard({ category, onEdit, onDelete }: { category: Category; onEdit: () => void; onDelete: () => void }) {
  const Icon = iconMap[category.icon as keyof typeof iconMap] ?? Wallet;
  return <article className="category-card"><div className="category-card-main"><span className="category-card-icon" style={{ backgroundColor: `${category.color}20`, color: category.color }}><Icon size={20} /></span><div className="category-card-name"><strong>{category.name}</strong><span>{category.type === "income" ? "Receita" : "Despesa"}</span></div></div><div className="category-card-actions"><button className="icon-button row-action" onClick={onEdit} aria-label={`Editar ${category.name}`}><Pencil size={15} /></button><button className="icon-button row-action delete-action" onClick={onDelete} aria-label={`Excluir ${category.name}`}><Trash2 size={15} /></button></div></article>;
}

export function CategoriesPage() {
  const { categories, loading, error, refresh } = useFinanceData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  async function deleteCategory(category: Category) {
    if (!window.confirm(`Excluir a categoria "${category.name}"? Ela só poderá ser removida se não estiver vinculada a nenhuma transação.`)) return;
    const { createClient } = await import("@/lib/supabase/client");
    const { error: deleteError } = await createClient().from("categories").delete().eq("id", category.id);
    if (deleteError) {
      toast.error(deleteError.message.includes("foreign key") ? "Esta categoria está vinculada a transações. Edite os lançamentos antes de excluí-la." : deleteError.message);
    } else { toast.success("Categoria excluída."); refresh(); }
  }

  const incomes = categories.filter((category) => category.type === "income");
  const expenses = categories.filter((category) => category.type === "expense");
  return <div className="content-page">
    <div className="page-heading"><div><span className="eyebrow">PERSONALIZE SUA ORGANIZAÇÃO</span><h1>Categorias</h1><p>Separe suas receitas e despesas do seu jeito.</p></div><button className="button button-primary add-transaction-button" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus size={18} /> Nova categoria</button></div>
    {error && <div className="inline-error">{error}</div>}
    <div className="category-summary"><div className="category-summary-item"><span className="category-summary-number">{categories.length}</span><span>Categorias no total</span></div><div className="category-summary-item income-summary"><span className="category-summary-number">{incomes.length}</span><span>De receita</span></div><div className="category-summary-item expense-summary"><span className="category-summary-number">{expenses.length}</span><span>De despesa</span></div></div>
    {loading ? <section className="panel category-loading"><span className="loading-line" /><span className="loading-line" /><span className="loading-line" /></section> : <div className="category-groups"><section className="panel category-group"><div className="category-group-heading"><div><span className="category-group-dot income-dot" /><h2>Receitas</h2></div><span>{incomes.length} categorias</span></div><div className="category-grid">{incomes.map((category) => <CategoryCard key={category.id} category={category} onEdit={() => { setEditing(category); setDialogOpen(true); }} onDelete={() => void deleteCategory(category)} />)}{incomes.length === 0 && <p className="category-empty">Nenhuma categoria de receita cadastrada.</p>}</div></section>
      <section className="panel category-group"><div className="category-group-heading"><div><span className="category-group-dot expense-dot" /><h2>Despesas</h2></div><span>{expenses.length} categorias</span></div><div className="category-grid">{expenses.map((category) => <CategoryCard key={category.id} category={category} onEdit={() => { setEditing(category); setDialogOpen(true); }} onDelete={() => void deleteCategory(category)} />)}{expenses.length === 0 && <p className="category-empty">Nenhuma categoria de despesa cadastrada.</p>}</div></section></div>}
    <CategoryDialog open={dialogOpen} category={editing} onClose={() => { setDialogOpen(false); setEditing(null); }} onSaved={() => { void refresh(); }} />
  </div>;
}
