-- ======================================================================
-- Progressions — per-user chord progressions.
-- Run this in Supabase SQL Editor. Safe to re-run.
--
-- Creates the table if missing, adds user_id ownership, enables RLS,
-- and backfills any orphan rows to the first signed-in user of your choice.
-- ======================================================================

create extension if not exists "uuid-ossp";

-- ── Table ─────────────────────────────────────────────────────────────
create table if not exists progressions (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete cascade,
  name       text not null,
  chords     text[] not null default '{}',
  bpm        integer not null default 100 check (bpm between 40 and 240),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- If the table existed before without user_id:
alter table progressions add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- ── Indexes ───────────────────────────────────────────────────────────
create index if not exists progressions_user_idx       on progressions(user_id);
create index if not exists progressions_created_at_idx on progressions(created_at desc);

-- ── Row Level Security ────────────────────────────────────────────────
alter table progressions enable row level security;

drop policy if exists progressions_select on progressions;
create policy progressions_select on progressions
  for select using (user_id = auth.uid());

drop policy if exists progressions_insert on progressions;
create policy progressions_insert on progressions
  for insert with check (user_id = auth.uid());

drop policy if exists progressions_update on progressions;
create policy progressions_update on progressions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists progressions_delete on progressions;
create policy progressions_delete on progressions
  for delete using (user_id = auth.uid());

-- ── Optional: backfill unowned rows to a specific user ────────────────
-- update progressions set user_id = '<your-uid>' where user_id is null;
