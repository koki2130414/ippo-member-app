import type { ReactNode } from "react";

/**
 * ラベル・入力・エラーのひとまとまり（仕様 10.6）。
 * エラーは DOM のテキストで出し、aria-describedby で入力と結ぶ（自動操作からも読めるように）。
 */
export const inputClassName = "mt-1 block h-11 w-full rounded-lg border border-input bg-background px-3 text-base";

export function FormField({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string | undefined; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      {children}
      {hint ? <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="mt-1 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

/** 入力要素に付ける aria 属性（ヒントとエラーを読み上げの対象にする） */
export function describedBy(id: string, hasHint: boolean, error: string | undefined): { "aria-describedby"?: string; "aria-invalid"?: true } {
  const ids = [hasHint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return { ...(ids ? { "aria-describedby": ids } : {}), ...(error ? { "aria-invalid": true as const } : {}) };
}
