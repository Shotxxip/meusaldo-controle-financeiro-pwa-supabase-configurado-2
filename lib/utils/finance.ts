import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Transaction, TransactionType } from "@/types/finance";

export const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(value: number) {
  return currency.format(Number.isFinite(value) ? value : 0);
}

export function formatDate(date: string) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day));
}

export function toDateInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthLabel(date: Date) {
  const label = format(date, "MMMM 'de' yyyy", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function monthRange(date: Date) {
  return {
    from: format(startOfMonth(date), "yyyy-MM-dd"),
    to: format(endOfMonth(date), "yyyy-MM-dd"),
  };
}

export function getSixMonthLabels(date: Date) {
  return Array.from({ length: 6 }, (_, index) => {
    const month = subMonths(startOfMonth(date), 5 - index);
    return { key: format(month, "yyyy-MM"), label: format(month, "MMM", { locale: ptBR }) };
  });
}

export function totals(transactions: Transaction[]) {
  return transactions.reduce(
    (acc, transaction) => {
      if (!transaction.is_paid) return acc;
      if (transaction.type === "income") acc.income += Number(transaction.amount);
      else acc.expense += Number(transaction.amount);
      acc.balance = acc.income - acc.expense;
      return acc;
    },
    { income: 0, expense: 0, balance: 0 },
  );
}

export function parseCurrencyInput(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

export function maskCurrencyInput(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const value = Number(digits) / 100;
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function typeLabel(type: TransactionType) {
  return type === "income" ? "Receita" : "Despesa";
}
