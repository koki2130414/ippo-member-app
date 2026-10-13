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
  { youtubeId: "6a_wA2VtDLI", classDate: "2026-09-09", kind: "soccer_iq", durationSeconds: 3587, themes: ["ゴール前のオフザボールの準備〜各ポジションの準備〜"], instructors: ["長坂コーチ"] },
  { youtubeId: "FCHth1iGpNo", classDate: "2026-09-06", kind: "mentality_fitness", durationSeconds: 3527, themes: ["最初の努力がその後の自分を変える！", "身体の中心！体幹を鍛えよう！"] },
  { youtubeId: "OamL6B1WR8M", classDate: "2026-08-26", kind: "soccer_iq", durationSeconds: 3507, themes: ["点を取るためには何が必要？〜ゴール前でのオフザボールの準備〜"], instructors: ["長坂コーチ"] },
  { youtubeId: "2mb1vCmrKkE", classDate: "2026-08-24", kind: "seminar", durationSeconds: 8077, themes: ["小井土監督セミナー"] },
  { youtubeId: "kYITjzjJTSw", classDate: "2026-08-23", kind: "soccer_iq", durationSeconds: 3603, themes: ["点をとるためには何が必要？〜ゴール前でのオフザボールの準備〜"], instructors: ["長坂コーチ"] },
  { youtubeId: "-7AlBzmlMLA", classDate: "2026-08-16", kind: "mentality", durationSeconds: 1081, themes: ["失敗との向き合い方"], note: "クラスのあとに撮影した動画です。" },
  { youtubeId: "gIXzpGQ4_as", classDate: "2026-08-16", kind: "fitness", durationSeconds: 1917, themes: ["ヒップヒンジとパワーポジション"] },
  { youtubeId: "JG5INwFhj24", classDate: "2026-08-12", kind: "soccer_iq", durationSeconds: 3589, themes: ["オフザボールの準備〜各ポジションの準備2〜"], instructors: ["長坂コーチ"] },
  // YouTube のタイトルは「20280809」だが、公開日（2026-08-11）から 2026-08-09 のクラスと判断
  { youtubeId: "L7NIplgkfFs", classDate: "2026-08-09", kind: "soccer_iq", durationSeconds: 3625, themes: ["オフザボールの準備〜各ポジションの準備2〜"], instructors: ["長坂コーチ"] },
  { youtubeId: "TNDU9eLDcaM", classDate: "2026-08-02", kind: "mentality_fitness", durationSeconds: 3474, themes: ["競争を楽しもう", "止まる型を覚えよう"] },
  { youtubeId: "HGOmkwuSLCg", classDate: "2026-07-22", kind: "soccer_iq", durationSeconds: 3646, themes: ["オフザボールの準備〜各ポジションのコツ〜"], instructors: ["長坂コーチ"] },
  { youtubeId: "3-hovib6qtI", classDate: "2026-07-20", kind: "mentality_fitness", durationSeconds: 3668, themes: ["こころの使い方を学ぼう", "正しいお腹の力の入れ方を覚えよう"] },
  { youtubeId: "QJriQAKN9uY", classDate: "2026-07-12", kind: "soccer_iq", durationSeconds: 3650, themes: ["見えないところで差をつけろ〜オフザボールの準備〜"], instructors: ["長坂コーチ"] },
  { youtubeId: "8oYmQURLKT8", classDate: "2026-07-08", kind: "soccer_iq", durationSeconds: 3657, themes: ["見えないところで差をつけろ〜オフザボールの準備〜"], instructors: ["長坂コーチ"] },
  { youtubeId: "QGPWtPyUR0Q", classDate: "2026-07-05", kind: "mentality_fitness", durationSeconds: 3654, themes: ["強みを持つこと", "股関節の可動域を広げよう"] },
  { youtubeId: "elzTLHjY75k", classDate: "2026-06-28", kind: "soccer_iq", durationSeconds: 3606, themes: ["つなぐとける〜ゴールキックのコツ〜"], instructors: ["長坂コーチ"] },
  { youtubeId: "lge_ySQpLtg", classDate: "2026-06-24", kind: "soccer_iq", durationSeconds: 3557, themes: ["つなぐとける〜ゴールキックのコツ〜"], instructors: ["長坂コーチ"] },
  { youtubeId: "sWJVXRXeMKY", classDate: "2026-06-21", kind: "mentality_fitness", durationSeconds: 3631, themes: ["準備について考えよう！", "キック力を高めよう！"], instructors: ["げんちコーチ"] },
  { youtubeId: "vIxeq4d89xI", classDate: "2026-06-17", kind: "other", durationSeconds: 7517, themes: [] },
  { youtubeId: "mVNITYF9M7E", classDate: "2026-06-14", kind: "soccer_iq", durationSeconds: 3560, themes: ["これでもう困らない！ゴールキックのコツ"], instructors: ["長坂コーチ"] },
  { youtubeId: "UPyBYa6WTG8", classDate: "2026-06-10", kind: "soccer_iq", durationSeconds: 3568, themes: ["これでもう困らない！ゴールキックのコツ"], instructors: ["長坂コーチ"] },
  { youtubeId: "I4ulmbdTPoE", classDate: "2026-06-07", kind: "mentality_fitness", durationSeconds: 3549, themes: ["緊張を力にかえよう！", "身体をコントロールしよう 柔軟性編"] },
  { youtubeId: "Afe9AgkWC00", classDate: "2026-05-27", kind: "soccer_iq", durationSeconds: 3553, themes: ["コーナーキックで点を取らせない！〜コーナーキックの守備〜"], instructors: ["長坂コーチ"] },
  { youtubeId: "IEHLqIvQu4I", classDate: "2026-05-24", kind: "soccer_iq", durationSeconds: 3537, themes: ["コーナーキックで点を取らせない！〜コーナーキックの守備〜"], instructors: ["長坂コーチ"] },
  { youtubeId: "JI4bFlV-6nI", classDate: "2026-05-24", kind: "seminar", durationSeconds: 3474, themes: ["小川選手セミナー"] },
  { youtubeId: "GLAsLKO1MQw", classDate: "2026-05-19", kind: "mentality", durationSeconds: 594, themes: ["\"なぜ？\"を考え続けることの大事さ"], note: "クラスの録画ができなかったため、岡田コーチが同じ内容を撮り直した動画です。クラス当日と少しちがうところがあります。", instructors: ["岡田コーチ"] },
  { youtubeId: "HmOKd0RRYL8", classDate: "2026-05-17", kind: "fitness", durationSeconds: 1035, themes: ["サッカーの動きを全部つなげよう！"] },
  { youtubeId: "Eh6NxtRXnis", classDate: "2026-05-13", kind: "soccer_iq", durationSeconds: 3528, themes: ["コーナーキックから点を取ろう！"], instructors: ["長坂コーチ"] },
  { youtubeId: "5AHh5y-I4Z8", classDate: "2026-05-10", kind: "soccer_iq", durationSeconds: 3627, themes: ["コーナーキックから点を取ろう！"], instructors: ["長坂コーチ"] },
  // 同じタイトル（20260503_メンタリティ・フィットネス）の動画が2本ある。どちらも入れ、運営に確認中
  { youtubeId: "5-IKVIuZYj8", classDate: "2026-05-03", kind: "mentality_fitness", durationSeconds: 3642, themes: ["オフザピッチがサッカーを上手くする", "倒れても、次のプレーにつなげる体"] },
  { youtubeId: "MRrmgENf8_k", classDate: "2026-05-03", kind: "mentality_fitness", durationSeconds: 3581, themes: ["オフザピッチがサッカーを上手くする", "倒れても、次のプレーにつなげる体"], note: "同じ日付の、もう1本の録画です。" },
  { youtubeId: "JD9aruS7Ga4", classDate: "2026-04-26", kind: "soccer_iq", durationSeconds: 3577, themes: ["ピンチはいきなりやってくる2〜ディフェンシブサードでの攻撃→守備〜"], instructors: ["長坂コーチ"] },
  { youtubeId: "-Y3U8yFPmCU", classDate: "2026-04-22", kind: "soccer_iq", durationSeconds: 3560, themes: ["ピンチはいきなりやってくる2〜ディフェンシブサードでの攻撃→守備〜"], instructors: ["長坂コーチ"] },
  { youtubeId: "wv6iP8pxbL4", classDate: "2026-04-19", kind: "mentality_fitness", durationSeconds: 3642, themes: ["スポーツだからこそ学べること", "足の置き方で方向が変わる。足さばきを覚えよう！"] },
  { youtubeId: "cdhDYD_-IH0", classDate: "2026-04-12", kind: "soccer_iq", durationSeconds: 3545, themes: ["ピンチはいきなりやってくる！〜ディフェンシブサードでの攻撃→守備〜"], instructors: ["長坂コーチ"] },
  { youtubeId: "2bK7pf74P1g", classDate: "2026-04-08", kind: "soccer_iq", durationSeconds: 3516, themes: ["ピンチはいきなりやってくる！〜ディフェンシブサードでの攻撃→守備〜"], instructors: ["長坂コーチ"] },
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
  // ここから下は運営の「新カリキュラム」（Notion・サッカーIQ）から追加（2026-10-13）。長さは YouTube の動画情報から
  { youtubeId: "kxEQeAvVTPU", classDate: "2025-01-12", kind: "soccer_iq", durationSeconds: 3548, themes: ["サッカーってどんなスポーツ？～他のスポーツと比べてみよう"], note: "サッカーIQ 新カリキュラム 第1回。サッカーノート「今年の目標を立てよう」。", instructors: ["長坂コーチ"] },
  { youtubeId: "qNJfT8CVfB8", classDate: "2025-01-08", kind: "soccer_iq", durationSeconds: 3925, themes: ["サッカーってどんなスポーツ？～他のスポーツと比べてみよう"], note: "サッカーIQ 新カリキュラム 第1回。サッカーノート「今年の目標を立てよう」。はじめての方におすすめの回です。", instructors: ["長坂コーチ"] },
  { youtubeId: "m6iC6v7BRJw", classDate: "2025-01-26", kind: "soccer_iq", durationSeconds: 3913, themes: ["良い選手ってどんな選手？～相手と駆け引きできるようになろう！～"], note: "サッカーIQ 新カリキュラム 第2回。サッカーノート「自分を分析してみよう！」。", instructors: ["長坂コーチ"] },
  { youtubeId: "dkNsvR8CzyA", classDate: "2025-01-22", kind: "soccer_iq", durationSeconds: 3686, themes: ["良い選手ってどんな選手？～相手と駆け引きできるようになろう！～"], note: "サッカーIQ 新カリキュラム 第2回。サッカーノート「自分を分析してみよう！」。", instructors: ["長坂コーチ"] },
  { youtubeId: "I72GnJ5Z5R8", classDate: "2025-02-09", kind: "soccer_iq", durationSeconds: 3954, themes: ["攻撃ってなにをすればいいの？～攻撃の基礎を知ろう～"], note: "サッカーIQ 新カリキュラム 第3回。サッカーノート「有利に攻撃するための方法を考えてみよう」。", instructors: ["長坂コーチ"] },
  { youtubeId: "KbKjs904Xxs", classDate: "2025-02-12", kind: "soccer_iq", durationSeconds: 3959, themes: ["攻撃ってなにをすればいいの？～攻撃の基礎を知ろう～"], note: "サッカーIQ 新カリキュラム 第3回。サッカーノート「有利に攻撃するための方法を考えてみよう」。", instructors: ["長坂コーチ"] },
  { youtubeId: "1FIOTdEZwB4", classDate: "2025-02-23", kind: "soccer_iq", durationSeconds: 4172, themes: ["点のとり方が分かる！～ゴール前の攻撃編～"], note: "サッカーIQ 新カリキュラム 第4回。サッカーノート「有利に攻撃するための方法を考えてみよう2」。", instructors: ["長坂コーチ"] },
  { youtubeId: "EvFwt2oEPvI", classDate: "2025-02-26", kind: "soccer_iq", durationSeconds: 3903, themes: ["点のとり方が分かる！～ゴール前の攻撃編～"], note: "サッカーIQ 新カリキュラム 第4回。サッカーノート「有利に攻撃するための方法を考えてみよう2」。", instructors: ["長坂コーチ"] },
  { youtubeId: "KSS_CRs1y1A", classDate: "2025-03-09", kind: "soccer_iq", durationSeconds: 4271, themes: ["クロスから点がとれるようになる！～3つの優先順位～"], note: "サッカーIQ 新カリキュラム 第5回。サッカーノート「突破のドリル~レベル3～」。", instructors: ["長坂コーチ"] },
  { youtubeId: "1IOPEptdWss", classDate: "2025-03-12", kind: "soccer_iq", durationSeconds: 4045, themes: ["クロスから点がとれるようになる！～3つの優先順位～"], note: "サッカーIQ 新カリキュラム 第5回。サッカーノート「突破のドリル~レベル3～」。", instructors: ["長坂コーチ"] },
  { youtubeId: "X7CZ_7UJXyM", classDate: "2025-03-23", kind: "soccer_iq", durationSeconds: 3631, themes: ["ドリブル突破から点をとろう！～ドリブル突破の極意～"], note: "サッカーIQ 新カリキュラム 第6回。サッカーノート「サッカーIQクイズ」。", instructors: ["長坂コーチ"] },
  { youtubeId: "tedRAF7S5Hw", classDate: "2025-03-26", kind: "soccer_iq", durationSeconds: 3675, themes: ["ドリブル突破から点をとろう！～ドリブル突破の極意～"], note: "サッカーIQ 新カリキュラム 第6回。サッカーノート「サッカーIQクイズ」。", instructors: ["長坂コーチ"] },
  { youtubeId: "ucgK1TibJVw", classDate: "2025-04-13", kind: "soccer_iq", durationSeconds: 3669, themes: ["守備の原則を知って失点を減らそう！～ゴール前の守備編～"], note: "サッカーIQ 新カリキュラム 第7回。", instructors: ["長坂コーチ"] },
  { youtubeId: "GHRV8D5khiw", classDate: "2025-04-09", kind: "soccer_iq", durationSeconds: 4059, themes: ["守備の原則を知って失点を減らそう！～ゴール前の守備編～"], note: "サッカーIQ 新カリキュラム 第7回。", instructors: ["長坂コーチ"] },
  { youtubeId: "qTNdaVQ5hAs", classDate: "2025-04-27", kind: "soccer_iq", durationSeconds: 3639, themes: ["守備の原則を知って失点を減らそう！～シュートを打たせない～"], note: "サッカーIQ 新カリキュラム 第8回。", instructors: ["長坂コーチ"] },
  { youtubeId: "RJN7R8jF64o", classDate: "2025-04-23", kind: "soccer_iq", durationSeconds: 3606, themes: ["守備の原則を知って失点を減らそう！～シュートを打たせない～"], note: "サッカーIQ 新カリキュラム 第8回。", instructors: ["長坂コーチ"] },
  { youtubeId: "HmVPFouJkrc", classDate: "2025-05-11", kind: "soccer_iq", durationSeconds: 3578, themes: ["攻守の切り替え～アタッキングサード編～"], note: "サッカーIQ 新カリキュラム 第9回。", instructors: ["長坂コーチ"] },
  { youtubeId: "cJwK5bJwTYA", classDate: "2025-05-14", kind: "soccer_iq", durationSeconds: 3718, themes: ["攻守の切り替え～アタッキングサード編～"], note: "サッカーIQ 新カリキュラム 第9回。", instructors: ["長坂コーチ"] },
  { youtubeId: "I_8Twm691uo", classDate: "2025-05-25", kind: "soccer_iq", durationSeconds: 3871, themes: ["攻守の切り替え～守備から攻撃へ～"], note: "サッカーIQ 新カリキュラム 第10回。", instructors: ["長坂コーチ"] },
  { youtubeId: "zpRMFYn0u58", classDate: "2025-05-28", kind: "soccer_iq", durationSeconds: 3609, themes: ["攻守の切り替え～守備から攻撃へ～"], note: "サッカーIQ 新カリキュラム 第10回。", instructors: ["長坂コーチ"] },
  { youtubeId: "N2UvmryrohA", classDate: "2025-06-08", kind: "soccer_iq", durationSeconds: 3602, themes: ["攻守の切り替え～守備から攻撃へ２"], note: "サッカーIQ 新カリキュラム 第11回。", instructors: ["長坂コーチ"] },
  { youtubeId: "2rcB9EJg7NU", classDate: "2025-06-11", kind: "soccer_iq", durationSeconds: 3895, themes: ["攻守の切り替え～守備から攻撃へ２"], note: "サッカーIQ 新カリキュラム 第11回。", instructors: ["長坂コーチ"] },
  { youtubeId: "tglSxsJTzTo", classDate: "2025-06-22", kind: "soccer_iq", durationSeconds: 3895, themes: ["ゴール前へ侵入しよう～ミドルサードの攻撃～"], note: "サッカーIQ 新カリキュラム 第12回。", instructors: ["長坂コーチ"] },
  { youtubeId: "M-LfY283Yxw", classDate: "2025-06-25", kind: "soccer_iq", durationSeconds: 3662, themes: ["ゴール前へ侵入しよう～ミドルサードの攻撃～"], note: "サッカーIQ 新カリキュラム 第12回。", instructors: ["長坂コーチ"] },
  { youtubeId: "SlHs9-mOFhU", classDate: "2025-07-13", kind: "soccer_iq", durationSeconds: 3616, themes: ["4つのスペースを理解しよう～ミドルサードの攻撃～"], note: "サッカーIQ 新カリキュラム 第13回。", instructors: ["長坂コーチ"] },
  { youtubeId: "b_rFgM3Hp_U", classDate: "2025-07-09", kind: "soccer_iq", durationSeconds: 3643, themes: ["4つのスペースを理解しよう～ミドルサードの攻撃～"], note: "サッカーIQ 新カリキュラム 第13回。", instructors: ["長坂コーチ"] },
  { youtubeId: "yWmfANt60j4", classDate: "2025-07-27", kind: "soccer_iq", durationSeconds: 3638, themes: ["味方を助ける“斜め後ろ”のサポート～ミドルサードの攻撃～"], note: "サッカーIQ 新カリキュラム 第14回。", instructors: ["長坂コーチ"] },
  { youtubeId: "u_6ObSs9DCQ", classDate: "2025-07-23", kind: "soccer_iq", durationSeconds: 3568, themes: ["味方を助ける“斜め後ろ”のサポート～ミドルサードの攻撃～"], note: "サッカーIQ 新カリキュラム 第14回。", instructors: ["長坂コーチ"] },
  { youtubeId: "0yIKUOyRidk", classDate: "2025-08-10", kind: "soccer_iq", durationSeconds: 3670, themes: ["奪われたとき何をする？～ミドルサードでの攻→守の切り替え～"], note: "サッカーIQ 新カリキュラム 第15回。", instructors: ["長坂コーチ"] },
  { youtubeId: "MnwVtdDUjzE", classDate: "2025-08-13", kind: "soccer_iq", durationSeconds: 3400, themes: ["奪われたとき何をする？～ミドルサードでの攻→守の切り替え～"], note: "サッカーIQ 新カリキュラム 第15回。", instructors: ["長坂コーチ"] },
  { youtubeId: "GC6MmlTmGpE", classDate: "2025-08-24", kind: "soccer_iq", durationSeconds: 3692, themes: ["奪われる前の準備～ミドルサードでの攻→守の切り替え～"], note: "サッカーIQ 新カリキュラム 第16回。", instructors: ["長坂コーチ"] },
  { youtubeId: "gdBX8EYKLH8", classDate: "2025-08-27", kind: "soccer_iq", durationSeconds: 3400, themes: ["奪われる前の準備～ミドルサードでの攻→守の切り替え～"], note: "サッカーIQ 新カリキュラム 第16回。", instructors: ["長坂コーチ"] },
  { youtubeId: "ochUS8gXKRI", classDate: "2025-09-14", kind: "soccer_iq", durationSeconds: 3488, themes: ["ゴールを守る？ボールを奪う？～ミドルサードの守備～"], note: "サッカーIQ 新カリキュラム 第17回。", instructors: ["長坂コーチ"] },
  { youtubeId: "G3j2tKbMMN0", classDate: "2025-09-10", kind: "soccer_iq", durationSeconds: 3664, themes: ["ゴールを守る？ボールを奪う？～ミドルサードの守備～"], note: "サッカーIQ 新カリキュラム 第17回。", instructors: ["長坂コーチ"] },
  { youtubeId: "7VFRBLK1Ydk", classDate: "2025-09-28", kind: "soccer_iq", durationSeconds: 3672, themes: ["守備は追い込み漁？ボールを奪おう！～ミドルサードの守備～"], note: "サッカーIQ 新カリキュラム 第18回。", instructors: ["長坂コーチ"] },
  { youtubeId: "SuLg3H6ZwsQ", classDate: "2025-09-24", kind: "soccer_iq", durationSeconds: 3555, themes: ["守備は追い込み漁？ボールを奪おう！～ミドルサードの守備～"], note: "サッカーIQ 新カリキュラム 第18回。", instructors: ["長坂コーチ"] },
  { youtubeId: "K7-WzV_Ja70", classDate: "2025-10-12", kind: "soccer_iq", durationSeconds: 3849, themes: ["すばやく相手ゴールを目指そう～ミドルサードの守→攻"], note: "サッカーIQ 新カリキュラム 第19回。", instructors: ["長坂コーチ"] },
  { youtubeId: "jYezPErwalk", classDate: "2025-10-08", kind: "soccer_iq", durationSeconds: 3508, themes: ["すばやく相手ゴールを目指そう～ミドルサードの守→攻"], note: "サッカーIQ 新カリキュラム 第19回。", instructors: ["長坂コーチ"] },
  { youtubeId: "5a1i1nZxtag", classDate: "2025-10-26", kind: "soccer_iq", durationSeconds: 3336, themes: ["実は危険？カウンターの時に気を付けること～ミドルサードでの守→攻～"], note: "サッカーIQ 新カリキュラム 第20回。", instructors: ["長坂コーチ"] },
  { youtubeId: "Sl7jyV4DT7w", classDate: "2025-10-22", kind: "soccer_iq", durationSeconds: 3565, themes: ["実は危険？カウンターの時に気を付けること～ミドルサードでの守→攻～"], note: "サッカーIQ 新カリキュラム 第20回。", instructors: ["長坂コーチ"] },
  { youtubeId: "AuBabt5w0ww", classDate: "2025-11-09", kind: "soccer_iq", durationSeconds: 3784, themes: ["ビルドアップの3つの型とは～ディフェンシブサードの攻撃～"], note: "サッカーIQ 新カリキュラム 第21回。", instructors: ["長坂コーチ"] },
  { youtubeId: "9c9TkWBNAvE", classDate: "2025-11-12", kind: "soccer_iq", durationSeconds: 1436, themes: ["ビルドアップの3つの型とは～ディフェンシブサードの攻撃～"], note: "サッカーIQ 新カリキュラム 第21回。前半です。後半は別の動画です。", instructors: ["長坂コーチ"] },
  { youtubeId: "TX7k0XvEQx0", classDate: "2025-11-12", kind: "soccer_iq", durationSeconds: 2316, themes: ["ビルドアップの3つの型とは～ディフェンシブサードの攻撃～"], note: "サッカーIQ 新カリキュラム 第21回。後半です。", instructors: ["長坂コーチ"] },
  { youtubeId: "z58VVtdrCqo", classDate: "2025-11-23", kind: "soccer_iq", durationSeconds: 220, themes: ["ビルドアップの型を学ぼう1～ディフェンシブサードの攻撃～"], note: "サッカーIQ 新カリキュラム 第22回。前回の振り返りの短い動画です。本編は別の動画です。", instructors: ["長坂コーチ"] },
  { youtubeId: "pW2qR1Pwlys", classDate: "2025-11-26", kind: "soccer_iq", durationSeconds: 3546, themes: ["ビルドアップの型を学ぼう1～ディフェンシブサードの攻撃～"], note: "サッカーIQ 新カリキュラム 第22回。", instructors: ["長坂コーチ"] },
  { youtubeId: "_ZA-kGyVYMI", classDate: "2025-11-23", kind: "soccer_iq", durationSeconds: 3311, themes: ["ビルドアップの型を学ぼう1～ディフェンシブサードの攻撃～"], note: "サッカーIQ 新カリキュラム 第22回。本編です。", instructors: ["長坂コーチ"] },
  { youtubeId: "Q2N6AjSYptY", classDate: "2025-12-14", kind: "soccer_iq", durationSeconds: 3569, themes: ["ビルドアップの型を学ぼう2〜ディフェンシブサードの攻撃〜"], note: "サッカーIQ 新カリキュラム 第23回。", instructors: ["長坂コーチ"] },
  { youtubeId: "APsfLm_MtX4", classDate: "2025-12-10", kind: "soccer_iq", durationSeconds: 3586, themes: ["ビルドアップの型を学ぼう2〜ディフェンシブサードの攻撃〜"], note: "サッカーIQ 新カリキュラム 第23回。", instructors: ["長坂コーチ"] },
  { youtubeId: "2NKViPMcShA", classDate: "2025-12-28", kind: "soccer_iq", durationSeconds: 3614, themes: ["ビルドアップの型を学ぼう3〜ディフェンシブサードの攻撃〜"], note: "サッカーIQ 新カリキュラム 第24回。", instructors: ["長坂コーチ"] },
  { youtubeId: "4jkHMLjAKAs", classDate: "2025-12-26", kind: "soccer_iq", durationSeconds: 3529, themes: ["ビルドアップの型を学ぼう3〜ディフェンシブサードの攻撃〜"], note: "サッカーIQ 新カリキュラム 第24回。", instructors: ["長坂コーチ"] },
  { youtubeId: "X1XwlG3T0Ic", classDate: "2026-01-11", kind: "soccer_iq", durationSeconds: 3573, themes: ["ビルドアップの型を学ぼう4〜ディフェンシブサードの攻撃〜"], note: "サッカーIQ 新カリキュラム 第25回。", instructors: ["長坂コーチ"] },
  { youtubeId: "Uq_a4K7esf4", classDate: "2026-01-14", kind: "soccer_iq", durationSeconds: 3549, themes: ["ビルドアップの型を学ぼう4〜ディフェンシブサードの攻撃〜"], note: "サッカーIQ 新カリキュラム 第25回。", instructors: ["長坂コーチ"] },
  { youtubeId: "L8gb-xGtZjg", classDate: "2026-01-25", kind: "soccer_iq", durationSeconds: 3605, themes: ["ボールを奪うのはなんのため？〜アタッキングサードの守備〜"], note: "サッカーIQ 新カリキュラム 第26回。", instructors: ["長坂コーチ"] },
  { youtubeId: "GHweH_ssm2E", classDate: "2026-01-28", kind: "soccer_iq", durationSeconds: 3659, themes: ["ボールを奪うのはなんのため？〜アタッキングサードの守備〜"], note: "サッカーIQ 新カリキュラム 第26回。", instructors: ["長坂コーチ"] },
  { youtubeId: "roz7VtEt6CQ", classDate: "2026-02-08", kind: "soccer_iq", durationSeconds: 3270, themes: ["前プレのコツを知ろう！～アタッキングサードからの守備～"], note: "サッカーIQ 新カリキュラム 第27回。", instructors: ["長坂コーチ"] },
  { youtubeId: "uIU0dwJ9q-8", classDate: "2026-02-11", kind: "soccer_iq", durationSeconds: 3606, themes: ["前プレのコツを知ろう！～アタッキングサードからの守備～"], note: "サッカーIQ 新カリキュラム 第27回。", instructors: ["長坂コーチ"] },
  { youtubeId: "7YFDIXUk8nc", classDate: "2026-02-22", kind: "soccer_iq", durationSeconds: 3796, themes: ["「コーチング」でチームを勝たせる（鈴木大誠選手特別クラス）"], note: "サッカーIQ 新カリキュラム 第28回。", instructors: ["鈴木大誠選手"] },
  { youtubeId: "LuwqgqEsqe8", classDate: "2026-02-25", kind: "soccer_iq", durationSeconds: 3681, themes: ["「コーチング」でチームを勝たせる（鈴木大誠選手特別クラス）"], note: "サッカーIQ 新カリキュラム 第28回。特別クラスの解説会です。" },
  { youtubeId: "TyxQSKtxstA", classDate: "2026-03-08", kind: "soccer_iq", durationSeconds: 3631, themes: ["前プレのコツを知ろう2！～アタッキングサードからの守備～"], note: "サッカーIQ 新カリキュラム 第29回。", instructors: ["長坂コーチ"] },
  { youtubeId: "YODyqm3PwVA", classDate: "2026-03-11", kind: "soccer_iq", durationSeconds: 3610, themes: ["前プレのコツを知ろう2！～アタッキングサードからの守備～"], note: "サッカーIQ 新カリキュラム 第29回。", instructors: ["長坂コーチ"] },
  { youtubeId: "Avr3Z2nWwok", classDate: "2026-03-22", kind: "soccer_iq", durationSeconds: 3531, themes: ["カウンターから確実に点を取ろう！〜アタッキングサードでの守備→攻撃〜"], note: "サッカーIQ 新カリキュラム 第30回。", instructors: ["長坂コーチ"] },
  { youtubeId: "KlWmQNHgD8M", classDate: "2026-03-25", kind: "soccer_iq", durationSeconds: 3547, themes: ["カウンターから確実に点を取ろう！〜アタッキングサードでの守備→攻撃〜"], note: "サッカーIQ 新カリキュラム 第30回。", instructors: ["長坂コーチ"] },
  { youtubeId: "UI9L_YDmWcc", classDate: "2026-07-26", kind: "soccer_iq", durationSeconds: 3592, themes: ["オフザボールの準備〜各ポジションのコツ〜"], note: "サッカーIQ 新カリキュラム 第38回。", instructors: ["長坂コーチ"] },
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
