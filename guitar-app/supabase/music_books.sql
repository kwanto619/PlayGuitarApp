-- ======================================================================
-- Music Books — private per-user PDF library
-- Run in Supabase SQL Editor (top → bottom). Safe to re-run.
--
-- Every book is owned by exactly one user and is readable by nobody else.
-- The storage bucket is PRIVATE: bytes are only reachable through a signed
-- URL, which the app mints per-open after RLS has confirmed ownership.
-- ======================================================================

-- ── Bucket ────────────────────────────────────────────────────────────
-- public = false is the load-bearing bit. A public bucket would serve the
-- object to anyone holding the URL, which defeats the ownership check below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('music-books', 'music-books', false, 209715200, array['application/pdf'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = 209715200,
      allowed_mime_types = array['application/pdf'];

-- ── Catalogue table ───────────────────────────────────────────────────
-- storage_path is <uid>/<uuid>.pdf — the uid prefix is what the storage
-- policies match on, so a row can never point at another user's object.
create table if not exists music_books (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  author        text,
  storage_path  text not null unique,
  page_count    int,
  cover_data_url text,
  created_at    timestamptz default now()
);

create index if not exists music_books_user_idx on music_books (user_id, created_at desc);

alter table music_books enable row level security;

-- Owner-only. No public/shared read path exists by design — this is a
-- personal shelf, not a library others can browse.
drop policy if exists music_books_select_own on music_books;
create policy music_books_select_own on music_books
  for select using (auth.uid() = user_id);

drop policy if exists music_books_insert_own on music_books;
create policy music_books_insert_own on music_books
  for insert with check (auth.uid() = user_id);

drop policy if exists music_books_update_own on music_books;
create policy music_books_update_own on music_books
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists music_books_delete_own on music_books;
create policy music_books_delete_own on music_books
  for delete using (auth.uid() = user_id);

-- ── Storage object policies ───────────────────────────────────────────
-- storage.foldername(name) splits the object path; [1] is the first segment,
-- which we require to equal the caller's uid. So user A literally cannot
-- read, write, or sign a URL for an object under user B's prefix.
drop policy if exists music_books_objects_select on storage.objects;
create policy music_books_objects_select on storage.objects
  for select using (
    bucket_id = 'music-books'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists music_books_objects_insert on storage.objects;
create policy music_books_objects_insert on storage.objects
  for insert with check (
    bucket_id = 'music-books'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists music_books_objects_update on storage.objects;
create policy music_books_objects_update on storage.objects
  for update using (
    bucket_id = 'music-books'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists music_books_objects_delete on storage.objects;
create policy music_books_objects_delete on storage.objects
  for delete using (
    bucket_id = 'music-books'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
