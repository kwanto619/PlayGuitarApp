-- ── Notifications ─────────────────────────────────────────────────────
create table if not exists notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  actor_id   uuid references auth.users(id) on delete cascade,
  type       text not null,
  song_id    uuid references songs(id) on delete cascade,
  created_at timestamptz default now(),
  read_at    timestamptz
);

create index if not exists notifications_user_idx on notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx on notifications(user_id) where read_at is null;

alter table notifications enable row level security;

drop policy if exists notifications_select on notifications;
create policy notifications_select on notifications
  for select using (user_id = auth.uid());

drop policy if exists notifications_update on notifications;
create policy notifications_update on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notifications_delete on notifications;
create policy notifications_delete on notifications
  for delete using (user_id = auth.uid());

-- Trigger: new follow → notification for the followed user
create or replace function notify_follow()
returns trigger language plpgsql security definer as $$
begin
  insert into notifications (user_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow');
  return new;
end;
$$;

drop trigger if exists follows_notify_follow on follows;
create trigger follows_notify_follow
  after insert on follows
  for each row execute function notify_follow();

-- Trigger: new song → notification for every follower of the uploader
create or replace function notify_new_song()
returns trigger language plpgsql security definer as $$
begin
  if new.user_id is null then return new; end if;
  insert into notifications (user_id, actor_id, type, song_id)
  select f.follower_id, new.user_id, 'new_song', new.id
  from follows f
  where f.following_id = new.user_id;
  return new;
end;
$$;

drop trigger if exists songs_notify_new on songs;
create trigger songs_notify_new
  after insert on songs
  for each row execute function notify_new_song();
