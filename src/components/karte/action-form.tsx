"use client";

import { useState } from "react";
import { addKarteActionAction, archiveKarteActionAction } from "@/server/actions/karte-actions";
import { StatusMessage } from "../status-message";
import { Button } from "../ui/button";
import { FormField, inputClassName } from "../form-field";

/** 目標に「やること」を足す */
export function ActionForm({ goals }: { goals: { id: string; title: string }[] }) {
  const [goalId, setGoalId] = useState(goals[0]?.id ?? "");
  const [text, setText] = useState("");
  const [frequency, setFrequency] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  if (goals.length === 0) return <p className="text-sm text-muted-foreground">先に目標を作ると、やることを足せます。</p>;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await addKarteActionAction({ goalId, text, frequency });
    setBusy(false);
    if (result.ok) {
      setText("");
      setFrequency("");
      setMessage({ tone: "success", text: "やることを足しました" });
    } else setMessage({ tone: "error", text: result.message });
  }

  return (
    <form onSubmit={submit} className="space-y-3" data-testid="karte-action-form">
      <FormField id="karte-action-goal" label="どの目標の？">
        <select id="karte-action-goal" value={goalId} onChange={(event) => setGoalId(event.target.value)} className={inputClassName}>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>{goal.title}</option>
          ))}
        </select>
      </FormField>
      <FormField id="karte-action-text" label="やること" hint="例: 壁当て 左右50回ずつ">
        <input id="karte-action-text" value={text} onChange={(event) => setText(event.target.value)} maxLength={60} className={inputClassName} data-testid="karte-action-text" />
      </FormField>
      <FormField id="karte-action-frequency" label="回数・タイミング（なくてもOK）" hint="例: 週3回 / 練習の前">
        <input id="karte-action-frequency" value={frequency} onChange={(event) => setFrequency(event.target.value)} maxLength={30} className={inputClassName} />
      </FormField>
      <Button type="submit" disabled={busy || text.trim() === ""} data-testid="karte-action-submit">やることを足す</Button>
      {message ? <StatusMessage tone={message.tone} testId="karte-action-result">{message.text}</StatusMessage> : null}
    </form>
  );
}

export function ArchiveActionButton({ actionId }: { actionId: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await archiveKarteActionAction(actionId);
        setBusy(false);
      }}
      className="shrink-0 text-xs font-semibold text-muted-foreground underline print:hidden"
      data-testid="karte-action-archive"
    >
      おわり
    </button>
  );
}
