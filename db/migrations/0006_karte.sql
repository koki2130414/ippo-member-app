-- カルテ（個人の成長記録）: 目標・行動計画・記録（2026-11-12）
create table karte_goals (
  id text primary key,
  student_id text not null references members (user_id),
  term text not null check (term in ('season', 'month')),
  title text not null,
  reason text not null default '',
  measure text not null default '',
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('active', 'achieved', 'paused')),
  progress integer not null default 0 check (progress between 0 and 100),
  created_by text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index karte_goals_student_idx on karte_goals (student_id, start_date desc);

create table karte_actions (
  id text primary key,
  goal_id text not null references karte_goals (id),
  student_id text not null references members (user_id),
  text text not null,
  frequency text not null default '',
  created_by text not null,
  created_at timestamptz not null,
  archived_at timestamptz
);
create index karte_actions_student_idx on karte_actions (student_id);

create table karte_entries (
  id text primary key,
  student_id text not null references members (user_id),
  kind text not null check (kind in ('class', 'personal', 'practice', 'reflection', 'feedback', 'interview')),
  date date not null,
  title text not null,
  body text not null default '',
  goal_id text references karte_goals (id),
  rating integer check (rating between 1 and 5),
  video_url text,
  model_video_id text references videos (id),
  author_id text not null,
  author_role text not null,
  created_at timestamptz not null
);
create index karte_entries_student_idx on karte_entries (student_id, date desc);

-- ほかのテーブルと同じく、アプリのサーバー以外は読めない・書けない
alter table karte_goals enable row level security;
alter table karte_actions enable row level security;
alter table karte_entries enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table karte_goals, karte_actions, karte_entries from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table karte_goals, karte_actions, karte_entries from authenticated';
  end if;
end $$;
