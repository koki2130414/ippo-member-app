import { STUDENT_LOGIN_ID_PATTERN, checkInvitationUsable, formatStudentLoginId, invitationExpiresAt, normalizeLoginId } from "@/domain/registration";
import type { Actor, Invitation, UserId, UserRole } from "@/domain/types";
import type { DataStore } from "@/data/data-store";
import type { ServiceContext } from "./context";
import { recordAudit } from "./audit";
import { conflict, invalid, notFound } from "./errors";
import { requireAdmin } from "./guards";
import { generateToken, hashPassword, hashToken, randomSixDigits } from "./secrets";
import { startSession } from "./session-service";

/**
 * ログインの用意（アカウントの設定）。
 *
 * - 最初の運営アカウント: 運営が1人もいないときだけ、/setup から作れる
 * - 招待リンク: 運営が発行し、LINE やメールで本人（保護者）に送る。リンクを開いてパスワードを決める
 *   アプリからメールは送らない（送信サービスをまだ使っていないため）
 * - ログインID: 保護者・コーチ・運営はメールアドレス、生徒は ippo-123456 の形（子どもはメールを持たないことが多い）
 */

/** 生徒のログインIDを発行する。ぶつかったら作り直す */
async function allocateStudentLoginId(store: DataStore): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = formatStudentLoginId(randomSixDigits());
    if (!(await store.getCredentialByLoginId(candidate))) return candidate;
  }
  throw conflict("ログインIDを用意できませんでした。もう一度ためしてください", "login_id:exhausted");
}

/** その人のログインID。すでにあればそれを使い、無ければ役割に合わせて決める */
async function loginIdFor(store: DataStore, userId: UserId, role: UserRole): Promise<string> {
  const existing = await store.getCredentialByUserId(userId);
  if (existing) return existing.loginId;
  if (role === "student") return allocateStudentLoginId(store);
  const privateProfile = await store.getPrivateProfile(userId);
  if (!privateProfile?.email) throw invalid("メールアドレスが登録されていないため、ログインを用意できません。先にメールアドレスを登録してください", "login_id:no_email");
  return normalizeLoginId(privateProfile.email);
}

export async function canSetupFirstAdmin(context: ServiceContext): Promise<boolean> {
  return (await context.store.countActiveAdmins()) === 0;
}

/**
 * 最初の運営アカウントを作る。運営が1人でもいたら断る（あとから誰かが運営を名乗って作れないように）。
 * 公開直後だけ開いている入口なので、つないだらすぐに運営が自分で作る前提（README に記載）。
 */
export async function setupFirstAdmin(context: ServiceContext, input: { displayName: string; email: string; password: string }): Promise<{ userId: UserId; token: string; expiresAt: Date }> {
  const userId = context.newId();
  const now = context.now();
  const passwordHash = await hashPassword(input.password);
  await context.store.transaction(async (store) => {
    if ((await store.countActiveAdmins()) > 0) throw conflict("運営アカウントはもう作られています。ログイン画面からログインしてください", "setup:already");
    const created = await store.createMember({
      publicProfile: { userId, displayName: input.displayName, avatarKey: "default", ageBand: "adult", role: "admin" },
      privateProfile: { userId, fullName: "", email: input.email, grade: null, prefecture: null, createdAt: now.toISOString(), deletedAt: null },
    });
    if (created.outcome === "email_taken") throw conflict("このメールアドレスはすでに使われています");
    const saved = await store.saveCredential({ userId, loginId: normalizeLoginId(input.email), passwordHash, updatedAt: now.toISOString() });
    if (saved.outcome === "login_id_taken") throw conflict("このメールアドレスはすでに使われています");
    await store.appendAuditLog({ id: context.newId(), actorId: userId, actorRole: "admin", action: "admin.setup", targetType: "user", targetId: userId, metadata: {}, createdAt: now.toISOString() });
  });
  return { userId, ...(await startSession(context, userId)) };
}

export interface IssuedInvitation {
  /** 本人に送る URL のうち、トークンの部分。画面にはこのときだけ表示し、保存はハッシュだけ */
  token: string;
  expiresAt: Date;
}

async function createInvitation(context: ServiceContext, store: DataStore, fields: Pick<Invitation, "purpose" | "guardianUserId" | "studentUserId" | "accountUserId">, createdBy: UserId): Promise<IssuedInvitation> {
  const token = generateToken();
  const now = context.now();
  const expiresAt = invitationExpiresAt(now);
  await store.createInvitation({ id: context.newId(), tokenHash: hashToken(token), ...fields, expiresAt: expiresAt.toISOString(), usedAt: null, createdBy, createdAt: now.toISOString() });
  return { token, expiresAt };
}

export { createInvitation as createInvitationWithStore };

/** 運営が、1人分のログイン用リンク（パスワード設定・再設定）を発行する */
export async function issueAccountInvitation(context: ServiceContext, actor: Actor | null, input: { userId: UserId }): Promise<IssuedInvitation> {
  const admin = requireAdmin(actor, "invitation.issue");
  const [publicProfile, privateProfile] = await Promise.all([context.store.getPublicProfile(input.userId), context.store.getPrivateProfile(input.userId)]);
  if (!publicProfile || !privateProfile || privateProfile.deletedAt !== null) throw notFound("invitation.issue");
  if (publicProfile.role !== "student" && !privateProfile.email) {
    throw invalid("メールアドレスが登録されていないため、ログインを用意できません");
  }
  const issued = await createInvitation(context, context.store, { purpose: "account_setup", guardianUserId: null, studentUserId: null, accountUserId: input.userId }, admin.userId);
  await recordAudit(context, admin, { action: "invitation.issue", targetType: "user", targetId: input.userId, metadata: { purpose: "account_setup" } });
  return issued;
}

export interface InvitationPreview {
  purpose: Invitation["purpose"];
  /** 画面に出す名前（表示名）。本名は出さない */
  guardianLabel: string | null;
  studentDisplayName: string | null;
  accountDisplayName: string | null;
  accountRole: UserRole | null;
}

export type InvitationLookup = { ok: true; preview: InvitationPreview } | { ok: false; message: string };

/** 招待リンクを開いたときの表示内容。リンクが使えないときは理由を返す */
export async function previewInvitation(context: ServiceContext, token: string): Promise<InvitationLookup> {
  const invitation = await context.store.findInvitationByTokenHash(hashToken(token));
  const check = checkInvitationUsable(invitation, context.now());
  if (!check.ok || !invitation) return { ok: false, message: check.ok ? "このリンクは使えません" : check.message };
  const nameOf = async (userId: UserId | null) => (userId ? ((await context.store.getPublicProfile(userId))?.displayName ?? null) : null);
  const account = invitation.accountUserId ? await context.store.getPublicProfile(invitation.accountUserId) : null;
  const guardianEmail = invitation.guardianUserId ? ((await context.store.getPrivateProfile(invitation.guardianUserId))?.email ?? null) : null;
  return {
    ok: true,
    preview: {
      purpose: invitation.purpose,
      guardianLabel: guardianEmail,
      studentDisplayName: await nameOf(invitation.studentUserId),
      accountDisplayName: account?.displayName ?? null,
      accountRole: account?.role ?? null,
    },
  };
}

export interface AcceptedInvitation {
  /** ログインした人（家族の招待なら保護者） */
  signedInUserId: UserId;
  token: string;
  expiresAt: Date;
  /** 画面に表示するログインID。生徒のIDはここで初めて本人に伝わる */
  loginIds: { label: string; loginId: string }[];
}

async function setPassword(context: ServiceContext, store: DataStore, userId: UserId, password: string): Promise<string> {
  const publicProfile = await store.getPublicProfile(userId);
  if (!publicProfile) throw notFound("invitation.accept:user");
  const loginId = await loginIdFor(store, userId, publicProfile.role);
  const saved = await store.saveCredential({ userId, loginId, passwordHash: await hashPassword(password), updatedAt: context.now().toISOString() });
  if (saved.outcome === "login_id_taken") throw conflict("このメールアドレスは別のアカウントで使われています。運営に知らせてください", "invitation.accept:login_id_taken");
  // パスワードを決め直したら、ほかの端末のログインは切る（なりすましが続かないように）
  await store.deleteSessionsForUser(userId);
  return loginId;
}

/** 招待リンクでパスワードを決める。使い切り（2回目は使えない） */
export async function acceptInvitation(
  context: ServiceContext,
  input: { token: string; password?: string; guardianPassword?: string; studentPassword?: string },
): Promise<AcceptedInvitation> {
  const invitation = await context.store.findInvitationByTokenHash(hashToken(input.token));
  const check = checkInvitationUsable(invitation, context.now());
  if (!check.ok || !invitation) throw invalid(check.ok ? "このリンクは使えません" : check.message, "invitation.accept:unusable");

  const result = await context.store.transaction(async (store) => {
    // 先に「使用済み」にする。同じリンクを2つの画面で同時に送っても、片方しか通らない
    if (!(await store.markInvitationUsed(invitation.id, context.now().toISOString()))) {
      throw invalid("このリンクはもう使われています。ログイン画面からログインしてください", "invitation.accept:race");
    }
    const loginIds: { label: string; loginId: string }[] = [];
    let signedInUserId: UserId;
    if (invitation.purpose === "family_setup") {
      if (!invitation.guardianUserId || !invitation.studentUserId || !input.guardianPassword || !input.studentPassword) throw invalid("パスワードを入力してください");
      loginIds.push({ label: "保護者のログインID", loginId: await setPassword(context, store, invitation.guardianUserId, input.guardianPassword) });
      loginIds.push({ label: "お子さまのログインID", loginId: await setPassword(context, store, invitation.studentUserId, input.studentPassword) });
      signedInUserId = invitation.guardianUserId;
    } else {
      if (!invitation.accountUserId || !input.password) throw invalid("パスワードを入力してください");
      loginIds.push({ label: "ログインID", loginId: await setPassword(context, store, invitation.accountUserId, input.password) });
      signedInUserId = invitation.accountUserId;
    }
    const actorProfile = await store.getPublicProfile(signedInUserId);
    await store.appendAuditLog({
      id: context.newId(),
      actorId: signedInUserId,
      actorRole: actorProfile?.role ?? "student",
      action: "invitation.accept",
      targetType: "invitation",
      targetId: invitation.id,
      metadata: { purpose: invitation.purpose },
      createdAt: context.now().toISOString(),
    });
    return { signedInUserId, loginIds };
  });
  return { ...result, ...(await startSession(context, result.signedInUserId)) };
}

export function isStudentLoginId(value: string): boolean {
  return STUDENT_LOGIN_ID_PATTERN.test(normalizeLoginId(value));
}
