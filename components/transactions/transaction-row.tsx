"use client";

import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/finance";
import type { Transaction } from "@/types/finance";

export function TransactionRow({ transaction, onEdit, onDelete }: { transaction: Transaction; onEdit?: () => void; onDelete?: () => void }) {
  const income = transaction.type === "income";
  return <div className="transaction-row">
    <div className="transaction-main"><span className="category-symbol" style={{ backgroundColor: `${transaction.category?.color ?? "#64748b"}20`, color: transaction.category?.color ?? "#64748b" }}>{income ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</span><div className="transaction-description"><strong>{transaction.description}</strong><span>{transaction.category?.name ?? "Sem categoria"} · {formatDate(transaction.date)}</span></div></div>
    <div className="transaction-trailing"><div className={`transaction-value ${income ? "income-text" : "expense-text"}`}>{income ? "+" : "−"}{formatCurrency(Number(transaction.amount))}</div><span className={`status-pill ${transaction.is_paid ? "paid" : "pending"}`}>{transaction.is_paid ? "Pago" : "Pendente"}</span></div>
    {(onEdit || onDelete) && <div className="row-actions">{onEdit && <button className="icon-button row-action" type="button" onClick={onEdit} aria-label="Editar transação"><Pencil size={15} /></button>}{onDelete && <button className="icon-button row-action delete-action" type="button" onClick={onDelete} aria-label="Excluir transação"><Trash2 size={15} /></button>}</div>}
  </div>;
}
