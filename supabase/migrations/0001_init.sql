-- My Finance — esquema inicial de Supabase (Fase 13)
--
-- Espejo del modelo de dominio en src/domain/types.ts. Cada tabla tiene
-- user_id y RLS: cada persona solo puede leer/escribir sus propias filas.
-- Esto es OBLIGATORIO porque el repo es publico en GitHub Pages y la
-- anon key queda visible en el bundle — sin RLS, cualquiera podria leer
-- la tabla completa.

create extension if not exists "pgcrypto";

-- ───────────────────────── settings ─────────────────────────
create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'COP',
  locale text not null default 'es-CO',
  quincena_start_days smallint[] not null default '{10,25}',
  default_payment_method_id uuid,
  reminder_default_days_before smallint not null default 1,
  theme text not null default 'system' check (theme in ('system','light','dark')),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── categories ─────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null,
  color text not null,
  kind text not null check (kind in ('expense','income','both')),
  is_archived boolean not null default false,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists categories_user_idx on public.categories(user_id);

-- ───────────────────────── payment_methods ─────────────────────────
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('debit','credit','cash','transfer')),
  name text not null,
  is_default boolean not null default false,
  cutoff_day smallint,
  payment_day smallint,
  updated_at timestamptz not null default now()
);
create index if not exists payment_methods_user_idx on public.payment_methods(user_id);

-- ───────────────────────── transactions ─────────────────────────
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  concept text not null,
  amount bigint not null,
  date date not null,
  category_id uuid references public.categories(id) on delete set null,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  status text not null check (status in ('paid','pending','scheduled','cancelled')),
  notes text,
  cycle_cutoff_date date,
  cycle_payment_date date,
  quincena_key text,
  recurring_rule_id uuid,
  period_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Misma proteccion que el indice unico de Dexie: una instancia recurrente
  -- nunca se duplica. NULLs no chocan entre si (comportamiento de Postgres),
  -- asi que esto no afecta a transacciones normales (sin regla).
  unique (user_id, recurring_rule_id, period_key)
);
create index if not exists transactions_user_date_idx on public.transactions(user_id, date);
create index if not exists transactions_user_status_idx on public.transactions(user_id, status);
create index if not exists transactions_cycle_payment_idx on public.transactions(user_id, cycle_payment_date);

-- ───────────────────────── recurring_rules ─────────────────────────
create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income','expense')),
  amount bigint not null,
  category_id uuid references public.categories(id) on delete set null,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  frequency text not null check (frequency in ('monthly','weekly','biweekly','yearly')),
  day_of_month smallint,
  day_of_week smallint,
  start_date date not null,
  end_date date,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
create index if not exists recurring_rules_user_idx on public.recurring_rules(user_id);

-- ───────────────────────── budgets ─────────────────────────
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  year integer not null,
  month smallint not null check (month between 1 and 12),
  amount bigint not null,
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, year, month)
);

-- ───────────────────────── reminders ─────────────────────────
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  remind_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','sent','dismissed','failed')),
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists reminders_pending_idx on public.reminders(remind_at) where status = 'scheduled';

-- ───────────────────────── RLS ─────────────────────────
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.budgets enable row level security;
alter table public.reminders enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['settings','categories','payment_methods','transactions','recurring_rules','budgets','reminders']
  loop
    execute format('create policy "select_own" on public.%I for select using (auth.uid() = user_id)', t);
    execute format('create policy "insert_own" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "update_own" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "delete_own" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;
