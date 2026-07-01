-- ======================================================================
-- Song views — per-user, cross-device play counts (powers "Most watched").
-- Run this in Supabase SQL Editor (top → bottom). Safe to re-run.
--
-- Each row is "user U has opened song S N times". Counts follow the user
-- across devices. Incrementing goes through the bump_song_view() RPC so it
-- is atomic and works even for public songs the user doesn't own (the
-- function is SECURITY DEFINER, so it isn't blocked by the songs RLS).
-- ======================================================================

create extension if not exists "uuid-ossp";

-- ── Table ─────────────────────────────────────────────────────────────
create table if not exists song_views (
  user_id    uuid not null references auth.users(id) on delete cascade,
  song_id    uuid not null references songs(id) on delete cascade,
  count      integer not null default 0,
  updated_at timestamptz default now(),
  primary key (user_id, song_id)
);

-- Fast "most watched for this user" reads.
create index if not exists song_views_user_count_idx on song_views(user_id, count desc);

-- ── Row Level Security ────────────────────────────────────────────────
-- Users may read only their own view counts. Writes happen exclusively
-- through the RPC below (SECURITY DEFINER), so no write policy is needed.
alter table song_views enable row level security;

drop policy if exists song_views_select on song_views;
create policy song_views_select on song_views
  for select using (user_id = auth.uid());

-- ── Atomic increment RPC ──────────────────────────────────────────────
create or replace function public.bump_song_view(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  insert into song_views (user_id, song_id, count, updated_at)
  values (auth.uid(), p_song_id, 1, now())
  on conflict (user_id, song_id)
  do update set count = song_views.count + 1, updated_at = now();
end;
$$;

grant execute on function public.bump_song_view(uuid) to authenticated;
