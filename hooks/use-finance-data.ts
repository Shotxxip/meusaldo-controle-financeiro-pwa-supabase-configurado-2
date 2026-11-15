"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category, Transaction } from "@/types/finance";

export function useFinanceData() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        setUserId(null);
        setTransactions([]);
        setCategories([]);
        return;
      }
      setUserId(user.id);
      const [transactionResult, categoryResult] = await Promise.all([
        supabase.from("transactions").select("*, category:categories(id,name,color,icon)").order("date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("type", { ascending: true }).order("name", { ascending: true }),
      ]);
      if (transactionResult.error) throw transactionResult.error;
      if (categoryResult.error) throw categoryResult.error;
      setTransactions((transactionResult.data ?? []) as Transaction[]);
      setCategories((categoryResult.data ?? []) as Category[]);
      setError(null);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível carregar seus dados.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase.channel(`transactions-realtime-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` }, () => { void refresh(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, refresh]);

  return { transactions, categories, loading, error, refresh, userId, setCategories, setTransactions };
}
