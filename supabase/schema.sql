-- Archivario · esquema de base de datos
-- Ejecuta esto en Supabase Dashboard -> SQL Editor -> New query -> Run

create table if not exists public.sagas (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.items (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sagas_user_id_idx on public.sagas(user_id);
create index if not exists items_user_id_idx on public.items(user_id);

alter table public.sagas enable row level security;
alter table public.items enable row level security;

create policy "sagas_select_own" on public.sagas for select using (auth.uid() = user_id);
create policy "sagas_insert_own" on public.sagas for insert with check (auth.uid() = user_id);
create policy "sagas_update_own" on public.sagas for update using (auth.uid() = user_id);
create policy "sagas_delete_own" on public.sagas for delete using (auth.uid() = user_id);

create policy "items_select_own" on public.items for select using (auth.uid() = user_id);
create policy "items_insert_own" on public.items for insert with check (auth.uid() = user_id);
create policy "items_update_own" on public.items for update using (auth.uid() = user_id);
create policy "items_delete_own" on public.items for delete using (auth.uid() = user_id);
