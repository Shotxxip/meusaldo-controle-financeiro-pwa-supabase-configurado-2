-- Controle Financeiro PWA | Execute todo este arquivo no SQL Editor do Supabase.
-- Cada registro pertence ao usuário autenticado. As FKs compostas impedem vincular
-- uma transação a uma categoria de outro usuário ou de tipo incompatível.

create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  type text not null check (type in ('income', 'expense')),
  color text not null default '#7c3aed' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null default 'wallet',
  created_at timestamptz not null default now(),
  constraint categories_id_user_type_unique unique (id, user_id, type),
  constraint categories_user_name_type_unique unique (user_id, name, type)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null,
  description text not null check (char_length(trim(description)) between 1 and 120),
  amount numeric(10,2) not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  date date not null default current_date,
  is_paid boolean not null default true,
  created_at timestamptz not null default now(),
  constraint transactions_category_owner_type_fk
    foreign key (category_id, user_id, type)
    references public.categories (id, user_id, type)
    on delete no action deferrable initially deferred
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);
create index if not exists transactions_user_category_idx
  on public.transactions (user_id, category_id);
create index if not exists transactions_category_owner_type_idx
  on public.transactions (category_id, user_id, type);
create index if not exists categories_user_type_idx
  on public.categories (user_id, type);

alter table public.categories enable row level security;
alter table public.transactions enable row level security;

grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;

-- Categories: cada usuário só pode acessar e administrar as próprias categorias.
drop policy if exists "Users manage their own categories" on public.categories;
create policy "Users manage their own categories"
  on public.categories for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Transactions: a FK composta também valida propriedade e tipo da categoria.
drop policy if exists "Users manage their own transactions" on public.transactions;
create policy "Users manage their own transactions"
  on public.transactions for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Função de trigger em schema não exposto pela Data API.
-- O código roda com os privilégios do owner apenas durante o trigger de auth.users.
create schema if not exists app_private authorization postgres;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to supabase_auth_admin;

-- Categorias de início para todo novo usuário cadastrado.
create or replace function app_private.handle_new_user_categories()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categories (user_id, name, type, color, icon)
  values
    (new.id, 'Salário', 'income', '#16a34a', 'briefcase-business'),
    (new.id, 'Renda extra', 'income', '#0d9488', 'trending-up'),
    (new.id, 'Alimentação', 'expense', '#f97316', 'utensils'),
    (new.id, 'Transporte', 'expense', '#0ea5e9', 'bus'),
    (new.id, 'Moradia', 'expense', '#8b5cf6', 'house'),
    (new.id, 'Lazer', 'expense', '#ec4899', 'gamepad-2'),
    (new.id, 'Saúde', 'expense', '#ef4444', 'heart-pulse'),
    (new.id, 'Outros', 'expense', '#64748b', 'wallet');
  return new;
end;
$$;

alter function app_private.handle_new_user_categories() owner to postgres;
revoke all on function app_private.handle_new_user_categories() from public, anon, authenticated;
grant execute on function app_private.handle_new_user_categories() to supabase_auth_admin;

drop trigger if exists on_auth_user_created_categories on auth.users;
create trigger on_auth_user_created_categories
after insert on auth.users
for each row execute function app_private.handle_new_user_categories();

-- Também inicializa usuários que já existiam antes da instalação deste schema.
insert into public.categories (user_id, name, type, color, icon)
select u.id, defaults.name, defaults.type, defaults.color, defaults.icon
from auth.users as u
cross join (values
  ('Salário', 'income', '#16a34a', 'briefcase-business'),
  ('Renda extra', 'income', '#0d9488', 'trending-up'),
  ('Alimentação', 'expense', '#f97316', 'utensils'),
  ('Transporte', 'expense', '#0ea5e9', 'bus'),
  ('Moradia', 'expense', '#8b5cf6', 'house'),
  ('Lazer', 'expense', '#ec4899', 'gamepad-2'),
  ('Saúde', 'expense', '#ef4444', 'heart-pulse'),
  ('Outros', 'expense', '#64748b', 'wallet')
) as defaults(name, type, color, icon)
on conflict (user_id, name, type) do nothing;

-- Habilita Supabase Realtime para a tabela de transações sem falhar caso já esteja publicada.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'transactions'
  ) then
    execute 'alter publication supabase_realtime add table public.transactions';
  end if;
end;
$$;

-- Atualiza a representação enviada pelo Realtime em operações UPDATE/DELETE.
alter table public.transactions replica identity full;
