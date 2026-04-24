-- ======================================================================
-- Playlist cloning — track the original author of a cloned playlist.
-- Run this in Supabase SQL Editor. Safe to re-run.
-- ======================================================================

alter table playlists
  add column if not exists cloned_from_user_id uuid
    references auth.users(id) on delete set null;

alter table playlists
  add column if not exists cloned_from_playlist_id uuid
    references playlists(id) on delete set null;

create index if not exists playlists_cloned_from_user_idx on playlists(cloned_from_user_id);
