-- ======================================================================
-- Guitar Companion — multi-user schema
-- Run this in Supabase SQL Editor (top → bottom). Safe to re-run.
-- After first signup, backfill any existing rows:
--   update songs     set user_id = '<your-uid>' where user_id is null;
--   update playlists set user_id = '<your-uid>' where user_id is null;
-- ======================================================================

create extension if not exists "uuid-ossp";

-- ── Profiles ──────────────────────────────────────────────────────────
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text,
  bio          text,
  created_at   timestamptz default now()
);

-- Auto-create profile on new auth user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  uname text;
begin
  uname := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  insert into public.profiles (id, username, display_name)
  values (new.id, uname, uname)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Add ownership to existing tables ──────────────────────────────────
alter table songs     add column if not exists user_id   uuid references auth.users(id) on delete set null;
alter table songs     add column if not exists is_public boolean default true;
alter table playlists add column if not exists user_id   uuid references auth.users(id) on delete set null;
alter table playlists add column if not exists is_public boolean default true;

-- ── Favorites ─────────────────────────────────────────────────────────
create table if not exists favorites (
  user_id    uuid references auth.users(id) on delete cascade,
  song_id    uuid references songs(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, song_id)
);

-- ── Follows ───────────────────────────────────────────────────────────
create table if not exists follows (
  follower_id  uuid references auth.users(id) on delete cascade,
  following_id uuid references auth.users(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- ── Comments ──────────────────────────────────────────────────────────
create table if not exists comments (
  id         uuid primary key default uuid_generate_v4(),
  song_id    uuid not null references songs(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────
create index if not exists songs_user_id_idx      on songs(user_id);
create index if not exists songs_created_at_idx   on songs(created_at desc);
create index if not exists playlists_user_id_idx  on playlists(user_id);
create index if not exists favorites_user_idx     on favorites(user_id);
create index if not exists comments_song_idx      on comments(song_id, created_at);
create index if not exists follows_follower_idx   on follows(follower_id);
create index if not exists follows_following_idx  on follows(following_id);
create index if not exists profiles_username_idx  on profiles(lower(username));

-- ── Row Level Security ────────────────────────────────────────────────
alter table profiles  enable row level security;
alter table songs     enable row level security;
alter table playlists enable row level security;
alter table favorites enable row level security;
alter table follows   enable row level security;
alter table comments  enable row level security;

-- profiles: anyone can read; only owner updates
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select using (true);
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- songs: public rows + own rows
drop policy if exists songs_select on songs;
create policy songs_select on songs for select using (is_public or user_id = auth.uid());
drop policy if exists songs_insert on songs;
create policy songs_insert on songs for insert with check (user_id = auth.uid());
drop policy if exists songs_update on songs;
create policy songs_update on songs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists songs_delete on songs;
create policy songs_delete on songs for delete using (user_id = auth.uid());

-- playlists
drop policy if exists playlists_select on playlists;
create policy playlists_select on playlists for select using (is_public or user_id = auth.uid());
drop policy if exists playlists_insert on playlists;
create policy playlists_insert on playlists for insert with check (user_id = auth.uid());
drop policy if exists playlists_update on playlists;
create policy playlists_update on playlists for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists playlists_delete on playlists;
create policy playlists_delete on playlists for delete using (user_id = auth.uid());

-- favorites
drop policy if exists favorites_select on favorites;
create policy favorites_select on favorites for select using (true);
drop policy if exists favorites_write on favorites;
create policy favorites_write on favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- follows
drop policy if exists follows_select on follows;
create policy follows_select on follows for select using (true);
drop policy if exists follows_write on follows;
create policy follows_write on follows for all using (follower_id = auth.uid()) with check (follower_id = auth.uid());

-- comments
drop policy if exists comments_select on comments;
create policy comments_select on comments for select using (true);
drop policy if exists comments_insert on comments;
create policy comments_insert on comments for insert with check (user_id = auth.uid());
drop policy if exists comments_update on comments;
create policy comments_update on comments for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists comments_delete on comments;
create policy comments_delete on comments for delete using (user_id = auth.uid());
