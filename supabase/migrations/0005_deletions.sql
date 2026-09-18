-- Lápidas de borrado. Sin esto, sincronizar resucita lo que borraste:
-- el dispositivo que todavía tiene la fila la vuelve a subir.
-- Ver src/data/sync/tombstones.ts.
--
-- Re-ejecutable: `create policy` no acepta IF NOT EXISTS, así que cada
-- una se suelta antes de crearla.

create table if not exists public.deletions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,               -- '<entidad>:<id>'
  entity text not null check (entity in ('transactions','categories','paymentMethods','recurringRules')),
  entity_id text not null,
  deleted_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists deletions_user_idx on public.deletions(user_id, deleted_at);

alter table public.deletions enable row level security;

drop policy if exists "select_own" on public.deletions;
drop policy if exists "insert_own" on public.deletions;
drop policy if exists "update_own" on public.deletions;
drop policy if exists "delete_own" on public.deletions;

create policy "select_own" on public.deletions for select using (auth.uid() = user_id);
create policy "insert_own" on public.deletions for insert with check (auth.uid() = user_id);
create policy "update_own" on public.deletions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own" on public.deletions for delete using (auth.uid() = user_id);
