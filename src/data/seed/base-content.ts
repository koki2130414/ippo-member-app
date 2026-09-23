import { DEFAULT_PLANS } from "@/domain/plans";
import { DEFAULT_POINT_RULES } from "@/domain/points";
import type { ClassRoom, Diagnosis, DiagnosisQuestion, LectureCategory } from "@/domain/types";

/**
 * どちらの seed にも入る「中身」。人物は1人も含めない。
 * 本番でもこのまま使える内容（プラン・ルール・クラス枠・講義カテゴリー・診断）だけを置く。
 */

/** seed の時刻は固定にする。実行するたびに値が変わると、自動操作やテストの結果が再現しないため */
export const SEED_CREATED_AT = "2026-09-01T00:00:00.000Z";

export const BASE_PLANS = DEFAULT_PLANS.map((plan) => ({ ...plan, limits: { ...plan.limits } }));
export const BASE_POINT_RULES = DEFAULT_POINT_RULES.map((rule) => ({ ...rule }));

/** クラス4枠。担当コーチは運営が割り当てるまで空 */
export const BASE_CLASS_ROOMS: ClassRoom[] = [
  {
    id: "class-soccer-iq",
    name: "サッカーIQクラス",
    category: "soccer_iq",
    description: "試合の場面を見ながら「どこを見る？」「つぎはどうする？」をいっしょに考えます。",
    schedule: { weekOfMonth: 1, weekday: 6, startTimeJst: "10:00", durationMinutes: 60 },
    coachIds: [],
    capacity: 20,
  },
  {
    id: "class-mentality",
    name: "メンタリティクラス",
    category: "mentality",
    description: "きんちょうしたとき、ミスしたあとに、どう切りかえるかを練習します。",
    schedule: { weekOfMonth: 2, weekday: 6, startTimeJst: "10:00", durationMinutes: 60 },
    coachIds: [],
    capacity: 20,
  },
  {
    id: "class-fitness",
    name: "フィットネスクラス",
    category: "fitness",
    description: "おうちでできる体の使い方と、ケガをしにくい体づくり。",
    schedule: { weekOfMonth: 3, weekday: 6, startTimeJst: "10:00", durationMinutes: 45 },
    coachIds: [],
    capacity: 20,
  },
  {
    id: "class-open",
    name: "オープンクラス",
    category: "other",
    description: "ふりかえりと質問の時間。なんでも聞いてみよう。",
    schedule: { weekOfMonth: "last", weekday: 0, startTimeJst: "19:00", durationMinutes: 45 },
    coachIds: [],
    capacity: 30,
  },
];

export const BASE_LECTURE_CATEGORIES: LectureCategory[] = [
  { id: "lc-basics", name: "サッカーのきほん", sortOrder: 1 },
  { id: "lc-positions", name: "ポジションと役わり", sortOrder: 2 },
  { id: "lc-mind", name: "こころの準備", sortOrder: 3 },
  { id: "lc-body", name: "からだのケア", sortOrder: 4 },
];

export const BASE_DIAGNOSIS: Diagnosis = {
  id: "diag-soccer-iq",
  title: "サッカーIQ診断",
  description: "9つの場面で「自分ならどうする？」を答えよう。結果は前回の自分とくらべるためのものだよ。",
  categories: [
    { code: "observe", label: "みる" },
    { code: "decide", label: "きめる" },
    { code: "prepare", label: "そなえる" },
  ],
};

type QuestionSeed = { categoryCode: string; prompt: string; choices: [string, boolean][] };

const QUESTION_SEEDS: QuestionSeed[] = [
  { categoryCode: "observe", prompt: "ボールをもらう前に、いちばん大事なことは？", choices: [["まわりを見て、あいてと味方の場所をたしかめる", true], ["ボールだけをじっと見る", false], ["その場で止まって待つ", false]] },
  { categoryCode: "observe", prompt: "味方がボールを持っているとき、あなたが見るとよいのは？", choices: [["ボールと、あいてがいないスペース", true], ["ベンチ", false], ["自分の足もと", false]] },
  { categoryCode: "observe", prompt: "あいてのゴールキーパーが前に出ているのに気づいた。どう考える？", choices: [["ロングシュートのチャンスかもしれない", true], ["気にしなくていい", false], ["パスをやめる", false]] },
  { categoryCode: "decide", prompt: "前があいていて、あいてが近くにいない。どうする？", choices: [["ボールを前に運ぶ", true], ["すぐに後ろへもどす", false], ["その場でリフティングする", false]] },
  { categoryCode: "decide", prompt: "あいて2人にかこまれた。味方がフリーでいる。どうする？", choices: [["フリーの味方にパスする", true], ["むりやりドリブルで2人ぬく", false], ["ボールを外にけり出す", false]] },
  { categoryCode: "decide", prompt: "試合の終わりぎわ、1点リードしている。ボールを持ったらどうする？", choices: [["むりをせず、ボールを大事にする", true], ["どこからでもシュートをうつ", false], ["わざと相手にわたす", false]] },
  { categoryCode: "prepare", prompt: "味方がボールをうばわれた。すぐにすることは？", choices: [["近くのあいてにプレッシャーをかけるか、もどる", true], ["くやしがって止まる", false], ["審判にアピールする", false]] },
  { categoryCode: "prepare", prompt: "コーナーキックで守るとき、大事なことは？", choices: [["マークする相手と、ボールの両方を見る", true], ["ボールだけを見る", false], ["ゴールの中に入る", false]] },
  { categoryCode: "prepare", prompt: "ミスをしたあと、つぎのプレーまでにすることは？", choices: [["深呼吸して、つぎに気持ちを切りかえる", true], ["ミスのことをずっと考える", false], ["プレーをやめる", false]] },
];

export const BASE_DIAGNOSIS_QUESTIONS: DiagnosisQuestion[] = QUESTION_SEEDS.map((seed, index) => {
  const questionId = `dq-${String(index + 1).padStart(2, "0")}`;
  return {
    id: questionId,
    diagnosisId: BASE_DIAGNOSIS.id,
    categoryCode: seed.categoryCode,
    prompt: seed.prompt,
    sortOrder: index + 1,
    // 正解がいつも1番目にならないよう、設問ごとに並びをずらす（見た目だけで当てられないように）
    choices: rotate(seed.choices, index % seed.choices.length).map(([label, isCorrect], choiceIndex) => ({
      id: `${questionId}-c${choiceIndex + 1}`,
      label,
      isCorrect,
    })),
  };
});

function rotate<T>(items: readonly T[], by: number): T[] {
  return [...items.slice(by), ...items.slice(0, by)];
}
