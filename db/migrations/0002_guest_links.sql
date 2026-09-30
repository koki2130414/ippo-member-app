-- 見学リンク（運営が発行し、知っている人はログインなしで会員画面を見られる）。有効なのは常に1本だけ
create table guest_links (
  id text primary key,
  token_hash text not null unique,
  created_by text not null,
  created_at timestamptz not null,
  revoked_at timestamptz
);
create unique index guest_links_one_active_key on guest_links ((true)) where revoked_at is null;

-- ほかのテーブルと同じく、アプリのサーバー以外は読めない・書けない
alter table guest_links enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table guest_links from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table guest_links from authenticated';
  end if;
end $$;
