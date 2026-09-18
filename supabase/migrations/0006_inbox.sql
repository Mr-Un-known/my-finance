-- Bandeja de entrada para automatizaciones.
--
-- El problema: iOS no abre una URL dentro de una web app instalada. Un
-- Atajo que abre un enlace cae en Safari, que tiene otro almacenamiento,
-- así que el gasto quedaba del lado equivocado.
--
-- La salida: que el Atajo NO abra nada. Manda el texto crudo acá y la app
-- lo recoge en el próximo sync. Para el SMS del banco es mejor que lo
-- pedido: no interrumpe, no cambia de app, no pide nada.
--
-- Se guarda el texto SIN interpretar a propósito: el parser vive en la app
-- (src/domain/nlp) y hay uno solo. La función de ingesta no entiende de
-- plata, solo recibe.

create table if not exists public.inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  texto text not null check (length(texto) between 1 and 2000),
  -- De dónde vino, para poder mostrarlo: 'sms', 'dictado', 'atajo'.
  origen text not null default 'atajo',
  status text not null default 'pending' check (status in ('pending', 'done', 'discarded')),
  created_at timestamptz not null default now()
);
create index if not exists inbox_pendientes_idx on public.inbox(user_id, created_at) where status = 'pending';

alter table public.inbox enable row level security;

drop policy if exists "select_own" on public.inbox;
drop policy if exists "insert_own" on public.inbox;
drop policy if exists "update_own" on public.inbox;
drop policy if exists "delete_own" on public.inbox;

create policy "select_own" on public.inbox for select using (auth.uid() = user_id);
create policy "insert_own" on public.inbox for insert with check (auth.uid() = user_id);
create policy "update_own" on public.inbox for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own" on public.inbox for delete using (auth.uid() = user_id);

-- ── Tokens de ingesta ───────────────────────────────────────────────
--
-- Un Atajo no puede iniciar sesión, así que necesita una credencial. Esta
-- es de un solo propósito: sirve ÚNICAMENTE para agregar texto a la
-- bandeja. No lee movimientos, no lee la configuración, no borra nada. Si
-- se filtra, lo peor que puede pasar es que alguien te escriba basura en
-- la bandeja, que vos vas a ver antes de confirmar.
--
-- Se guarda el hash, no el token: si alguien lee la tabla, no puede usar
-- lo que ve.
create table if not exists public.ingest_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  label text not null default 'Atajos de iOS',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists ingest_tokens_user_idx on public.ingest_tokens(user_id);

alter table public.ingest_tokens enable row level security;

drop policy if exists "select_own" on public.ingest_tokens;
drop policy if exists "insert_own" on public.ingest_tokens;
drop policy if exists "delete_own" on public.ingest_tokens;

-- Sin policy de select sobre token_hash para terceros; solo el dueño, y
-- aun así el hash no sirve para autenticarse.
create policy "select_own" on public.ingest_tokens for select using (auth.uid() = user_id);
create policy "insert_own" on public.ingest_tokens for insert with check (auth.uid() = user_id);
create policy "delete_own" on public.ingest_tokens for delete using (auth.uid() = user_id);
