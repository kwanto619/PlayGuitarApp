-- ======================================================================
-- Popularity + community ratings.
-- Run this in Supabase SQL Editor (top → bottom) AFTER song_views.sql.
-- Safe to re-run.
--
-- 1. song_view_events — one row per song open (signed-in OR anonymous).
--    Powers "Most popular · 7 days / 30 days / all time" on /top and the
--    home page. bump_song_view() is extended to log an event on top of
--    the per-user counter it already maintains.
-- 2. song_ratings — one row per (user, song). Replaces the single
--    owner-only `songs.rating` column with a real community average
--    ("5.0 (12)") that any signed-in member can contribute to.
-- ======================================================================

-- ── 1. View events ────────────────────────────────────────────────────
create table if not exists song_view_events (
  id        bigint generated always as identity primary key,
  song_id   uuid not null references songs(id) on delete cascade,
  user_id   uuid references auth.users(id) on delete set null,
  viewed_at timestamptz not null default now()
);

create index if not exists song_view_events_song_time_idx on song_view_events(song_id, viewed_at desc);
create index if not exists song_view_events_time_idx      on song_view_events(viewed_at desc);

alter table song_view_events enable row level security;
-- Nobody reads raw events directly; aggregates come from popular_songs().

-- One-time backfill: turn the existing per-user counters into events so
-- the "All time" chart isn't empty on day one. Only runs when the events
-- table is still empty, so re-running this file never double counts.
insert into song_view_events (song_id, user_id, viewed_at)
select v.song_id, v.user_id, coalesce(v.updated_at, now())
from song_views v
cross join lateral generate_series(1, greatest(v.count, 1))
where not exists (select 1 from song_view_events limit 1);

create or replace function public.bump_song_view(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Always log the event (anonymous visitors count towards popularity).
  insert into song_view_events (song_id, user_id) values (p_song_id, auth.uid());

  -- Per-user counter (cross-device "Most watched") only for members.
  if auth.uid() is null then
    return;
  end if;
  insert into song_views (user_id, song_id, count, updated_at)
  values (auth.uid(), p_song_id, 1, now())
  on conflict (user_id, song_id)
  do update set count = song_views.count + 1, updated_at = now();
end;
$$;

grant execute on function public.bump_song_view(uuid) to authenticated, anon;

-- Aggregated popularity. p_days = 0 → all time.
create or replace function public.popular_songs(p_days integer default 30, p_limit integer default 50)
returns table (song_id uuid, views bigint)
language sql
security definer
set search_path = public
stable
as $$
  select e.song_id, count(*)::bigint as views
  from song_view_events e
  join songs s on s.id = e.song_id
  where s.is_public
    and (p_days <= 0 or e.viewed_at >= now() - make_interval(days => p_days))
  group by e.song_id
  order by views desc, max(e.viewed_at) desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.popular_songs(integer, integer) to authenticated, anon;

-- Recently viewed for the signed-in member (from the per-user table).
create or replace function public.recently_viewed(p_limit integer default 8)
returns table (song_id uuid, viewed_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select song_id, updated_at as viewed_at
  from song_views
  where user_id = auth.uid()
  order by updated_at desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.recently_viewed(integer) to authenticated;

-- ── 2. Community ratings ──────────────────────────────────────────────
create table if not exists song_ratings (
  user_id    uuid not null references auth.users(id) on delete cascade,
  song_id    uuid not null references songs(id) on delete cascade,
  stars      smallint not null check (stars between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create index if not exists song_ratings_song_idx on song_ratings(song_id);

alter table song_ratings enable row level security;

drop policy if exists song_ratings_select on song_ratings;
create policy song_ratings_select on song_ratings for select using (true);
drop policy if exists song_ratings_write on song_ratings;
create policy song_ratings_write on song_ratings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Upsert / clear the caller's rating. p_stars null → remove rating.
create or replace function public.rate_song(p_song_id uuid, p_stars smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if p_stars is null then
    delete from song_ratings where user_id = auth.uid() and song_id = p_song_id;
    return;
  end if;
  insert into song_ratings (user_id, song_id, stars, updated_at)
  values (auth.uid(), p_song_id, p_stars, now())
  on conflict (user_id, song_id)
  do update set stars = excluded.stars, updated_at = now();
end;
$$;

grant execute on function public.rate_song(uuid, smallint) to authenticated;

-- Per-song average + count for every rated song (small table, one call).
create or replace view song_rating_summary as
  select song_id,
         round(avg(stars)::numeric, 1) as avg_stars,
         count(*)::integer as rating_count
  from song_ratings
  group by song_id;

grant select on song_rating_summary to authenticated, anon;

-- Seed community ratings from the legacy owner rating so nothing is lost.
insert into song_ratings (user_id, song_id, stars)
select user_id, id, rating
from songs
where rating is not null and user_id is not null
on conflict (user_id, song_id) do nothing;
