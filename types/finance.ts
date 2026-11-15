export type TransactionType = "income" | "expense";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  created_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  is_paid: boolean;
  created_at: string;
  category?: Pick<Category, "id" | "name" | "color" | "icon"> | null;
}

export interface TransactionInput {
  description: string;
  amount: number;
  type: TransactionType;
  category_id: string;
  date: string;
  is_paid: boolean;
}
