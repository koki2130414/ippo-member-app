import type { Video, VideoCategory } from "@/domain/types";
import { DEMO_IDS } from "./ids";

/**
 * IPPO が実際に配信しているクラス動画（YouTube・限定公開）。
 *
 * 人物のデータではなく教材なので、どちらの seed にも入れる。
 * YouTube 配信なので、画面には必ず「アプリの外でも見られる」表示が出る。
 * 運営の判断（2026-09-29）で、限定公開の動画IDを公開リポジトリのコードに置いている。
 * 管理画面から動画を登録できるようになったら、ここから外してデータベースに移す。
 *
 * タイトル・長さ・テーマは YouTube の動画情報（2026-09-29 に取得）から。
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
  { youtubeId: "8oYmQURLKT8", classDate: "2026-07-08", kind: "soccer_iq", durationSeconds: 3657, themes: ["見えないところで差をつけろ〜オフザボールの準備〜"] },
  { youtubeId: "QGPWtPyUR0Q", classDate: "2026-07-05", kind: "mentality_fitness", durationSeconds: 3654, themes: [] },
  { youtubeId: "elzTLHjY75k", classDate: "2026-06-28", kind: "soccer_iq", durationSeconds: 3606, themes: ["つなぐとける〜ゴールキックのコツ〜"] },
  { youtubeId: "lge_ySQpLtg", classDate: "2026-06-24", kind: "soccer_iq", durationSeconds: 3557, themes: [] },
  { youtubeId: "sWJVXRXeMKY", classDate: "2026-06-21", kind: "mentality_fitness", durationSeconds: 3631, themes: ["準備について考えよう！", "キック力を高めよう！"] },
  { youtubeId: "vIxeq4d89xI", classDate: "2026-06-17", kind: "other", durationSeconds: 7517, themes: [] },
  { youtubeId: "mVNITYF9M7E", classDate: "2026-06-14", kind: "soccer_iq", durationSeconds: 3560, themes: [] },
  { youtubeId: "UPyBYa6WTG8", classDate: "2026-06-10", kind: "soccer_iq", durationSeconds: 3568, themes: ["これでもう困らない！ゴールキックのコツ"] },
  { youtubeId: "I4ulmbdTPoE", classDate: "2026-06-07", kind: "mentality_fitness", durationSeconds: 3549, themes: ["緊張を力にかえよう！", "身体をコントロールしよう 柔軟性編"] },
  { youtubeId: "Afe9AgkWC00", classDate: "2026-05-27", kind: "soccer_iq", durationSeconds: 3553, themes: ["コーナーキックで点を取らせない！〜コーナーキックの守備〜"] },
  { youtubeId: "IEHLqIvQu4I", classDate: "2026-05-24", kind: "soccer_iq", durationSeconds: 3537, themes: ["コーナーキックで点を取らせない！〜コーナーキックの守備〜"] },
  { youtubeId: "JI4bFlV-6nI", classDate: "2026-05-24", kind: "seminar", durationSeconds: 3474, themes: ["小川選手セミナー"] },
  { youtubeId: "GLAsLKO1MQw", classDate: "2026-05-19", kind: "mentality", durationSeconds: 594, themes: [], note: "クラスの録画ができなかったため、岡田コーチが同じ内容を撮り直した動画です。クラス当日と少しちがうところがあります。" },
  { youtubeId: "HmOKd0RRYL8", classDate: "2026-05-17", kind: "fitness", durationSeconds: 1035, themes: [] },
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
  { youtubeId: "Xkf0dys5yDk", classDate: "2026-04-05", kind: "fitness", durationSeconds: 3438, themes: [] },
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
    publishedAt: `${row.classDate}T01:00:00.000Z`,
    createdBy: DEMO_IDS.admin,
  };
}

export const IPPO_CLASS_VIDEOS: Video[] = ROWS.map(toVideo);
