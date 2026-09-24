import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 成功は role="status"、失敗は role="alert"（仕様 10.4）。
 * ブラウザ自動操作はこの role と文言で結果を読むので、見た目だけの通知にしない。
 */
export function StatusMessage({ tone, children, testId }: { tone: "success" | "error" | "info"; children: ReactNode; testId?: string }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      data-testid={testId}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "error" && "border-destructive/40 bg-destructive/10 text-destructive",
        tone === "success" && "border-success/40 bg-success/10 text-success",
        tone === "info" && "border-border bg-muted text-foreground",
      )}
    >
      {children}
    </p>
  );
}
