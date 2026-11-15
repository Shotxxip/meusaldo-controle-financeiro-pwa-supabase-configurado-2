-- MeuSaldo | Metas
-- Execute no SQL Editor do projeto Supabase ativo.
-- Idempotente: pode ser executado novamente sem duplicar tabela, policy ou publicação.

create table if not exists public.goals_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  price numeric(10,2) not null check (price > 0),
  quantity integer not null default 1 check (quantity >= 1),
  amazon_url text,
  image_url text,
  is_purchased boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists goals_items_user_created_idx
  on public.goals_items (user_id, created_at desc);

alter table public.goals_items enable row level security;

revoke all on table public.goals_items from anon;
grant select, insert, update, delete on table public.goals_items to authenticated;

drop policy if exists "Users manage their own goals items" on public.goals_items;
create policy "Users manage their own goals items"
  on public.goals_items
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Inclui a tabela na publicação Realtime sem tentar adicioná-la duas vezes.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'goals_items'
  ) then
    alter publication supabase_realtime add table public.goals_items;
  end if;
end;
$$;

alter table public.goals_items replica identity full;
