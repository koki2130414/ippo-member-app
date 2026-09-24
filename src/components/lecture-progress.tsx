"use client";

import { useEffect, useRef, useState } from "react";
import { completeLectureAction, startLectureAction } from "@/server/actions/learning-actions";
import { StatusMessage } from "./status-message";
import { Button } from "./ui/button";

/**
 * 講義の「読みおわった」。
 * ページを開いたら POST で読みはじめを記録し（GET の描画では書き込まない）、
 * 最低限の時間が経ったかはサーバーが判定する。ここでの残り秒数は目安の表示だけ。
 */
export function LectureProgress({ lectureId, minimumReadSeconds, initiallyCompleted }: { lectureId: string; minimumReadSeconds: number; initiallyCompleted: boolean }) {
  const viewSessionIdRef = useRef<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completed, setCompleted] = useState(initiallyCompleted);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    if (initiallyCompleted) return;
    let cancelled = false;
    void startLectureAction(lectureId).then((response) => {
      if (cancelled) return;
      if (response.ok) {
        viewSessionIdRef.current = response.data.viewSessionId;
        setStartedAt(Date.now());
      } else {
        setResult({ tone: "error", text: response.message });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lectureId, initiallyCompleted]);

  useEffect(() => {
    if (startedAt === null) return;
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  async function complete() {
    const viewSessionId = viewSessionIdRef.current;
    if (!viewSessionId) return;
    setBusy(true);
    const response = await completeLectureAction(lectureId, viewSessionId);
    setBusy(false);
    if (!response.ok) {
      setResult({ tone: "info", text: response.message });
      return;
    }
    setCompleted(true);
    const points = response.data.kind === "completed" ? response.data.points : null;
    setResult({
      tone: "success",
      text: points?.kind === "awarded" ? `読みおわったね！ ${points.amount}ポイントゲット` : points?.kind === "daily_limit_reached" ? `読みおわったね！ ${points.message}` : "読みおわったね！",
    });
  }

  if (completed && !result) return <StatusMessage tone="info" testId="lecture-completed-badge">この講義は読みおわっています</StatusMessage>;
  if (result && completed) return <StatusMessage tone={result.tone} testId="lecture-complete-result">{result.text}</StatusMessage>;

  const remaining = Math.max(0, minimumReadSeconds - elapsedSeconds);
  return (
    <div className="space-y-2" data-testid="lecture-progress" data-state={startedAt === null ? "loading" : "ready"}>
      <Button type="button" className="w-full" onClick={complete} disabled={busy || startedAt === null} data-busy={busy ? "true" : undefined} data-testid="lecture-complete">
        読みおわった！
      </Button>
      <p className="text-xs text-muted-foreground" data-testid="lecture-complete-hint">
        {remaining > 0 ? `あと${remaining}秒くらいで「読みおわった」にできるよ` : "「読みおわった」をおせるよ"}
      </p>
      {result ? <StatusMessage tone={result.tone} testId="lecture-complete-result">{result.text}</StatusMessage> : null}
    </div>
  );
}
