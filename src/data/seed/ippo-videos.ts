import type { Video, VideoCategory } from "@/domain/types";
import { DEMO_IDS } from "./ids";

/**
 * IPPO が実際に配信しているクラス動画（YouTube・限定公開）。
 *
 * 人物のデータではなく教材なので、どちらの seed にも入れる。
 * YouTube 配信なので、動画のURLを知っている人はアプリの外でも見られる（会員画面には注意書きを出さない: 運営の判断 2026-10-01）。
 * 運営の判断（2026-09-29）で、限定公開の動画IDを公開リポジトリのコードに置いている。
 * 管理画面から動画を登録できるようになったら、ここから外してデータベースに移す。
 *
 * タイトル・長さ・テーマは YouTube の動画情報（2026-09-29 に取得）と、運営の「クラス資料一覧」（Notion）から。
 * 同じテーマを水曜・日曜の2回行うことがあるので、タイトルには開催日を入れて見分けられるようにしている。
 */

type ClassKind = "soccer_iq" | "mentality_fitness" | "mentality" | "fitness" | "seminar" | "other";

interface IppoVideoRow {
  youtubeId: string;
  /** クラスの開催日（JST）。YouTube のタイトルにある日付 */
  classDate: string;
  kind: ClassKind;
  durationSeconds: number;
  /** YouTube の説明にあるテーマ。メンタリティ・フィットネスのクラスは2つ */
  themes: string[];
  /** 動画の事情など、生徒に知らせたい補足 */
  note?: string;
  /**
   * 担当コーチの呼び名。YouTube の説明欄（「担当コーチからのコメント」）と、運営の「クラス資料一覧」の「授業作成者」から。
   * 分からない回は空。運営が管理画面の「クラス動画」で入れ直せる
   */
  instructors?: string[];
}

const ROWS: IppoVideoRow[] = [
  { youtubeId: "bJDmJon3lRg", classDate: "2026-09-27", kind: "soccer_iq", durationSeconds: 3593, themes: ["ゴール前のオフザボールの準備〜ポジション別②〜"] },
  { youtubeId: "fNq4QLf9_gg", classDate: "2026-09-26", kind: "soccer_iq", durationSeconds: 3511, themes: ["攻撃ってなにをすればいいの？〜攻撃の基礎を知ろう〜"] },
  { youtubeId: "3naIfVPPzKM", classDate: "2026-09-23", kind: "soccer_iq", durationSeconds: 3613, themes: ["ゴール前のオフザボールの準備〜ポジション別②（ボランチ・センターバック・キーパー）〜"] },
  { youtubeId: "6kfjyaymopI", classDate: "2026-09-20", kind: "mentality_fitness", durationSeconds: 3479, themes: ["自信の育て方", "ぶれない体の土台づくりをしよう"] },
  { youtubeId: "tlgwcd72ftE", classDate: "2026-09-12", kind: "soccer_iq", durationSeconds: 3483, themes: ["サッカーってどんなスポーツ？〜他のスポーツと比べてみよう〜"] },
  { youtubeId: "6a_wA2VtDLI", classDate: "2026-09-09", kind: "soccer_iq", durationSeconds: 3587, themes: ["ゴール前のオフザボールの準備〜各ポジションの準備〜"] },
  { youtubeId: "FCHth1iGpNo", classDate: "2026-09-06", kind: "mentality_fitness", durationSeconds: 3527, themes: ["最初の努力がその後の自分を変える！", "身体の中心！体幹を鍛えよう！"] },
  { youtubeId: "OamL6B1WR8M", classDate: "2026-08-26", kind: "soccer_iq", durationSeconds: 3507, themes: ["点を取るためには何が必要？〜ゴール前でのオフザボールの準備〜"] },
  { youtubeId: "2mb1vCmrKkE", classDate: "2026-08-24", kind: "seminar", durationSeconds: 8077, themes: ["小井土監督セミナー"] },
  { youtubeId: "kYITjzjJTSw", classDate: "2026-08-23", kind: "soccer_iq", durationSeconds: 3603, themes: [] },
  { youtubeId: "-7AlBzmlMLA", classDate: "2026-08-16", kind: "mentality", durationSeconds: 1081, themes: ["失敗との向き合い方"], note: "クラスのあとに撮影した動画です。" },
  { youtubeId: "gIXzpGQ4_as", classDate: "2026-08-16", kind: "fitness", durationSeconds: 1917, themes: ["ヒップヒンジとパワーポジション"] },
  { youtubeId: "JG5INwFhj24", classDate: "2026-08-12", kind: "soccer_iq", durationSeconds: 3589, themes: [] },
  // YouTube のタイトルは「20280809」だが、公開日（2026-08-11）から 2026-08-09 のクラスと判断
  { youtubeId: "L7NIplgkfFs", classDate: "2026-08-09", kind: "soccer_iq", durationSeconds: 3625, themes: ["オフザボールの準備〜各ポジションの準備2〜"] },
  { youtubeId: "TNDU9eLDcaM", classDate: "2026-08-02", kind: "mentality_fitness", durationSeconds: 3474, themes: ["競争を楽しもう", "止まる型を覚えよう"] },
  { youtubeId: "HGOmkwuSLCg", classDate: "2026-07-22", kind: "soccer_iq", durationSeconds: 3646, themes: [] },
  { youtubeId: "3-hovib6qtI", classDate: "2026-07-20", kind: "mentality_fitness", durationSeconds: 3668, themes: ["こころの使い方を学ぼう", "正しいお腹の力の入れ方を覚えよう"] },
  { youtubeId: "QJriQAKN9uY", classDate: "2026-07-12", kind: "soccer_iq", durationSeconds: 3650, themes: ["見えないところで差をつけろ〜オフザボールの準備〜"] },
  { youtubeId: "8oYmQURLKT8", classDate: "2026-07-08", kind: "soccer_iq", durationSeconds: 3657, themes: ["見えないところで差をつけろ〜オフザボールの準備〜"], instructors: ["ながコーチ"] },
  { youtubeId: "QGPWtPyUR0Q", classDate: "2026-07-05", kind: "mentality_fitness", durationSeconds: 3654, themes: ["強みを持つこと", "股関節の可動域を広げよう"] },
  { youtubeId: "elzTLHjY75k", classDate: "2026-06-28", kind: "soccer_iq", durationSeconds: 3606, themes: ["つなぐとける〜ゴールキックのコツ〜"] },
  { youtubeId: "lge_ySQpLtg", classDate: "2026-06-24", kind: "soccer_iq", durationSeconds: 3557, themes: [] },
  { youtubeId: "sWJVXRXeMKY", classDate: "2026-06-21", kind: "mentality_fitness", durationSeconds: 3631, themes: ["準備について考えよう！", "キック力を高めよう！"], instructors: ["げんちコーチ"] },
  { youtubeId: "vIxeq4d89xI", classDate: "2026-06-17", kind: "other", durationSeconds: 7517, themes: [] },
  { youtubeId: "mVNITYF9M7E", classDate: "2026-06-14", kind: "soccer_iq", durationSeconds: 3560, themes: [] },
  { youtubeId: "UPyBYa6WTG8", classDate: "2026-06-10", kind: "soccer_iq", durationSeconds: 3568, themes: ["これでもう困らない！ゴールキックのコツ"] },
  { youtubeId: "I4ulmbdTPoE", classDate: "2026-06-07", kind: "mentality_fitness", durationSeconds: 3549, themes: ["緊張を力にかえよう！", "身体をコントロールしよう 柔軟性編"] },
  { youtubeId: "Afe9AgkWC00", classDate: "2026-05-27", kind: "soccer_iq", durationSeconds: 3553, themes: ["コーナーキックで点を取らせない！〜コーナーキックの守備〜"] },
  { youtubeId: "IEHLqIvQu4I", classDate: "2026-05-24", kind: "soccer_iq", durationSeconds: 3537, themes: ["コーナーキックで点を取らせない！〜コーナーキックの守備〜"] },
  { youtubeId: "JI4bFlV-6nI", classDate: "2026-05-24", kind: "seminar", durationSeconds: 3474, themes: ["小川選手セミナー"] },
  { youtubeId: "GLAsLKO1MQw", classDate: "2026-05-19", kind: "mentality", durationSeconds: 594, themes: ["\"なぜ？\"を考え続けることの大事さ"], note: "クラスの録画ができなかったため、岡田コーチが同じ内容を撮り直した動画です。クラス当日と少しちがうところがあります。", instructors: ["岡田コーチ"] },
  { youtubeId: "HmOKd0RRYL8", classDate: "2026-05-17", kind: "fitness", durationSeconds: 1035, themes: ["サッカーの動きを全部つなげよう！"] },
  { youtubeId: "Eh6NxtRXnis", classDate: "2026-05-13", kind: "soccer_iq", durationSeconds: 3528, themes: ["コーナーキックから点を取ろう！"] },
  { youtubeId: "5AHh5y-I4Z8", classDate: "2026-05-10", kind: "soccer_iq", durationSeconds: 3627, themes: ["コーナーキックから点を取ろう！"] },
  // 同じタイトル（20260503_メンタリティ・フィットネス）の動画が2本ある。どちらも入れ、運営に確認中
  { youtubeId: "5-IKVIuZYj8", classDate: "2026-05-03", kind: "mentality_fitness", durationSeconds: 3642, themes: ["オフザピッチがサッカーを上手くする", "倒れても、次のプレーにつなげる体"] },
  { youtubeId: "MRrmgENf8_k", classDate: "2026-05-03", kind: "mentality_fitness", durationSeconds: 3581, themes: ["オフザピッチがサッカーを上手くする", "倒れても、次のプレーにつなげる体"], note: "同じ日付の、もう1本の録画です。" },
  { youtubeId: "JD9aruS7Ga4", classDate: "2026-04-26", kind: "soccer_iq", durationSeconds: 3577, themes: ["ピンチはいきなりやってくる2〜ディフェンシブサードでの攻撃→守備〜"] },
  { youtubeId: "-Y3U8yFPmCU", classDate: "2026-04-22", kind: "soccer_iq", durationSeconds: 3560, themes: ["ピンチはいきなりやってくる2〜ディフェンシブサードでの攻撃→守備〜"] },
  { youtubeId: "wv6iP8pxbL4", classDate: "2026-04-19", kind: "mentality_fitness", durationSeconds: 3642, themes: ["スポーツだからこそ学べること", "足の置き方で方向が変わる。足さばきを覚えよう！"] },
  { youtubeId: "cdhDYD_-IH0", classDate: "2026-04-12", kind: "soccer_iq", durationSeconds: 3545, themes: ["ピンチはいきなりやってくる！〜ディフェンシブサードでの攻撃→守備〜"] },
  { youtubeId: "2bK7pf74P1g", classDate: "2026-04-08", kind: "soccer_iq", durationSeconds: 3516, themes: ["ピンチはいきなりやってくる！〜ディフェンシブサードでの攻撃→守備〜"] },
  { youtubeId: "Xkf0dys5yDk", classDate: "2026-04-05", kind: "mentality_fitness", durationSeconds: 3438, themes: ["良い声かけ良いコミュニケーション", "止まれる体が、次の一歩を速くする"] },
  // ここから下は運営の「クラス資料一覧」（Notion・日曜クラス）から追加（2026-10-13）。長さは YouTube の動画情報から
  { youtubeId: "9FDo2BOBfUc", classDate: "2026-10-04", kind: "mentality_fitness", durationSeconds: 3593, themes: ["AIに負けない力とは？", "ぶつかっても倒れない姿勢を身につけよう"], instructors: ["しゅうすけコーチ", "りゅうコーチ"] },
  { youtubeId: "hhdFtjffQOs", classDate: "2026-03-01", kind: "mentality_fitness", durationSeconds: 3524, themes: ["環境にこだわる", "姿勢とリズムでパワーを作ろう"] },
  { youtubeId: "grLwbA5lpOw", classDate: "2026-02-15", kind: "mentality_fitness", durationSeconds: 3759, themes: ["いま出せる力の100%を出す", "ぐらぐらゼロの足づくり"] },
  { youtubeId: "HwIezcNDu0E", classDate: "2026-02-01", kind: "mentality_fitness", durationSeconds: 3695, themes: ["ゴミを拾える人になろう", "肩甲骨と体幹で当たり負けしない体を作ろう"] },
  { youtubeId: "imbGtEo0zl8", classDate: "2026-01-18", kind: "mentality_fitness", durationSeconds: 3554, themes: ["あいさつはチームを強くする", "当たり負けしない！【体の軸】と【腕のガード】"] },
  { youtubeId: "5_quGqnQlV0", classDate: "2026-01-04", kind: "mentality_fitness", durationSeconds: 3615, themes: ["凡事徹底しよう！", "お尻でダッシュ！ジャンプ！"] },
  { youtubeId: "AcrtZ1250u0", classDate: "2025-12-21", kind: "mentality_fitness", durationSeconds: 3585, themes: ["失敗なんてない！", "体幹をきたえる！"] },
  { youtubeId: "3CoKsGN37ow", classDate: "2025-12-07", kind: "mentality_fitness", durationSeconds: 3516, themes: ["一貫性のある行動を！", "体幹を使おう！"] },
  { youtubeId: "CmdEScllC-c", classDate: "2025-11-16", kind: "mentality_fitness", durationSeconds: 3605, themes: ["人の話を聞く大切さ", "ブレない身体の作り方――膝と肩の“守る力”を育てる"] },
  { youtubeId: "csyFYwgHKoA", classDate: "2025-11-02", kind: "mentality_fitness", durationSeconds: 3715, themes: ["自分で決めることの重要性", "足首を安定させよう"] },
  { youtubeId: "MVhcYH3GIkc", classDate: "2025-10-19", kind: "mentality_fitness", durationSeconds: 3693, themes: ["声かけの大切さを知ろう", "ヒップロック編②"] },
  { youtubeId: "FaFQwenA1sI", classDate: "2025-10-05", kind: "mentality_fitness", durationSeconds: 3603, themes: ["フェアプレーの大切さ", "パフォーマンスを高めよう ヒップロック編"] },
  { youtubeId: "99H9lYou5do", classDate: "2025-09-21", kind: "mentality_fitness", durationSeconds: 3409, themes: ["高みを目指し続ける", "パフォーマンスを高めよう-コア編"] },
  { youtubeId: "QsP8tZzOj84", classDate: "2025-09-07", kind: "mentality_fitness", durationSeconds: 3497, themes: ["諦めないことの大切さ", "身体をコントロールしよう 使える足首作り"], note: "15分30秒あたりを一部カットしています。" },
  { youtubeId: "UwbFf1UEv_o", classDate: "2025-08-17", kind: "mentality_fitness", durationSeconds: 3489, themes: ["振り返りの大切さ", "自分の身体をコントロールしよう！バランス編"] },
  { youtubeId: "66bo6zP-Kck", classDate: "2025-08-03", kind: "mentality_fitness", durationSeconds: 3439, themes: ["リスペクトの大切さを知ろう", "自分の身体をコントロールしよう！柔軟性編"], note: "著作権の都合で、17分30秒あたりを一部カットしています。" },
  { youtubeId: "3Tnrm1nPqn0", classDate: "2025-07-20", kind: "mentality_fitness", durationSeconds: 3866, themes: ["\"選択する\"ことについて考えよう", "正確に大きく足を動かそう2"] },
  { youtubeId: "QH168nNpJDE", classDate: "2025-07-06", kind: "mentality_fitness", durationSeconds: 3655, themes: ["目的意識を持とう", "正確に大きく足を動かそう"] },
  { youtubeId: "Xd-DT8L3DTY", classDate: "2025-06-15", kind: "mentality_fitness", durationSeconds: 3559, themes: ["’’質’’について考えよう！", "安定したフォームでキックしよう"] },
  { youtubeId: "JR5VrK9mAC8", classDate: "2025-05-18", kind: "mentality_fitness", durationSeconds: 3642, themes: ["成功する人の共通点は？？", "思った通りに股関節を動かそう2"] },
  { youtubeId: "h9miXAoFSBI", classDate: "2025-05-04", kind: "mentality_fitness", durationSeconds: 3961, themes: ["目的と手段を考えてみよう", "思った通りに股関節を動かそう"] },
  { youtubeId: "xP0iC4ieXKI", classDate: "2025-04-06", kind: "mentality_fitness", durationSeconds: 4054, themes: ["目標に向かって自分をコントロールしよう！", "キック力を高めよう"] },
  { youtubeId: "gVhyYYsS5VA", classDate: "2025-03-16", kind: "mentality_fitness", durationSeconds: 3580, themes: ["継続力は最強の武器", "ぶつかる動きを極めよう"] },
  { youtubeId: "nzfnQ4YCUEQ", classDate: "2025-03-02", kind: "mentality_fitness", durationSeconds: 3589, themes: ["運について考えよう", "ぶつかる力を高めよう２"] },
  { youtubeId: "eUkqcChaX74", classDate: "2025-02-16", kind: "mentality_fitness", durationSeconds: 3735, themes: ["行動に移そう", "ぶつかる力を高めよう"] },
  { youtubeId: "3zyWmJKHH08", classDate: "2025-02-02", kind: "mentality_fitness", durationSeconds: 3687, themes: ["準備について考えよう！", "ぶつかる動きを習得しよう"] },
  { youtubeId: "4KhYoEVH8ac", classDate: "2025-01-19", kind: "mentality_fitness", durationSeconds: 3678, themes: ["オフザピッチがサッカーを上手くする", "ぶつかる動きを習得しよう"] },
  { youtubeId: "vA7fOPYbirU", classDate: "2025-01-05", kind: "mentality_fitness", durationSeconds: 3625, themes: ["声を出そう", "体幹を安定させよう"], note: "はじめての方におすすめの回です。" },
  { youtubeId: "iKFyoYii0Lk", classDate: "2024-12-15", kind: "mentality_fitness", durationSeconds: 3626, themes: ["次の行動を決めること！", "ぶつかっても倒れない姿勢を身につけよう"], instructors: ["荒木コーチ"] },
  { youtubeId: "H0Guz_cvR_w", classDate: "2024-12-01", kind: "mentality_fitness", durationSeconds: 3818, themes: ["自分を分析しよう", "自由自在に止まって動けるようになろう"] },
  { youtubeId: "CDSJlqCgGpY", classDate: "2024-11-17", kind: "mentality_fitness", durationSeconds: 3629, themes: ["チャンスってなに？", "自由自在に止まって動けるようになろう"], instructors: ["荒木コーチ"] },
  { youtubeId: "kZac053UKJE", classDate: "2024-10-20", kind: "mentality_fitness", durationSeconds: 3508, themes: ["環境にこだわる", "相手に合わせて止まる練習しよう"], instructors: ["荒木コーチ"] },
  { youtubeId: "Dp-lsc5bFEo", classDate: "2024-10-06", kind: "mentality_fitness", durationSeconds: 3651, themes: ["一流の逆境力", "止まってからすぐに動こう"], instructors: ["原コーチ"] },
  { youtubeId: "6XdcYWWgu3E", classDate: "2026-03-15", kind: "mentality", durationSeconds: 3170, themes: ["アスリートのための睡眠講習会"], note: "拡大版の特別講座です。" },
  { youtubeId: "2deADzTtAT4", classDate: "2026-03-15", kind: "fitness", durationSeconds: 1853, themes: ["速い一歩は”姿勢”から"] },
  { youtubeId: "g9EVomZJaKk", classDate: "2025-04-20", kind: "mentality", durationSeconds: 1639, themes: ["リーダーシップを身につけよう"] },
  { youtubeId: "dpTJsFlBloc", classDate: "2025-04-20", kind: "fitness", durationSeconds: 2167, themes: ["股関節の可動域を広げよう"] },
  { youtubeId: "diVGOSvGJ5E", classDate: "2025-06-01", kind: "mentality", durationSeconds: 3897, themes: ["目標の力で夢に近づこう！（Build大谷智紘さん特別セミナー）"], note: "拡大版の特別セミナーです。フィットネスは別の動画です。" },
  { youtubeId: "TMiL5ZJTJZY", classDate: "2025-06-01", kind: "fitness", durationSeconds: 1637, themes: ["思った通りに股関節を動かそう３"] },
  { youtubeId: "gcZZALdt1Ms", classDate: "2024-11-03", kind: "mentality_fitness", durationSeconds: 3854, themes: ["スポーツが生き抜く力を育む", "いつでも動けるように止まろう"], note: "フィットネスの前半です。トライの説明と講話は別の動画です。" },
  { youtubeId: "K3Yy8OKOa3I", classDate: "2024-11-03", kind: "mentality", durationSeconds: 1734, themes: ["スポーツが生き抜く力を育む"], note: "トライの説明と講話の動画です。" },
  { youtubeId: "KdDe3O-AHa4", classDate: "2024-09-15", kind: "mentality", durationSeconds: 1438, themes: ["結果っていつ出る？"], instructors: ["荒木コーチ"] },
  { youtubeId: "qFR7MipIBH0", classDate: "2024-09-15", kind: "fitness", durationSeconds: 2198, themes: ["動きから止まる感覚を養おう"] },
];

const KIND_LABEL: Record<ClassKind, string> = {
  soccer_iq: "サッカーIQクラス",
  mentality_fitness: "メンタリティ・フィットネスクラス",
  mentality: "メンタリティクラス",
  fitness: "フィットネスクラス",
  seminar: "セミナー",
  other: "クラス",
};

/**
 * 動画のカテゴリーは1つしか持てない。メンタリティとフィットネスを1回で行うクラスは「メンタリティ」に入れ、
 * フィットネスのテーマはタイトルと説明に書く（タブで探すときに、どちらの言葉でも見つかるように）。
 */
const KIND_CATEGORY: Record<ClassKind, VideoCategory> = {
  soccer_iq: "soccer_iq",
  mentality_fitness: "mentality",
  mentality: "mentality",
  fitness: "fitness",
  seminar: "other",
  other: "other",
};

function monthDay(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function toVideo(row: IppoVideoRow): Video {
  const label = KIND_LABEL[row.kind];
  const topic = row.kind === "seminar" ? row.themes[0] ?? label : row.themes.join("／");
  const title = topic ? `${topic}（${monthDay(row.classDate)}）` : `${monthDay(row.classDate)}の${label}`;
  const [year, month, day] = row.classDate.split("-").map(Number);
  const themeText =
    row.kind === "mentality_fitness" && row.themes.length === 2
      ? `メンタリティ「${row.themes[0]}」、フィットネス「${row.themes[1]}」。`
      : row.themes.length > 0 && row.kind !== "seminar"
        ? `テーマ「${row.themes.join("」「")}」。`
        : "";
  return {
    id: `video-ippo-${row.youtubeId.replace(/[^A-Za-z0-9]/g, "").toLowerCase()}-${row.classDate.replace(/-/g, "")}`,
    title,
    description: [`${year}年${month}月${day}日の${label}の録画です。`, themeText, row.note ?? ""].filter(Boolean).join(""),
    category: KIND_CATEGORY[row.kind],
    durationSeconds: row.durationSeconds,
    source: "youtube",
    youtubeId: row.youtubeId,
    storageKey: null,
    muxPlaybackId: null,
    // 並び順に使う。クラスの開催日の 10:00（JST）
    instructors: row.instructors ?? [],
    publishedAt: `${row.classDate}T01:00:00.000Z`,
    createdBy: DEMO_IDS.admin,
  };
}

export const IPPO_CLASS_VIDEOS: Video[] = ROWS.map(toVideo);
