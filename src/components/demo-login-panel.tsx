"use client";

import { useActionState } from "react";
import { demoSignInAction, type DemoSignInState } from "@/server/actions/auth-actions";
import type { UserRole } from "@/domain/types";
import { StatusMessage } from "./status-message";
import { Button } from "./ui/button";

const ROLE_BUTTONS: { role: UserRole; label: string; description: string }[] = [
  { role: "student", label: "生徒としてログイン", description: "動画・講義・ポイント" },
  { role: "guardian", label: "保護者としてログイン", description: "子どもの様子を見る" },
  { role: "coach", label: "コーチとしてログイン", description: "担当の生徒を見る" },
  { role: "admin", label: "運営としてログイン", description: "管理画面" },
];

const initialState: DemoSignInState = { message: null };

/** デモモード専用のワンクリックログイン（仕様 10.7）。本番モードではこの部品自体を描画しない */
export function DemoLoginPanel({ availableRoles, next }: { availableRoles: UserRole[]; next: string | null }) {
  const [state, formAction, pending] = useActionState(demoSignInAction, initialState);
  return (
    <div className="space-y-3" data-testid="demo-login-panel">
      {ROLE_BUTTONS.filter((item) => availableRoles.includes(item.role)).map((item) => (
        <form key={item.role} action={formAction}>
          <input type="hidden" name="role" value={item.role} />
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <Button type="submit" variant="outline" className="h-auto w-full flex-col items-start py-3" disabled={pending} data-busy={pending ? "true" : undefined} data-testid={`demo-login-${item.role}`}>
            <span>{item.label}</span>
            <span className="text-xs font-normal text-muted-foreground">{item.description}</span>
          </Button>
        </form>
      ))}
      {state.message ? <StatusMessage tone="error" testId="demo-login-error">{state.message}</StatusMessage> : null}
    </div>
  );
}
