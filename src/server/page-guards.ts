import "server-only";
import { forbidden, redirect } from "next/navigation";
import type { Actor, UserRole } from "@/domain/types";
import { getCurrentActor } from "./current-actor";

/**
 * 画面（Server Component）の入口で呼ぶガード。
 * - 未ログイン → /login?next=元のパス
 * - ロール違い → 403（forbidden.tsx を表示し、ステータスも 403）
 *
 * proxy.ts はクッキーの有無しか見ないので、ロールの判定はここが担う。
 * さらに、どの生徒のデータかといった細かい判定は、サービス層でもう一度行う。
 */
export async function requirePageActor(roles: readonly UserRole[], currentPath: string): Promise<Actor> {
  const actor = await getCurrentActor();
  if (!actor) redirect(`/login?next=${encodeURIComponent(safeNextPath(currentPath))}`);
  if (!roles.includes(actor.role)) forbidden();
  return actor;
}

/** ログイン後の戻り先。外部サイトへの転送に使われないよう、サイト内のパスだけを許す */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/home";
  return value;
}
