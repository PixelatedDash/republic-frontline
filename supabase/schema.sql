-- Republic Frontline cloud save (spec §15). Run once in the Supabase SQL
-- editor. One row per user; Row Level Security lets a signed-in user read,
-- insert and update only their own row. No username tables or RPCs.

create table if not exists public.saves (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  data         jsonb not null,
  save_version int not null,
  updated_at   timestamptz not null default now()
);

alter table public.saves enable row level security;

drop policy if exists "saves: select own" on public.saves;
create policy "saves: select own" on public.saves
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "saves: insert own" on public.saves;
create policy "saves: insert own" on public.saves
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "saves: update own" on public.saves;
create policy "saves: update own" on public.saves
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No delete policy: the game never deletes a save (deleting the auth user
-- cascades). Anonymous visitors match no policy, so they see nothing.
revoke all on public.saves from anon;
grant select, insert, update on public.saves to authenticated;
