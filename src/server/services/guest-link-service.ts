import type { Actor } from "@/domain/types";
import { DEMO_IDS } from "@/data/seed/ids";
import type { ServiceContext } from "./context";
import { recordAudit } from "./audit";
import { requireAdmin } from "./guards";
import { generateToken, hashToken } from "./secrets";

/**
 * 見学リンク。
 *
 * - 運営が発行する長いランダムなリンク（/guest/<トークン>）。知っている人は、ログインなしで共用の「見学用」アカウント
 *   （生徒・ライトプラン）として会員画面を見られる。見学中は「見おわった」・ポイント・クイズの記録はしない
 * - 有効なのは常に1本だけ。作り直すと前のリンクはその場で使えなくなる（すでに入っている人も、次の画面から入れなくなる）
 * - 保存するのはトークンのハッシュだけ。リンクそのものは発行したときにしか表示できない
 * - サイトのURLだけでは入れない（クラス動画に子どもが映っているため。運営の判断: 2026-10-01）
 */

export const GUEST_ACCOUNT_ID = DEMO_IDS.guest;

export interface IssuedGuestLink {
  token: string;
  createdAt: string;
}

export interface GuestLinkStatus {
  active: boolean;
  createdAt: string | null;
}

/** 見学用アカウントが無ければ作る（本番のデータベースには最初は1人もいないため） */
async function ensureGuestAccount(context: ServiceContext, adminId: string): Promise<void> {
  const existing = await context.store.getPublicProfile(GUEST_ACCOUNT_ID);
  if (!existing) {
    const now = context.now().toISOString();
    await context.store.createMember({
      publicProfile: { userId: GUEST_ACCOUNT_ID, displayName: "見学用", avatarKey: "default", ageBand: null, role: "student" },
      privateProfile: { userId: GUEST_ACCOUNT_ID, fullName: "見学用アカウント", email: null, grade: null, prefecture: null, createdAt: now, deletedAt: null },
    });
  }
  if (!(await context.store.getActiveMembership(GUEST_ACCOUNT_ID))) {
    await context.store.replaceMembership({ userId: GUEST_ACCOUNT_ID, planCode: "light", assignedBy: adminId, now: context.now() });
  }
}

export async function issueGuestLink(context: ServiceContext, actor: Actor | null): Promise<IssuedGuestLink> {
  const admin = requireAdmin(actor, "guest_link.issue");
  const token = generateToken();
  const createdAt = context.now().toISOString();
  await context.store.transaction(async (store) => {
    const scoped = { ...context, store };
    await ensureGuestAccount(scoped, admin.userId);
    await store.replaceGuestLink({ id: context.newId(), tokenHash: hashToken(token), createdBy: admin.userId, createdAt, revokedAt: null });
    await recordAudit(scoped, admin, { action: "guest_link.issue", targetType: "guest_link", targetId: "current" });
  });
  return { token, createdAt };
}

export async function revokeGuestLink(context: ServiceContext, actor: Actor | null): Promise<{ revoked: number }> {
  const admin = requireAdmin(actor, "guest_link.revoke");
  const revoked = await context.store.revokeGuestLinks(context.now().toISOString());
  if (revoked > 0) await recordAudit(context, admin, { action: "guest_link.revoke", targetType: "guest_link", targetId: "current" });
  return { revoked };
}

export async function getGuestLinkStatus(context: ServiceContext, actor: Actor | null): Promise<GuestLinkStatus> {
  requireAdmin(actor, "guest_link.status");
  const link = await context.store.getActiveGuestLink();
  return { active: link !== null, createdAt: link?.createdAt ?? null };
}

/** リンクのトークン（またはクッキーに入れたトークン）が、今も有効な見学リンクか */
export async function isActiveGuestToken(context: ServiceContext, token: string | undefined): Promise<boolean> {
  if (!token || token.length < 20) return false;
  return (await context.store.findActiveGuestLinkByTokenHash(hashToken(token))) !== null;
}
