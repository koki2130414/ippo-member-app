import { describe, expect, it } from "vitest";
import { compareWithPreviousAttempt, findUnanswered, gradeQuiz, scoreDiagnosis } from "./scoring";
import type { Diagnosis, DiagnosisQuestion, QuizQuestion } from "./types";

const quiz: QuizQuestion[] = [
  { id: "q1", lectureId: "l1", prompt: "", explanation: "e1", choices: [{ id: "a", label: "", isCorrect: true }, { id: "b", label: "", isCorrect: false }] },
  { id: "q2", lectureId: "l1", prompt: "", explanation: "e2", choices: [{ id: "c", label: "", isCorrect: false }, { id: "d", label: "", isCorrect: true }] },
];

describe("クイズ採点", () => {
  it("正答数と合否", () => {
    expect(gradeQuiz(quiz, { q1: "a", q2: "d" }, 0.8)).toMatchObject({ correctCount: 2, total: 2, passed: true });
    expect(gradeQuiz(quiz, { q1: "a", q2: "c" }, 0.8)).toMatchObject({ correctCount: 1, passed: false });
  });
  it("他の設問の選択肢IDを送っても正解にならない", () => {
    expect(gradeQuiz(quiz, { q1: "d", q2: "a" }, 0.5).correctCount).toBe(0);
  });
  it("設問0件は合格にしない", () => {
    expect(gradeQuiz([], {}, 0).passed).toBe(false);
  });
  it("未回答を見つける", () => {
    expect(findUnanswered(quiz, { q1: "a" })).toEqual(["q2"]);
  });
});

describe("診断採点", () => {
  const diagnosis: Diagnosis = { id: "d1", title: "", description: "", categories: [{ code: "see", label: "みる" }, { code: "decide", label: "きめる" }, { code: "empty", label: "から" }] };
  const questions: DiagnosisQuestion[] = [
    { id: "q1", diagnosisId: "d1", categoryCode: "see", prompt: "", sortOrder: 1, choices: [{ id: "a", label: "", isCorrect: true }, { id: "b", label: "", isCorrect: false }] },
    { id: "q2", diagnosisId: "d1", categoryCode: "see", prompt: "", sortOrder: 2, choices: [{ id: "c", label: "", isCorrect: true }, { id: "d", label: "", isCorrect: false }] },
    { id: "q3", diagnosisId: "d1", categoryCode: "decide", prompt: "", sortOrder: 3, choices: [{ id: "e", label: "", isCorrect: true }] },
  ];
  it("カテゴリーごとの正答率（合計点は出さない）", () => {
    expect(scoreDiagnosis(diagnosis, questions, { q1: "a", q2: "d", q3: "e" })).toEqual([
      { categoryCode: "see", correct: 1, total: 2, percent: 50 },
      { categoryCode: "decide", correct: 1, total: 1, percent: 100 },
      { categoryCode: "empty", correct: 0, total: 0, percent: 0 },
    ]);
  });
  it("前回の自分との差だけを出す", () => {
    const current = [{ categoryCode: "see", correct: 2, total: 2, percent: 100 }];
    expect(compareWithPreviousAttempt(current, [{ categoryCode: "see", correct: 1, total: 2, percent: 50 }])).toEqual([{ categoryCode: "see", percent: 100, deltaFromPrevious: 50 }]);
    expect(compareWithPreviousAttempt(current, null)[0]?.deltaFromPrevious).toBeNull();
  });
});
