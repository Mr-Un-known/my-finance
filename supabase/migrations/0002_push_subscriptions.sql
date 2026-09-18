-- Suscripciones de Web Push (Fase 14). Una fila por dispositivo/navegador
-- instalado. iOS Safari solo genera una suscripcion real cuando la PWA
-- esta instalada en la pantalla de inicio (ver docs/NOTIFICATIONS.md).

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "select_own" on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "insert_own" on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "update_own" on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own" on public.push_subscriptions for delete using (auth.uid() = user_id);
