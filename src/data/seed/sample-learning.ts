import type { Lecture, QuizQuestion, Video } from "@/domain/types";
import { SEED_CREATED_AT } from "./base-content";
import { DEMO_IDS } from "./ids";

/**
 * 画面確認用の講義・クイズ・動画（IPPO_SEED=sample のときだけ）。
 * 内容は一般的なサッカーの考え方で、特定の選手・チームの教材を写したものではない。
 * 正解がいつも同じ位置にならないよう、選択肢の並びを設問ごとに変えている。
 */

export const SAMPLE_EXTRA_VIDEOS: Video[] = [
  {
    id: "video-sample-scan",
    title: "パスを受けたあと、どこを向く？",
    description: "体の向きひとつで、つぎのプレーの選びやすさが変わります。",
    category: "soccer_iq",
    durationSeconds: 300,
    source: "upload",
    storageKey: "class-videos/sample/body-shape.mp4",
    muxPlaybackId: null,
    youtubeId: null,
    publishedAt: SEED_CREATED_AT,
    createdBy: DEMO_IDS.admin,
  },
  {
    id: "video-sample-routine",
    title: "試合の前の「いつものルーティン」をつくろう",
    description: "きんちょうする場面で、自分を落ちつかせる準備のしかた。",
    category: "mentality",
    durationSeconds: 240,
    source: "mux",
    storageKey: null,
    muxPlaybackId: "SampleSignedPlaybackId0002",
    youtubeId: null,
    publishedAt: SEED_CREATED_AT,
    createdBy: DEMO_IDS.admin,
  },
  {
    id: "video-sample-stretch",
    title: "練習のあとのストレッチ 5分",
    description: "ケガをしにくい体のために、毎日できるストレッチ。",
    category: "fitness",
    durationSeconds: 300,
    source: "upload",
    storageKey: "class-videos/sample/cooldown-stretch.mp4",
    muxPlaybackId: null,
    youtubeId: null,
    publishedAt: SEED_CREATED_AT,
    createdBy: DEMO_IDS.admin,
  },
  {
    id: "video-sample-qa",
    title: "コーチに聞いてみた：ミスがこわいとき",
    description: "オープンクラスで出た質問に、コーチが答えます。",
    category: "other",
    durationSeconds: 480,
    source: "upload",
    storageKey: "class-videos/sample/qa-fear-of-mistakes.mp4",
    muxPlaybackId: null,
    youtubeId: null,
    publishedAt: SEED_CREATED_AT,
    createdBy: DEMO_IDS.admin,
  },
];

type LectureSeed = {
  id: string;
  categoryId: string;
  title: string;
  body: string[];
  videoId: string | null;
  quiz: { prompt: string; choices: [string, boolean][]; explanation: string }[];
};

const LECTURE_SEEDS: LectureSeed[] = [
  {
    id: "lecture-scan",
    categoryId: "lc-basics",
    title: "「首をふる」ってなに？",
    videoId: "video-sample-upload",
    body: [
      "試合でボールをもらう前に、まわりを見ることを「首をふる」とか「スキャン」とよびます。",
      "ボールが来てから考えると、あいてにすぐ近づかれてしまいます。先に見ておけば、ボールが来たしゅんかんに、つぎのプレーをえらべます。",
      "見るものは3つ。あいてがどこにいるか、味方がどこにいるか、あいているスペースはどこか。",
      "はじめは「ボールが味方の足からはなれたら、1回見る」ときめて練習してみよう。なれてきたら、2回、3回とふやしていけます。",
    ],
    quiz: [
      { prompt: "首をふるのは、いつがいい？", choices: [["ボールが来る前", true], ["ボールをもらってから", false], ["試合が終わってから", false]], explanation: "先に見ておくと、ボールが来たときにすぐ動けます。" },
      { prompt: "首をふったときに見るものとして、あてはまらないのは？", choices: [["あいての場所", false], ["観客の数", true], ["あいているスペース", false]], explanation: "見るのは、あいて・味方・スペースの3つです。" },
      { prompt: "はじめて練習するときのおすすめは？", choices: [["いきなり5回見る", false], ["見ないでボールだけに集中する", false], ["ボールが味方の足からはなれたら1回見る", true]], explanation: "少しずつふやしていけば大丈夫。きのうの自分より1回多く見られたら一歩前進です。" },
    ],
  },
  {
    id: "lecture-positions",
    categoryId: "lc-positions",
    title: "ポジションの役わりを知ろう",
    videoId: null,
    body: [
      "サッカーには、ゴールキーパー、ディフェンダー、ミッドフィルダー、フォワードというポジションがあります。",
      "ディフェンダーは、あいてにゴールをゆるさないことが大きな役わり。ミッドフィルダーは、守りと攻めをつなぎます。フォワードは、ゴールをねらいます。",
      "でも、どのポジションでも「守るときはみんなで守り、攻めるときはみんなで攻める」ことが大切です。",
      "自分のポジションだけでなく、となりの選手が何をしているかも見てみよう。",
    ],
    quiz: [
      { prompt: "ミッドフィルダーの大きな役わりは？", choices: [["守りと攻めをつなぐ", true], ["ゴールの前にずっと立つ", false], ["ボールにさわらない", false]], explanation: "まん中で、チームの守りと攻めをつなぎます。" },
      { prompt: "守るときに大切なことは？", choices: [["ディフェンダーだけで守る", false], ["みんなで守る", true], ["フォワードは休む", false]], explanation: "どのポジションでも、チーム全体で守ります。" },
    ],
  },
  {
    id: "lecture-reset",
    categoryId: "lc-mind",
    title: "ミスのあとの「3秒の切りかえ」",
    videoId: "video-sample-mux",
    body: [
      "どんな選手でも、試合の中でたくさんミスをします。大事なのは、ミスをしないことより、ミスのあとにどうするかです。",
      "おすすめは「3秒の切りかえ」。1秒目で深呼吸、2秒目で自分だけの合言葉（たとえば「つぎ！」）、3秒目でボールと相手を見る。",
      "ミスをひきずっていると、つぎのプレーもおそくなります。切りかえが早い選手は、ミスを取り返すチャンスも多くなります。",
      "練習のときから、ミスのたびに3秒の切りかえをためしてみよう。",
    ],
    quiz: [
      { prompt: "ミスのあと、いちばん大事なことは？", choices: [["ずっと反省しつづける", false], ["つぎのプレーに切りかえる", true], ["プレーをやめる", false]], explanation: "ミスは誰にでもあります。切りかえが早いほど、取り返すチャンスがふえます。" },
      { prompt: "「3秒の切りかえ」の1秒目にすることは？", choices: [["合言葉を言う", false], ["ボールを見る", false], ["深呼吸", true]], explanation: "まず深呼吸で体を落ちつかせます。" },
      { prompt: "合言葉の例としてよいものは？", choices: [["「つぎ！」", true], ["「もうだめだ」", false], ["「あいつのせいだ」", false]], explanation: "前を向ける、短い言葉がおすすめです。" },
    ],
  },
  {
    id: "lecture-sleep",
    categoryId: "lc-body",
    title: "強くなるための「ねる」と「食べる」",
    videoId: null,
    body: [
      "練習でつかれた体は、ねているあいだに回復して、少しずつ強くなります。",
      "小学生なら9〜12時間、中学生なら8〜10時間くらいねるのがよいと言われています。ねる前のスマホやゲームは、ねむりを浅くしやすいので気をつけよう。",
      "食べることも練習のひとつです。ごはん・おかず・野菜・くだもの・牛乳などを、いろいろ食べることが体づくりにつながります。",
      "体調や食べものについて気になることがあるときは、おうちの人やお医者さんに相談しよう。",
    ],
    quiz: [
      { prompt: "体が回復して強くなるのは、主にいつ？", choices: [["ねているあいだ", true], ["テレビを見ているあいだ", false], ["練習の前だけ", false]], explanation: "ねむっているあいだに、体は回復します。" },
      { prompt: "ねる前に気をつけたいことは？", choices: [["スマホやゲームを長くしすぎない", true], ["たくさん走る", false], ["おかしをたくさん食べる", false]], explanation: "画面の光は、ねむりを浅くしやすいと言われています。" },
    ],
  },
];

export const SAMPLE_LECTURES: Lecture[] = LECTURE_SEEDS.map((seed) => ({
  id: seed.id,
  categoryId: seed.categoryId,
  title: seed.title,
  body: seed.body.join("\n\n"),
  videoId: seed.videoId,
  quizPassRatio: 0.6,
  publishedAt: SEED_CREATED_AT,
}));

export const SAMPLE_QUIZ_QUESTIONS: QuizQuestion[] = LECTURE_SEEDS.flatMap((seed) =>
  seed.quiz.map((question, questionIndex) => {
    const questionId = `${seed.id}-q${questionIndex + 1}`;
    return {
      id: questionId,
      lectureId: seed.id,
      prompt: question.prompt,
      explanation: question.explanation,
      choices: question.choices.map(([label, isCorrect], choiceIndex) => ({ id: `${questionId}-c${choiceIndex + 1}`, label, isCorrect })),
    };
  }),
);
