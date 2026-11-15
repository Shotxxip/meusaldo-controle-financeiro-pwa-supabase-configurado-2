export interface SavingsEntry {
  id: string;
  user_id: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
}

export interface GoalAllocation {
  id: string;
  user_id: string;
  goal_item_id: string;
  amount: number;
  allocated_at: string;
}
