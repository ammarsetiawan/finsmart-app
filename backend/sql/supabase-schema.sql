-- Supabase SQL Editor script for Fin Smart
-- Paste this into SQL Editor in Supabase Dashboard

create extension if not exists pgcrypto;

create table if not exists profiles (
  id text primary key,
  user_id text not null unique,
  full_name text not null,
  monthly_income numeric(15,2) default '0',
  balance numeric(15,2) not null default '0',
  currency text not null default 'IDR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


alter table profiles add column if not exists balance numeric(15,2) not null default '0';

create table if not exists categories (
  id text primary key,
  user_id text not null,
  name text not null,
  allocation_type text not null,
  color text not null default '#6366f1',
  icon text not null default 'wallet',
  is_salary boolean not null default false,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists allocation_rules (
  id text primary key,
  user_id text not null,
  allocation_type text not null,
  percentage numeric(5,2) not null,
  target_category_id text references categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists transactions (
  id text primary key,
  user_id text not null,
  category_id text references categories(id) on delete set null,
  type text not null,
  allocation_type text not null,
  amount numeric(15,2) not null,
  context_note text,
  is_salary_split boolean not null default false,
  transaction_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists budgets (
  id text primary key,
  user_id text not null,
  category_id text not null references categories(id) on delete cascade,
  limit_amount numeric(15,2) not null,
  period_month smallint not null,
  period_year smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists login_history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  action text not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_categories_user_id on categories(user_id);
create index if not exists idx_allocation_rules_user_id on allocation_rules(user_id);
create index if not exists idx_transactions_user_id on transactions(user_id);
create index if not exists idx_budgets_user_id on budgets(user_id);
create index if not exists idx_login_history_user_id on login_history(user_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists allocation_rules_set_updated_at on allocation_rules;
create trigger allocation_rules_set_updated_at
before update on allocation_rules
for each row execute function set_updated_at();

drop trigger if exists transactions_set_updated_at on transactions;
create trigger transactions_set_updated_at
before update on transactions
for each row execute function set_updated_at();

drop trigger if exists budgets_set_updated_at on budgets;
create trigger budgets_set_updated_at
before update on budgets
for each row execute function set_updated_at();

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
before update on profiles
for each row execute function set_updated_at();

alter table profiles enable row level security;
alter table categories enable row level security;
alter table allocation_rules enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table login_history enable row level security;

drop policy if exists "profiles_isolated" on profiles;
create policy "profiles_isolated" on profiles
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

drop policy if exists "categories_isolated" on categories;
create policy "categories_isolated" on categories
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

drop policy if exists "allocation_rules_isolated" on allocation_rules;
create policy "allocation_rules_isolated" on allocation_rules
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

drop policy if exists "transactions_isolated" on transactions;
create policy "transactions_isolated" on transactions
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

drop policy if exists "budgets_isolated" on budgets;
create policy "budgets_isolated" on budgets
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

drop policy if exists "login_history_isolated" on login_history;
create policy "login_history_isolated" on login_history
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);
