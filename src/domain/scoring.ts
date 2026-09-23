import type { CategoryScore, Diagnosis, DiagnosisQuestion, QuizQuestion } from "./types";

/**
 * クイズと診断の採点。必ずサーバーで呼ぶ（正解データはクライアントに無い）。
 *
 * 回答は「設問ID → 選択肢ID」。設問に無い選択肢IDが来たら不正解として数える。
 * 例外にしないのは、古い画面から送られた回答などで結果画面ごと落ちるより、採点して先へ進めるほうが子どもにやさしいため。
 */

export type Answers = Readonly<Record<string, string>>;

function isCorrectChoice(question: { choices: readonly { id: string; isCorrect: boolean }[] }, choiceId: string | undefined): boolean {
  if (choiceId === undefined) return false;
  return question.choices.some((choice) => choice.id === choiceId && choice.isCorrect);
}

export interface QuizResult {
  correctCount: number;
  total: number;
  passed: boolean;
  /** 送信後にだけ見せる。設問ごとの正誤と解説 */
  perQuestion: { questionId: string; correct: boolean; correctChoiceId: string | null; explanation: string }[];
}

export function gradeQuiz(questions: readonly QuizQuestion[], answers: Answers, passRatio: number): QuizResult {
  const perQuestion = questions.map((question) => ({
    questionId: question.id,
    correct: isCorrectChoice(question, answers[question.id]),
    correctChoiceId: question.choices.find((choice) => choice.isCorrect)?.id ?? null,
    explanation: question.explanation,
  }));
  const correctCount = perQuestion.filter((result) => result.correct).length;
  const total = questions.length;
  // 設問0件のクイズを「全問正解」で合格にしない（ポイントの抜け道になるため）
  const passed = total > 0 && correctCount / total >= passRatio;
  return { correctCount, total, passed, perQuestion };
}

/** 未回答があるか。全問答えるまで送信させない画面側の判定と、サーバー側の再確認の両方で使う */
export function findUnanswered(questions: readonly { id: string }[], answers: Answers): string[] {
  return questions.filter((question) => answers[question.id] === undefined).map((question) => question.id);
}

/**
 * 診断の採点。カテゴリーごとの正答率を返す。
 * 合計点や順位は返さない（他人と比べる材料を作らない。仕様 2章）。
 */
export function scoreDiagnosis(diagnosis: Diagnosis, questions: readonly DiagnosisQuestion[], answers: Answers): CategoryScore[] {
  return diagnosis.categories.map((category) => {
    const inCategory = questions.filter((question) => question.categoryCode === category.code);
    const correct = inCategory.filter((question) => isCorrectChoice(question, answers[question.id])).length;
    const total = inCategory.length;
    return {
      categoryCode: category.code,
      correct,
      total,
      percent: total === 0 ? 0 : Math.round((correct / total) * 100),
    };
  });
}

/** 前回との比較。比べるのは「昨日の自分」だけ */
export function compareWithPreviousAttempt(current: readonly CategoryScore[], previous: readonly CategoryScore[] | null) {
  return current.map((score) => {
    const before = previous?.find((item) => item.categoryCode === score.categoryCode) ?? null;
    return { categoryCode: score.categoryCode, percent: score.percent, deltaFromPrevious: before ? score.percent - before.percent : null };
  });
}
