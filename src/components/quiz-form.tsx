"use client";

import { useState } from "react";
import type { QuizQuestionPublic } from "@/domain/dto";
import { submitQuizAction } from "@/server/actions/learning-actions";
import { cn } from "@/lib/utils";
import { StatusMessage } from "./status-message";
import { Button } from "./ui/button";

type QuizResult = {
  correctCount: number;
  total: number;
  passed: boolean;
  perQuestion: { questionId: string; correct: boolean; correctChoiceId: string | null; explanation: string }[];
  pointsText: string | null;
};

/**
 * クイズ。受け取る設問には正解フラグが無い（QuizQuestionPublic）。
 * 正解と解説は、送信したあとのサーバーの採点結果にだけ入ってくる。
 */
export function QuizForm({ lectureId, questions, canSubmit, initiallyPassed }: { lectureId: string; questions: QuizQuestionPublic[]; canSubmit: boolean; initiallyPassed: boolean }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const unanswered = questions.filter((question) => answers[question.id] === undefined).length;
    if (unanswered > 0) {
      setError(`まだ答えていない問題が${unanswered}つあります。ぜんぶ答えてから送ってね`);
      return;
    }
    setBusy(true);
    const response = await submitQuizAction(lectureId, answers);
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    const points = response.data.points;
    setResult({
      ...response.data,
      pointsText: points?.kind === "awarded" ? `${points.amount}ポイントゲット` : points?.kind === "daily_limit_reached" ? points.message : null,
    });
  }

  function retry() {
    setAnswers({});
    setResult(null);
  }

  if (questions.length === 0) return null;

  return (
    <section aria-labelledby="quiz-heading" className="space-y-4" data-testid="quiz" data-state={busy ? "loading" : "ready"}>
      <h2 id="quiz-heading" className="text-lg font-bold">
        たしかめクイズ
        {initiallyPassed ? <span className="ml-2 text-xs font-semibold text-success">合格ずみ</span> : null}
      </h2>
      {!canSubmit ? <StatusMessage tone="info">クイズは生徒のアカウントで答えられます</StatusMessage> : null}

      <form onSubmit={submit} noValidate className="space-y-4">
        {questions.map((question, questionIndex) => {
          const outcome = result?.perQuestion.find((item) => item.questionId === question.id);
          return (
            <fieldset key={question.id} className="rounded-lg border border-border p-4" data-testid="quiz-question" disabled={result !== null || !canSubmit}>
              <legend className="px-1 font-semibold">Q{questionIndex + 1}. {question.prompt}</legend>
              <div className="mt-2 space-y-2">
                {question.choices.map((choice, choiceIndex) => {
                  const inputId = `quiz-q${questionIndex + 1}-c${choiceIndex + 1}`;
                  const isCorrectChoice = outcome?.correctChoiceId === choice.id;
                  return (
                    <div key={choice.id} className={cn("flex items-center gap-2 rounded-md px-2 py-1", isCorrectChoice && "bg-success/10")}>
                      <input
                        type="radio"
                        id={inputId}
                        name={`quiz-q${questionIndex + 1}`}
                        value={choice.id}
                        checked={answers[question.id] === choice.id}
                        onChange={() => setAnswers((previous) => ({ ...previous, [question.id]: choice.id }))}
                        className="h-5 w-5 accent-primary"
                      />
                      <label htmlFor={inputId} className="flex-1 cursor-pointer text-sm">{choice.label}</label>
                    </div>
                  );
                })}
              </div>
              {outcome ? (
                <p className={cn("mt-3 text-sm", outcome.correct ? "text-success" : "text-foreground")} data-testid="quiz-question-result">
                  <span className="font-semibold">{outcome.correct ? "せいかい！" : "おしい！"}</span> {outcome.explanation}
                </p>
              ) : null}
            </fieldset>
          );
        })}

        {error ? <StatusMessage tone="error" testId="quiz-error">{error}</StatusMessage> : null}

        {result ? (
          <div className="space-y-3">
            <StatusMessage tone={result.passed ? "success" : "info"} testId="quiz-result">
              {result.total}問中{result.correctCount}問せいかい。
              {result.passed ? `合格！${result.pointsText ? ` ${result.pointsText}` : ""}` : "解説を読んで、もう一度ちょうせんしてみよう"}
            </StatusMessage>
            <Button type="button" variant="outline" onClick={retry} data-testid="quiz-retry">もう一度ちょうせんする</Button>
          </div>
        ) : canSubmit ? (
          <Button type="submit" className="w-full" disabled={busy} data-busy={busy ? "true" : undefined} data-testid="quiz-submit">
            答えを送る
          </Button>
        ) : null}
      </form>
    </section>
  );
}
