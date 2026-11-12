"use client";

import { useState } from "react";
import { KARTE_KIND_LABELS } from "@/domain/karte";
import type { KarteEntryKind } from "@/domain/types";
import { addKarteEntryAction } from "@/server/actions/karte-actions";
import { StatusMessage } from "../status-message";
import { Button } from "../ui/button";
import { FormField, inputClassName } from "../form-field";

const TITLE_HINT: Record<KarteEntryKind, string> = {
  class: "例: キックの基礎（インサイド・インステップ）",
  personal: "例: 左足のインステップ",
  practice: "例: 公園で壁当て",
  reflection: "例: 今週のふりかえり",
  feedback: "例: 軸足の置き方がよくなった",
  interview: "例: 11月の面談",
};

/** 記録を書く。えらべる種類は、サービスが「この人が書ける」と判定したものだけ */
export function EntryForm({ studentId, kinds, goals, modelVideos, today }: { studentId: string; kinds: KarteEntryKind[]; goals: { id: string; title: string }[]; modelVideos: { id: string; title: string }[]; today: string }) {
  const [kind, setKind] = useState<KarteEntryKind>(kinds[0] ?? "practice");
  const [date, setDate] = useState(today);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [goalId, setGoalId] = useState("");
  const [rating, setRating] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [modelVideoId, setModelVideoId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  if (kinds.length === 0) return null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await addKarteEntryAction({ studentId, kind, date, title, body, goalId, rating: kind === "reflection" ? rating : "", videoUrl, modelVideoId });
    setBusy(false);
    if (result.ok) {
      setTitle("");
      setBody("");
      setRating("");
      setVideoUrl("");
      setModelVideoId("");
      setMessage({ tone: "success", text: "記録しました" });
    } else setMessage({ tone: "error", text: result.message });
  }

  return (
    <form onSubmit={submit} className="space-y-3" data-testid="karte-entry-form">
      <div className="grid grid-cols-2 gap-3">
        <FormField id="karte-entry-kind" label="種類">
          <select
            id="karte-entry-kind"
            value={kind}
            onChange={(event) => setKind(kinds.find((candidate) => candidate === event.target.value) ?? kind)}
            className={inputClassName}
            data-testid="karte-entry-kind"
          >
            {kinds.map((candidate) => (
              <option key={candidate} value={candidate}>{KARTE_KIND_LABELS[candidate]}</option>
            ))}
          </select>
        </FormField>
        <FormField id="karte-entry-date" label="日付">
          <input id="karte-entry-date" type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} className={inputClassName} />
        </FormField>
      </div>
      {kind === "interview" ? <StatusMessage tone="info">面談メモは、担当コーチと運営だけが見られます。本人と保護者には表示されません。</StatusMessage> : null}
      <FormField id="karte-entry-title" label="タイトル" hint={TITLE_HINT[kind]}>
        <input id="karte-entry-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={60} className={inputClassName} data-testid="karte-entry-title" />
      </FormField>
      <FormField id="karte-entry-body" label="内容（なくてもOK）">
        <textarea id="karte-entry-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} rows={4} className={`${inputClassName} h-auto py-2`} data-testid="karte-entry-body" />
      </FormField>
      {goals.length > 0 ? (
        <FormField id="karte-entry-goal" label="つながる目標（なくてもOK）">
          <select id="karte-entry-goal" value={goalId} onChange={(event) => setGoalId(event.target.value)} className={inputClassName}>
            <option value="">えらばない</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>{goal.title}</option>
            ))}
          </select>
        </FormField>
      ) : null}
      {kind === "reflection" ? (
        <fieldset>
          <legend className="text-sm font-semibold">自分で何点？（5つが満点）</legend>
          <div className="mt-1 flex gap-1">
            {["1", "2", "3", "4", "5"].map((value) => (
              <label key={value} className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 text-lg font-bold ${rating === value ? "border-secondary bg-primary" : "border-border"}`}>
                <input type="radio" name="karte-entry-rating" value={value} checked={rating === value} onChange={() => setRating(value)} className="sr-only" data-testid={`karte-entry-rating-${value}`} />
                {value}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <FormField id="karte-entry-video" label="動画のリンク（なくてもOK）" hint="撮った動画の共有リンク（https:// から始まるもの）">
        <input id="karte-entry-video" type="url" inputMode="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} className={inputClassName} data-testid="karte-entry-video-url" />
      </FormField>
      {modelVideos.length > 0 ? (
        <FormField id="karte-entry-model" label="お手本の動画（なくてもOK）">
          <select id="karte-entry-model" value={modelVideoId} onChange={(event) => setModelVideoId(event.target.value)} className={inputClassName} data-testid="karte-entry-model-video-select">
            <option value="">えらばない</option>
            {modelVideos.map((video) => (
              <option key={video.id} value={video.id}>{video.title}</option>
            ))}
          </select>
        </FormField>
      ) : null}
      <Button type="submit" disabled={busy || title.trim() === ""} data-testid="karte-entry-submit">記録する</Button>
      {message ? <StatusMessage tone={message.tone} testId="karte-entry-result">{message.text}</StatusMessage> : null}
    </form>
  );
}
