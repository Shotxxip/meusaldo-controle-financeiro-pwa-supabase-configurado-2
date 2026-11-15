-- MeuSaldo v3 — economias e alocação para metas.
-- Execute apenas este arquivo no SQL Editor do projeto Supabase do MeuSaldo.
-- Não modifica dados já existentes. Pode ser executado novamente.
begin;

create table if not exists public.savings_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  description text check (description is null or char_length(description) <= 500),
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- A chave composta impede alocar dinheiro para metas pertencentes a outra conta.
create unique index if not exists goals_items_id_user_id_unique
  on public.goals_items (id, user_id);

create table if not exists public.goal_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_item_id uuid not null,
  amount numeric(10,2) not null check (amount > 0),
  allocated_at timestamptz not null default now(),
  constraint goal_allocations_goal_owner_fk
    foreign key (goal_item_id, user_id)
    references public.goals_items(id, user_id) on delete cascade
);

create index if not exists savings_entries_user_date_idx
  on public.savings_entries(user_id, date desc);
create index if not exists goal_allocations_user_goal_idx
  on public.goal_allocations(user_id, goal_item_id);
create index if not exists goal_allocations_user_date_idx
  on public.goal_allocations(user_id, allocated_at desc);

alter table public.savings_entries enable row level security;
alter table public.goal_allocations enable row level security;
revoke all on table public.savings_entries, public.goal_allocations from anon;
grant select, insert, update, delete on table public.savings_entries, public.goal_allocations to authenticated;

drop policy if exists "Owners manage savings entries" on public.savings_entries;
create policy "Owners manage savings entries" on public.savings_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Owners manage goal allocations" on public.goal_allocations;
create policy "Owners manage goal allocations" on public.goal_allocations
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Proteção transacional contra alocação maior que o total guardado ou o custo da meta.
-- A trava por usuário serializa operações concorrentes no mesmo orçamento.
create or replace function public.validate_goal_allocation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  available numeric;
  already_allocated numeric;
  goal_total numeric;
  allocated_to_goal numeric;
begin
  if new.user_id <> (select auth.uid()) then
    raise exception 'A alocação deve pertencer à conta autenticada';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 20261115));
  select coalesce(sum(amount), 0) into available
    from public.savings_entries where user_id = new.user_id;
  select coalesce(sum(amount), 0) into already_allocated
    from public.goal_allocations where user_id = new.user_id and id <> new.id;
  if already_allocated + new.amount > available then
    raise exception 'Saldo guardado insuficiente para esta alocação';
  end if;
  select price * quantity into goal_total from public.goals_items
    where id = new.goal_item_id and user_id = new.user_id and is_purchased = false;
  if goal_total is null then
    raise exception 'Meta não encontrada ou já comprada';
  end if;
  select coalesce(sum(amount), 0) into allocated_to_goal
    from public.goal_allocations
    where user_id = new.user_id and goal_item_id = new.goal_item_id and id <> new.id;
  if allocated_to_goal + new.amount > goal_total then
    raise exception 'A alocação excede o custo da meta';
  end if;
  return new;
end;
$$;

-- Se o usuário reduzir ou excluir uma economia, o total alocado deve continuar coberto.
create or replace function public.validate_savings_reduction()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  savings_total numeric;
  allocations_total numeric;
  owner_id uuid;
begin
  owner_id := old.user_id;
  if owner_id <> (select auth.uid()) then
    raise exception 'Operação não autorizada';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 20261115));
  select coalesce(sum(amount), 0) into savings_total from public.savings_entries
    where user_id = owner_id and id <> old.id;
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id then
      raise exception 'Não é permitido transferir economias entre contas';
    end if;
    savings_total := savings_total + new.amount;
  end if;
  select coalesce(sum(amount), 0) into allocations_total
    from public.goal_allocations where user_id = owner_id;
  if savings_total < allocations_total then
    raise exception 'Desfaça as alocações antes de reduzir o total guardado';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists validate_goal_allocation_trigger on public.goal_allocations;
create trigger validate_goal_allocation_trigger before insert or update on public.goal_allocations
  for each row execute function public.validate_goal_allocation();
drop trigger if exists validate_savings_reduction_trigger on public.savings_entries;
create trigger validate_savings_reduction_trigger before delete or update on public.savings_entries
  for each row execute function public.validate_savings_reduction();

-- Inscrições Realtime, sem duplicar tabelas na publicação.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'savings_entries') then
    alter publication supabase_realtime add table public.savings_entries;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'goal_allocations') then
    alter publication supabase_realtime add table public.goal_allocations;
  end if;
end $$;

commit;
