"use client";

import { useId, useState } from "react";
import { updateVideoInstructorsAction } from "@/server/actions/admin-actions";
import { StatusMessage } from "./status-message";
import { Button } from "./ui/button";

/** 動画1本ぶんの「担当コーチ」入力。呼び名を「、」で区切って入れる */
export function VideoInstructorsEditor({ videoId, initial, suggestions }: { videoId: string; initial: string[]; suggestions: string[] }) {
  const inputId = useId();
  const listId = useId();
  const [value, setValue] = useState(initial.join("、"));
  const [saved, setSaved] = useState(initial.join("、"));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    const result = await updateVideoInstructorsAction(videoId, value);
    setBusy(false);
    if (!result.ok) return setMessage({ tone: "error", text: result.message });
    const normalized = result.data.instructors.join("、");
    setValue(normalized);
    setSaved(normalized);
    setMessage({ tone: "success", text: result.data.instructors.length > 0 ? "保存しました" : "担当コーチを空にしました" });
  }

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-xs font-semibold text-muted-foreground">担当コーチ（「、」で区切る。例: しゅうすけコーチ、りゅうコーチ）</label>
      <div className="flex gap-2">
        <input
          id={inputId}
          list={listId}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={200}
          className="block w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm"
          data-testid="admin-video-coach-input"
        />
        <datalist id={listId}>
          {suggestions.map((name) => <option key={name} value={name} />)}
        </datalist>
        <Button type="button" size="sm" onClick={save} disabled={busy || value === saved} data-busy={busy ? "true" : undefined} data-testid="admin-video-coach-save">保存</Button>
      </div>
      {message ? <StatusMessage tone={message.tone} testId="admin-video-coach-result">{message.text}</StatusMessage> : null}
    </div>
  );
}
