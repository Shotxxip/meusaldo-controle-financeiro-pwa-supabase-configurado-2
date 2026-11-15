"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GoalItem } from "@/types/goals";
import type { GoalAllocation, SavingsEntry } from "@/types/savings";

export function useSavingsData() {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [entries, setEntries] = useState<SavingsEntry[]>([]);
  const [allocations, setAllocations] = useState<GoalAllocation[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const client = createClient();
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        setUserId(null); setGoals([]); setEntries([]); setAllocations([]);
        setError("Faça login para visualizar suas economias.");
        return;
      }
      setUserId(user.id);
      const [g, s, a] = await Promise.all([
        client.from("goals_items").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        client.from("savings_entries").select("*").eq("user_id", user.id).order("date", { ascending: false }),
        client.from("goal_allocations").select("*").eq("user_id", user.id).order("allocated_at", { ascending: false }),
      ]);
      if (g.error) throw g.error;
      if (s.error) throw s.error;
      if (a.error) throw a.error;
      setGoals((g.data ?? []) as GoalItem[]);
      setEntries((s.data ?? []) as SavingsEntry[]);
      setAllocations((a.data ?? []) as GoalAllocation[]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar as economias.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!userId) return;
    const client = createClient();
    const channel = client.channel(`meusaldo-savings-${userId}`);
    for (const table of ["goals_items", "savings_entries", "goal_allocations"]) {
      channel.on("postgres_changes", { event: "INSERT", schema: "public", table, filter: `user_id=eq.${userId}` }, () => { void refresh(); });
      channel.on("postgres_changes", { event: "UPDATE", schema: "public", table, filter: `user_id=eq.${userId}` }, () => { void refresh(); });
      // DELETE não admite filtro de linha no Postgres Changes; a leitura continua protegida por RLS.
      channel.on("postgres_changes", { event: "DELETE", schema: "public", table }, () => { void refresh(); });
    }
    channel.subscribe();
    return () => { void client.removeChannel(channel); };
  }, [userId, refresh]);

  return { goals, entries, allocations, userId, loading, error, refresh };
}
