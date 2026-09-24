"use client";

import { useEffect, useRef, useState } from "react";
import type { PlaybackGrant, VideoSummary } from "@/domain/dto";
import { completeVideoAction, startPlaybackAction } from "@/server/actions/learning-actions";
import { StatusMessage } from "./status-message";
import { Button } from "./ui/button";

/**
 * 動画プレイヤー。
 *
 * 最初の HTML には、配信元の秘密ID も再生トークンも含めない。
 * 「再生する」を押したときに Server Action（POST）で再生の許可をもらい、その戻り値はこのコンポーネントの
 * 状態（メモリ）にだけ置く。DOM の属性にも書かない（仕様 10.8）。
 *
 * 右クリック禁止などは入れていない。録画やダウンロードは技術的に防げず、入れても気休めにしかならないため（docs/03）。
 */

type Phase = "idle" | "loading" | "playing" | "error";

export function VideoPlayer({ video, minimumWatchSeconds, canEarnPoints, initiallyCompleted }: { video: VideoSummary; minimumWatchSeconds: number; canEarnPoints: boolean; initiallyCompleted: boolean }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [grant, setGrant] = useState<PlaybackGrant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const viewSessionIdRef = useRef<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completed, setCompleted] = useState(initiallyCompleted);
  const [completing, setCompleting] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    if (startedAt === null) return;
    // 経過時間は Date.now() の差で出す。非表示タブでタイマーが間引かれても、ずれない
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  async function play() {
    setPhase("loading");
    setError(null);
    const response = await startPlaybackAction(video.id);
    if (!response.ok) {
      setPhase("error");
      setError(response.message);
      return;
    }
    setGrant(response.data.grant);
    viewSessionIdRef.current = response.data.viewSessionId;
    setStartedAt(Date.now());
    setPhase("playing");
  }

  async function complete() {
    const viewSessionId = viewSessionIdRef.current;
    if (!viewSessionId) return;
    setCompleting(true);
    const response = await completeVideoAction(video.id, viewSessionId);
    setCompleting(false);
    if (!response.ok) {
      setResult({ tone: "info", text: response.message });
      return;
    }
    setCompleted(true);
    if (response.data.kind === "already_completed") {
      setResult({ tone: "success", text: "この動画は前にも見おわっているよ。何回見ても大丈夫！" });
    } else if (response.data.points.kind === "awarded") {
      setResult({ tone: "success", text: `見おわったね！ ${response.data.points.amount}ポイントゲット` });
    } else if (response.data.points.kind === "daily_limit_reached") {
      setResult({ tone: "success", text: `見おわったね！ ${response.data.points.message}` });
    } else {
      setResult({ tone: "success", text: "見おわったね！" });
    }
  }

  const remaining = Math.max(0, minimumWatchSeconds - elapsedSeconds);

  return (
    <section aria-label="動画プレイヤー" data-testid="video-player" data-state={phase === "loading" ? "loading" : phase === "error" ? "error" : "ready"} className="space-y-3">
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-secondary text-secondary-foreground">
        {phase !== "playing" || grant === null ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
            <p className="text-sm opacity-80">再生ボタンをおすと、動画が始まります</p>
            <Button type="button" size="lg" onClick={play} disabled={phase === "loading"} data-busy={phase === "loading" ? "true" : undefined} data-testid="video-play">
              {phase === "loading" ? "じゅんび中…" : "再生する"}
            </Button>
          </div>
        ) : (
          <PlaybackSurface grant={grant} title={video.title} elapsedSeconds={elapsedSeconds} durationSeconds={video.durationSeconds} />
        )}
      </div>

      {error ? <StatusMessage tone="error" testId="video-play-error">{error}</StatusMessage> : null}

      {canEarnPoints && phase === "playing" && !completed ? (
        <div className="space-y-2">
          <Button type="button" onClick={complete} disabled={completing} data-busy={completing ? "true" : undefined} data-testid="video-complete" className="w-full">
            見おわった！
          </Button>
          <p className="text-xs text-muted-foreground" data-testid="video-complete-hint">
            {remaining > 0 ? `あと${remaining}秒くらいで「見おわった」にできるよ` : "「見おわった」をおせるよ"}
          </p>
        </div>
      ) : null}
      {completed && !result ? <StatusMessage tone="info" testId="video-completed-badge">この動画は見おわっています</StatusMessage> : null}
      {result ? <StatusMessage tone={result.tone} testId="video-complete-result">{result.text}</StatusMessage> : null}
    </section>
  );
}

function PlaybackSurface({ grant, title, elapsedSeconds, durationSeconds }: { grant: PlaybackGrant; title: string; elapsedSeconds: number; durationSeconds: number }) {
  switch (grant.kind) {
    case "youtube":
      // youtube-nocookie: 再生するまで追跡用の cookie を置かないドメイン
      return (
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${grant.youtubeId}?rel=0&autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    case "mux":
      return <video className="h-full w-full" controls autoPlay playsInline src={`https://stream.mux.com/${grant.playbackId}.m3u8?token=${grant.token}`} />;
    case "signed_url":
      return <video className="h-full w-full" controls autoPlay playsInline src={grant.url} />;
    case "demo": {
      const percent = Math.min(100, Math.round((elapsedSeconds / durationSeconds) * 100));
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center" data-testid="video-demo-surface">
          <p className="font-semibold">デモ再生中</p>
          <p className="text-xs opacity-80">
            {grant.reason === "no_storage" ? "この環境には動画ファイルを置いていないため、再生のかわりに時間だけを進めています" : "この環境には Mux の鍵が無いため、再生のかわりに時間だけを進めています"}
          </p>
          <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-background/30" role="progressbar" aria-label="再生の進み具合" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
        </div>
      );
    }
  }
}
