-- 運営の「クラス資料一覧」（Notion）にあるテーマを、すでに入っているクラス動画4本の題名と説明に反映する（2026-10-13）
-- 新しい動画は、ビルドのたびの「無ければ入れる」で追加される（src/data/seed/ippo-videos.ts）
update videos set title = '強みを持つこと／股関節の可動域を広げよう（7/5）', description = '2026年7月5日のメンタリティ・フィットネスクラスの録画です。メンタリティ「強みを持つこと」、フィットネス「股関節の可動域を広げよう」。', category = 'mentality' where id = 'video-ippo-qgpwtpyur0q-20260705';
update videos set title = '"なぜ？"を考え続けることの大事さ（5/19）', description = '2026年5月19日のメンタリティクラスの録画です。テーマ「"なぜ？"を考え続けることの大事さ」。クラスの録画ができなかったため、岡田コーチが同じ内容を撮り直した動画です。クラス当日と少しちがうところがあります。', category = 'mentality' where id = 'video-ippo-glaslko1mqw-20260519';
update videos set title = 'サッカーの動きを全部つなげよう！（5/17）', description = '2026年5月17日のフィットネスクラスの録画です。テーマ「サッカーの動きを全部つなげよう！」。', category = 'fitness' where id = 'video-ippo-hmokd0rryl8-20260517';
update videos set title = '良い声かけ良いコミュニケーション／止まれる体が、次の一歩を速くする（4/5）', description = '2026年4月5日のメンタリティ・フィットネスクラスの録画です。メンタリティ「良い声かけ良いコミュニケーション」、フィットネス「止まれる体が、次の一歩を速くする」。', category = 'mentality' where id = 'video-ippo-xkf0dys5ydk-20260405';
