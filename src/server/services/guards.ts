import type { AuthorizationDecision } from "@/domain/authorization";
import { canAdminister, canViewStudentData, hasRole } from "@/domain/authorization";
import type { Actor, UserId, UserRole } from "@/domain/types";
import { logger } from "../logger";
import { forbidden, unauthenticated } from "./errors";

/**
 * 認可ガード（仕様 4.3 の2層目＝本丸）。
 * すべての Server Action とサービス関数は、データに触る前にここを通す。
 * 判定の中身は domain/authorization.ts にあり、ここは「拒否なら例外にする」だけ。
 */

export function requireActor(actor: Actor | null): Actor {
  if (!actor) throw unauthenticated();
  return actor;
}

export function requireDecision(decision: AuthorizationDecision, actor: Actor, action: string): void {
  if (decision.allowed) return;
  // 誰が何を拒否されたかは運用で必要。ただし対象の個人情報は出さない（ID とロールだけ）
  logger.warn("認可で拒否しました", { action, actorId: actor.userId, role: actor.role, reason: decision.reason });
  throw forbidden(`${action}:${decision.reason}`);
}

export function requireRole(actor: Actor | null, roles: readonly UserRole[], action: string): Actor {
  const signedIn = requireActor(actor);
  requireDecision(hasRole(signedIn, roles), signedIn, action);
  return signedIn;
}

export function requireAdmin(actor: Actor | null, action: string): Actor {
  const signedIn = requireActor(actor);
  requireDecision(canAdminister(signedIn), signedIn, action);
  return signedIn;
}

export function requireStudentAccess(actor: Actor | null, studentId: UserId, action: string): Actor {
  const signedIn = requireActor(actor);
  requireDecision(canViewStudentData(signedIn, studentId), signedIn, action);
  return signedIn;
}
