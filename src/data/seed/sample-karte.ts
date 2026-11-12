import type { KarteAction, KarteEntry, KarteGoal } from "@/domain/types";
import { DEMO_IDS } from "./ids";

/**
 * カルテの架空データ（IPPO_SEED=sample のときだけ）。
 * - ヒカル: 目標・行動計画・クラス・パーソナル・自主練・振り返り・フィードバック・面談メモがそろっている（画面の見本）
 * - ミナト: 少しだけ（ウミコーチ担当）
 * - ツバサ: しばらく来ていない（コーチの「声かけの目安」に出る）
 * 面談メモ（interview）は、本人・保護者の画面に出ないことを E2E で確かめる相手。
 */

const at = (date: string) => `${date}T10:00:00.000Z`;

export const SAMPLE_KARTE_GOALS: KarteGoal[] = [
  {
    id: "kg-sample-001",
    studentId: DEMO_IDS.student,
    term: "season",
    title: "左足でもインステップで蹴れるようになる",
    reason: "右に追いこまれるとパスが出せないから",
    measure: "左足で10本中7本、ねらった所に蹴れる",
    startDate: "2026-09-01",
    endDate: "2027-02-28",
    status: "active",
    progress: 45,
    createdBy: DEMO_IDS.coach,
    createdAt: at("2026-09-01"),
    updatedAt: at("2026-11-08"),
  },
  {
    id: "kg-sample-002",
    studentId: DEMO_IDS.student,
    term: "month",
    title: "ボールをもらう前に2回、首をふる",
    reason: "前を向いてプレーしたいから",
    measure: "練習試合で、コーチに数えてもらう",
    startDate: "2026-11-01",
    endDate: "2026-11-30",
    status: "active",
    progress: 60,
    createdBy: DEMO_IDS.student,
    createdAt: at("2026-11-01"),
    updatedAt: at("2026-11-10"),
  },
  {
    id: "kg-sample-003",
    studentId: DEMO_IDS.student,
    term: "month",
    title: "リフティング 連続30回",
    reason: "",
    measure: "3日つづけて30回",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    status: "achieved",
    progress: 100,
    createdBy: DEMO_IDS.student,
    createdAt: at("2026-10-01"),
    updatedAt: at("2026-10-28"),
  },
  {
    id: "kg-sample-004",
    studentId: DEMO_IDS.student2,
    term: "season",
    title: "試合でシュートを1本以上うつ",
    reason: "",
    measure: "",
    startDate: "2026-10-01",
    endDate: "2027-01-31",
    status: "active",
    progress: 30,
    createdBy: DEMO_IDS.coach2,
    createdAt: at("2026-10-01"),
    updatedAt: at("2026-10-20"),
  },
];

export const SAMPLE_KARTE_ACTIONS: KarteAction[] = [
  { id: "ka-sample-001", goalId: "kg-sample-001", studentId: DEMO_IDS.student, text: "壁当て 左足50回", frequency: "週3回", createdBy: DEMO_IDS.coach, createdAt: at("2026-09-01"), archivedAt: null },
  { id: "ka-sample-002", goalId: "kg-sample-001", studentId: DEMO_IDS.student, text: "クラス動画「キックの基礎」を見なおす", frequency: "週1回", createdBy: DEMO_IDS.coach, createdAt: at("2026-09-01"), archivedAt: null },
  { id: "ka-sample-003", goalId: "kg-sample-002", studentId: DEMO_IDS.student, text: "パス練習で、受ける前に右・左を見る", frequency: "毎回の練習", createdBy: DEMO_IDS.student, createdAt: at("2026-11-01"), archivedAt: null },
  { id: "ka-sample-004", goalId: "kg-sample-004", studentId: DEMO_IDS.student2, text: "ペナルティエリアの外からシュート練習", frequency: "週2回", createdBy: DEMO_IDS.coach2, createdAt: at("2026-10-01"), archivedAt: null },
];

function entry(id: number, studentId: string, kind: KarteEntry["kind"], date: string, title: string, body: string, extra: Partial<KarteEntry> = {}): KarteEntry {
  const authorId = kind === "practice" || kind === "reflection" ? studentId : studentId === DEMO_IDS.student2 ? DEMO_IDS.coach2 : DEMO_IDS.coach;
  return {
    id: `ke-sample-${String(id).padStart(3, "0")}`,
    studentId,
    kind,
    date,
    title,
    body,
    goalId: null,
    rating: null,
    videoUrl: null,
    modelVideoId: null,
    authorId,
    authorRole: authorId === studentId ? "student" : "coach",
    createdAt: at(date),
    ...extra,
  };
}

const H = DEMO_IDS.student;

export const SAMPLE_KARTE_ENTRIES: KarteEntry[] = [
  // ヒカル（10月）
  entry(1, H, "class", "2026-10-04", "サッカーIQ: 首をふるタイミング", "ボールが動いている間に見る、を練習"),
  entry(2, H, "class", "2026-10-18", "メンタリティ: ミスのあとの切りかえ", ""),
  entry(3, H, "personal", "2026-10-11", "左足インステップ", "軸足を ボール1個ぶん 横に。足首を固める練習を中心に", { goalId: "kg-sample-001" }),
  entry(4, H, "practice", "2026-10-12", "公園で壁当て", "左足50回。10回くらいはまっすぐ飛んだ", { goalId: "kg-sample-001" }),
  entry(5, H, "practice", "2026-10-26", "リフティング", "31回できた！", { goalId: "kg-sample-003" }),
  entry(6, H, "reflection", "2026-10-31", "10月のふりかえり", "リフティングは達成。左足はまだ浮いてしまう", { rating: 3, goalId: "kg-sample-001" }),
  entry(7, H, "feedback", "2026-10-11", "軸足の位置がよくなった", "インパクトの瞬間に体が後ろに倒れないように。お手本の動画の 1:20 あたりを見てみよう", {
    goalId: "kg-sample-001",
    modelVideoId: "video-sample-upload",
  }),
  // ヒカル（11月）
  entry(8, H, "class", "2026-11-01", "サッカーIQ: 前を向く受け方", ""),
  entry(9, H, "class", "2026-11-08", "フィジカル: 体幹", ""),
  entry(10, H, "personal", "2026-11-08", "左足インステップ（2回目）", "10本中5本が枠の中。前回より +2本", { goalId: "kg-sample-001", videoUrl: "https://example.com/sample/hikaru-left-kick" }),
  entry(11, H, "practice", "2026-11-03", "公園で壁当て", "左足50回", { goalId: "kg-sample-001" }),
  entry(12, H, "practice", "2026-11-09", "パス練習で首をふる", "受ける前に2回見られたのは半分くらい", { goalId: "kg-sample-002" }),
  entry(13, H, "reflection", "2026-11-10", "今週のふりかえり", "首ふりを意識すると、前を向ける回数がふえた", { rating: 4, goalId: "kg-sample-002" }),
  entry(14, H, "feedback", "2026-11-08", "首ふりが自然になってきた", "練習試合で、受ける前に見る回数が先月の倍になっていました。つぎは「見たあとに何をするか」を決めておこう", {
    goalId: "kg-sample-002",
    modelVideoId: "video-sample-mux",
  }),
  entry(15, H, "interview", "2026-11-08", "11月の面談（保護者同席）", "本人は左足に自信がついてきた様子。学校の行事で12月は2回休む予定。"),
  // ミナト
  entry(16, DEMO_IDS.student2, "class", "2026-11-05", "フィジカル: スプリント", ""),
  entry(17, DEMO_IDS.student2, "feedback", "2026-11-05", "最初の3歩が速くなった", "腕ふりを大きく", { goalId: "kg-sample-004" }),
  // ツバサ（しばらく来ていない → 声かけの目安）
  entry(18, DEMO_IDS.student3, "class", "2026-10-04", "サッカーIQ: 首をふるタイミング", ""),
];
