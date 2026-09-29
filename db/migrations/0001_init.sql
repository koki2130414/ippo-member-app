-- IPPO 会員アプリ 初期スキーマ
--
-- 方針:
-- * アプリのサーバーだけがデータベースに接続する（Vercel の環境変数の接続文字列を使う）。
--   ブラウザから Supabase に直接つなぐ経路は作らないので、すべてのテーブルで RLS を有効にし、
--   anon / authenticated ロールには何も許さない（最後の砦。公開用のキーが漏れても何も読めない）。
-- * 日時は timestamptz（UTC で保存）。「JST の今日」は jst_date 列（YYYY-MM-DD の文字列）で持つ。
-- * ID はアプリが作る文字列（uuid など）。

create table members (
  user_id text primary key,
  role text not null check (role in ('student', 'guardian', 'coach', 'admin')),
  display_name text not null,
  avatar_key text not null default 'default',
  age_band text check (age_band in ('elementary_lower', 'elementary_upper', 'junior_high', 'adult')),
  full_name text not null default '',
  email text,
  grade text,
  prefecture text,
  created_at timestamptz not null,
  deleted_at timestamptz
);
-- 退会していない会員のあいだで、メールアドレスは1つだけ
create unique index members_email_active_key on members (email) where email is not null and deleted_at is null;
create index members_role_idx on members (role, created_at);

create table parent_student_links (
  guardian_id text not null references members (user_id),
  student_id text not null references members (user_id),
  created_at timestamptz not null,
  primary key (guardian_id, student_id)
);

create table coach_assignments (
  coach_id text not null references members (user_id),
  student_id text not null references members (user_id),
  created_at timestamptz not null,
  primary key (coach_id, student_id)
);

create table plans (
  code text primary key,
  name text not null,
  monthly_price_yen integer not null check (monthly_price_yen >= 0),
  sort_order integer not null,
  limits jsonb not null
);

create table memberships (
  id bigint generated always as identity primary key,
  user_id text not null references members (user_id),
  plan_code text not null references plans (code),
  started_at timestamptz not null,
  ended_at timestamptz,
  assigned_by text not null
);
-- 今のプランは1人1つだけ
create unique index memberships_active_key on memberships (user_id) where ended_at is null;

create table point_rules (
  code text primary key,
  label text not null,
  points integer,
  max_per_day integer,
  granted_by text not null check (granted_by in ('system', 'coach', 'admin'))
);

-- ポイントは取引履歴が正。残高の列は作らない。冪等キーで二重付与を止める
create table point_transactions (
  id text primary key,
  user_id text not null references members (user_id),
  amount integer not null check (amount <> 0),
  reason text not null,
  idempotency_key text not null unique,
  jst_date text not null check (jst_date ~ '^\d{4}-\d{2}-\d{2}$'),
  created_at timestamptz not null,
  created_by text not null,
  note text
);
create index point_transactions_daily_idx on point_transactions (user_id, reason, jst_date);

create table exchange_items (
  id text primary key,
  name text not null,
  cost_points integer not null check (cost_points > 0),
  stock integer not null check (stock >= 0)
);

create table audit_logs (
  id text primary key,
  actor_id text not null,
  actor_role text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null
);
create index audit_logs_created_idx on audit_logs (created_at desc);

create table videos (
  id text primary key,
  title text not null,
  description text not null,
  category text not null check (category in ('soccer_iq', 'mentality', 'fitness', 'other')),
  duration_seconds integer not null check (duration_seconds > 0),
  source text not null check (source in ('upload', 'mux', 'youtube')),
  storage_key text,
  mux_playback_id text,
  youtube_id text,
  published_at timestamptz,
  created_by text not null
);
create index videos_list_idx on videos (category, published_at desc);

create table class_rooms (
  id text primary key,
  name text not null,
  category text not null,
  description text not null,
  schedule jsonb not null,
  coach_ids text[] not null default '{}',
  capacity integer not null
);

create table class_enrollments (
  class_room_id text not null references class_rooms (id),
  student_id text not null references members (user_id),
  created_at timestamptz not null,
  primary key (class_room_id, student_id)
);

create table lecture_categories (
  id text primary key,
  name text not null,
  sort_order integer not null
);

create table lectures (
  id text primary key,
  category_id text not null references lecture_categories (id),
  title text not null,
  body text not null,
  video_id text references videos (id),
  quiz_pass_ratio real not null,
  published_at timestamptz
);

-- choices の isCorrect はサーバー専用。アプリは DTO に変換してからしか外へ出さない
create table quiz_questions (
  id text primary key,
  lecture_id text not null references lectures (id),
  prompt text not null,
  explanation text not null,
  choices jsonb not null
);

create table diagnoses (
  id text primary key,
  title text not null,
  description text not null,
  categories jsonb not null
);

create table diagnosis_questions (
  id text primary key,
  diagnosis_id text not null references diagnoses (id),
  category_code text not null,
  prompt text not null,
  sort_order integer not null,
  choices jsonb not null
);

create table soccer_notes (
  id text primary key,
  student_id text not null references members (user_id),
  photo_storage_key text not null,
  student_comment text not null,
  coach_id text,
  coach_reply text,
  submitted_at timestamptz not null,
  replied_at timestamptz
);

create table video_reviews (
  id text primary key,
  student_id text not null references members (user_id),
  storage_key text not null,
  student_comment text not null,
  coach_id text,
  coach_reply text,
  submitted_at timestamptz not null,
  replied_at timestamptz
);

create table video_progress (
  user_id text not null references members (user_id),
  video_id text not null references videos (id),
  watched_seconds integer not null,
  completed_at timestamptz,
  primary key (user_id, video_id)
);

create table lecture_progress (
  user_id text not null references members (user_id),
  lecture_id text not null references lectures (id),
  completed_at timestamptz,
  quiz_passed_at timestamptz,
  primary key (user_id, lecture_id)
);

create table view_sessions (
  id text primary key,
  user_id text not null,
  kind text not null check (kind in ('video', 'lecture')),
  target_id text not null,
  started_at timestamptz not null
);

create table registration_applications (
  id text primary key,
  status text not null check (status in ('pending', 'approved', 'rejected')),
  guardian_email text not null,
  child_full_name text not null,
  child_display_name text not null,
  grade text not null,
  prefecture text not null,
  consent_version text not null,
  created_at timestamptz not null,
  reviewed_at timestamptz,
  reviewed_by text,
  review_note text,
  student_user_id text,
  guardian_user_id text
);
create index registration_applications_status_idx on registration_applications (status, created_at);

-- 招待リンク・セッションは、トークンそのものではなくハッシュだけを持つ
create table invitations (
  id text primary key,
  token_hash text not null unique,
  purpose text not null check (purpose in ('family_setup', 'account_setup')),
  guardian_user_id text,
  student_user_id text,
  account_user_id text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by text not null,
  created_at timestamptz not null
);

create table credentials (
  user_id text primary key references members (user_id),
  login_id text not null unique,
  password_hash text not null,
  updated_at timestamptz not null
);

create table sessions (
  token_hash text primary key,
  user_id text not null references members (user_id),
  created_at timestamptz not null,
  expires_at timestamptz not null
);
create index sessions_user_idx on sessions (user_id);

-- RLS: すべてのテーブルで有効にし、ポリシーは作らない（= アプリのサーバー以外は読めない・書けない）
do $$
declare
  table_name text;
begin
  for table_name in select tablename from pg_tables where schemaname = current_schema() loop
    execute format('alter table %I enable row level security', table_name);
  end loop;
  -- Supabase には anon / authenticated ロールがある。念のため権限も外す（ロールが無い環境では飛ばす）
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema ' || quote_ident(current_schema()) || ' from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on all tables in schema ' || quote_ident(current_schema()) || ' from authenticated';
  end if;
end $$;
