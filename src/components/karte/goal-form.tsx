"use client";

import { useState } from "react";
import type { KarteGoalStatus, KarteGoalTerm } from "@/domain/types";
import { saveKarteGoalAction } from "@/server/actions/karte-actions";
import { StatusMessage } from "../status-message";
import { Button } from "../ui/button";
import { FormField, inputClassName } from "../form-field";

export interface GoalFormValue {
  goalId?: string;
  term: KarteGoalTerm;
  title: string;
  reason: string;
  measure: string;
  startDate: string;
  endDate: string;
  status: KarteGoalStatus;
  progress: number;
}

/** 目標を作る・なおす（達成度もここで動かす） */
export function GoalForm({ studentId, initial, goals, idPrefix = "karte-goal" }: { studentId: string; initial: GoalFormValue; goals: (GoalFormValue & { goalId: string })[]; idPrefix?: string }) {
  const [value, setValue] = useState<GoalFormValue>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const field = (name: string) => `${idPrefix}-${name}`;

  function pick(goalId: string) {
    const found = goals.find((goal) => goal.goalId === goalId);
    setValue(found ?? initial);
    setMessage(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await saveKarteGoalAction({ ...value, studentId });
    setBusy(false);
    if (result.ok) {
      setMessage({ tone: "success", text: value.goalId ? "目標を更新しました" : "目標を作りました" });
      if (!value.goalId) setValue(initial);
    } else setMessage({ tone: "error", text: result.message });
  }

  const set = <K extends keyof GoalFormValue>(key: K, next: GoalFormValue[K]) => setValue((current) => ({ ...current, [key]: next }));

  return (
    <form onSubmit={submit} className="space-y-3" data-testid="karte-goal-form">
      {goals.length > 0 ? (
        <FormField id={field("pick")} label="なおす目標">
          <select id={field("pick")} value={value.goalId ?? ""} onChange={(event) => pick(event.target.value)} className={inputClassName} data-testid="karte-goal-pick">
            <option value="">＋ 新しい目標を作る</option>
            {goals.map((goal) => (
              <option key={goal.goalId} value={goal.goalId}>{goal.title}</option>
            ))}
          </select>
        </FormField>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id={field("term")} label="期間の種類">
          <select id={field("term")} value={value.term} onChange={(event) => set("term", event.target.value === "season" ? "season" : "month")} className={inputClassName}>
            <option value="month">今月の目標</option>
            <option value="season">シーズン目標</option>
          </select>
        </FormField>
        <FormField id={field("status")} label="状態">
          <select
            id={field("status")}
            value={value.status}
            onChange={(event) => set("status", event.target.value === "achieved" ? "achieved" : event.target.value === "paused" ? "paused" : "active")}
            className={inputClassName}
            data-testid="karte-goal-status-select"
          >
            <option value="active">とりくみ中</option>
            <option value="achieved">達成！</option>
            <option value="paused">おやすみ中</option>
          </select>
        </FormField>
      </div>
      <FormField id={field("title")} label="目標" hint="例: 左足でもインステップで蹴れるようになる">
        <input id={field("title")} value={value.title} onChange={(event) => set("title", event.target.value)} maxLength={60} className={inputClassName} data-testid="karte-goal-title-input" />
      </FormField>
      <FormField id={field("reason")} label="なぜその目標？（なくてもOK）">
        <input id={field("reason")} value={value.reason} onChange={(event) => set("reason", event.target.value)} maxLength={200} className={inputClassName} />
      </FormField>
      <FormField id={field("measure")} label="できたかどうかの見かた（なくてもOK）" hint="例: 10本中7本、ねらった所に">
        <input id={field("measure")} value={value.measure} onChange={(event) => set("measure", event.target.value)} maxLength={120} className={inputClassName} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField id={field("start")} label="はじまり">
          <input id={field("start")} type="date" value={value.startDate} onChange={(event) => set("startDate", event.target.value)} className={inputClassName} />
        </FormField>
        <FormField id={field("end")} label="おわり">
          <input id={field("end")} type="date" value={value.endDate} onChange={(event) => set("endDate", event.target.value)} className={inputClassName} />
        </FormField>
      </div>
      <FormField id={field("progress")} label={`達成度 ${value.progress}%`}>
        <input id={field("progress")} type="range" min={0} max={100} step={5} value={value.progress} onChange={(event) => set("progress", Number(event.target.value))} className="mt-2 w-full accent-[hsl(var(--primary))]" data-testid="karte-goal-progress-input" />
      </FormField>
      <Button type="submit" disabled={busy || value.title.trim() === ""} data-testid="karte-goal-submit">{value.goalId ? "目標を更新する" : "目標を作る"}</Button>
      {message ? <StatusMessage tone={message.tone} testId="karte-goal-result">{message.text}</StatusMessage> : null}
    </form>
  );
}
