import type { Actor, AuditAction, AuditLog } from "@/domain/types";
import type { ServiceContext } from "./context";

/**
 * 監査ログを1行足す。運営の操作も含めて、記録対象の操作は必ずここを通す（仕様 5章）。
 * metadata には識別子と「何が変わったか」だけを入れる。本文・本名・メールは入れない。
 */
export async function recordAudit(
  context: ServiceContext,
  actor: Actor,
  entry: { action: AuditAction; targetType: string; targetId: string; metadata?: AuditLog["metadata"] },
): Promise<void> {
  await context.store.appendAuditLog({
    id: context.newId(),
    actorId: actor.userId,
    actorRole: actor.role,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    metadata: entry.metadata ?? {},
    createdAt: context.now().toISOString(),
  });
}
