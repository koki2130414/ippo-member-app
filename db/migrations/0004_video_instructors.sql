-- クラス動画の担当コーチ（呼び名の一覧）。メンタリティとフィットネスで別のコーチが担当することがあるので配列（2026-10-13）
alter table videos add column instructors jsonb not null default '[]'::jsonb;
create index videos_instructors_idx on videos using gin (instructors);

-- 分かっている回だけ入れる（YouTube の説明欄と、運営の「クラス資料一覧」から）。運営が管理画面で直した値は上書きしない
update videos set instructors = '["ながコーチ"]'::jsonb where id = 'video-ippo-8oymqurlkt8-20260708' and instructors = '[]'::jsonb;
update videos set instructors = '["げんちコーチ"]'::jsonb where id = 'video-ippo-swjvxrxemky-20260621' and instructors = '[]'::jsonb;
update videos set instructors = '["岡田コーチ"]'::jsonb where id = 'video-ippo-glaslko1mqw-20260519' and instructors = '[]'::jsonb;
update videos set instructors = '["しゅうすけコーチ","りゅうコーチ"]'::jsonb where id = 'video-ippo-9fdo2bobfuc-20261004' and instructors = '[]'::jsonb;
update videos set instructors = '["荒木コーチ"]'::jsonb where id = 'video-ippo-ikfyoyii0lk-20241215' and instructors = '[]'::jsonb;
update videos set instructors = '["荒木コーチ"]'::jsonb where id = 'video-ippo-cdsjlqcggpy-20241117' and instructors = '[]'::jsonb;
update videos set instructors = '["荒木コーチ"]'::jsonb where id = 'video-ippo-kzac053ukje-20241020' and instructors = '[]'::jsonb;
update videos set instructors = '["原コーチ"]'::jsonb where id = 'video-ippo-dplsc5bfeo-20241006' and instructors = '[]'::jsonb;
update videos set instructors = '["荒木コーチ"]'::jsonb where id = 'video-ippo-kdde3oaha4-20240915' and instructors = '[]'::jsonb;
