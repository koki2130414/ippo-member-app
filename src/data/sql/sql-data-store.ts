import { decideExchange } from "@/domain/points";
import type {
  AgeBand,
  ApplicationStatus,
  AuditLog,
  ClassRoom,
  Credential,
  Diagnosis,
  DiagnosisQuestion,
  ExchangeItem,
  Grade,
  Invitation,
  Lecture,
  LectureCategory,
  LectureProgress,
  Membership,
  ParentStudentLink,
  Plan,
  PlanCode,
  PointRule,
  PointTransaction,
  Prefecture,
  PrivateProfile,
  PublicProfile,
  QuizQuestion,
  RegistrationApplication,
  Session,
  SoccerNote,
  UserId,
  UserRole,
  Video,
  VideoCategory,
  VideoProgress,
  VideoReview,
  ViewSession,
} from "@/domain/types";
import type { AppendPointResult, DataStore, ExchangeResult, NewMember, Page, PageQuery } from "../data-store";
import { parseJsonColumn } from "./json-columns";
import type { SqlClient } from "./sql-client";

/**
 * Postgres 版の DataStore（Supabase で動く）。mock と同じ振る舞いになるよう、同じテスト（sql-data-store.test.ts）で確かめている。
 *
 * - 値はすべてパラメータ（$1, $2 …）で渡す。SQL の文字列に値を埋め込まない（SQL インジェクション対策）
 * - 「数えてから足す」操作（ポイント付与・交換）は、トランザクションの中で行ロック／勧告ロックを取ってから行う
 */

type Row = Record<string, unknown>;

function text(row: Row, key: string): string {
  const value = row[key];
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

function textOrNull(row: Row, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : String(value);
}

function num(row: Row, key: string): number {
  const value = row[key];
  return typeof value === "number" ? value : Number(value);
}

function numOrNull(row: Row, key: string): number | null {
  const value = row[key];
  return value === null || value === undefined ? null : Number(value);
}

/** timestamptz は Date で返ってくるので ISO 文字列にそろえる */
function iso(row: Row, key: string): string {
  const value = row[key];
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

function isoOrNull(row: Row, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  return iso(row, key);
}

function pageBounds(query: PageQuery): { limit: number; offset: number; page: number; pageSize: number } {
  const pageSize = Math.min(Math.max(1, Math.floor(query.pageSize)), 100);
  const page = Math.max(1, Math.floor(query.page));
  return { limit: pageSize, offset: (page - 1) * pageSize, page, pageSize };
}

const ROLES: readonly UserRole[] = ["student", "guardian", "coach", "admin"];
function toRole(value: string): UserRole {
  const role = ROLES.find((item) => item === value);
  if (!role) throw new Error(`不明なロールです: ${value}`);
  return role;
}

function toPublicProfile(row: Row): PublicProfile {
  return {
    userId: text(row, "user_id"),
    displayName: text(row, "display_name"),
    avatarKey: text(row, "avatar_key"),
    ageBand: parseJsonColumn.ageBand(textOrNull(row, "age_band")),
    role: toRole(text(row, "role")),
  };
}

function toPrivateProfile(row: Row): PrivateProfile {
  return {
    userId: text(row, "user_id"),
    fullName: text(row, "full_name"),
    email: textOrNull(row, "email"),
    grade: parseJsonColumn.grade(textOrNull(row, "grade")),
    prefecture: parseJsonColumn.prefecture(textOrNull(row, "prefecture")),
    createdAt: iso(row, "created_at"),
    deletedAt: isoOrNull(row, "deleted_at"),
  };
}

function toPointTransaction(row: Row): PointTransaction {
  return {
    id: text(row, "id"),
    userId: text(row, "user_id"),
    amount: num(row, "amount"),
    reason: parseJsonColumn.pointReason(text(row, "reason")),
    idempotencyKey: text(row, "idempotency_key"),
    jstDate: text(row, "jst_date"),
    createdAt: iso(row, "created_at"),
    createdBy: text(row, "created_by"),
    note: textOrNull(row, "note"),
  };
}

function toVideo(row: Row): Video {
  return {
    id: text(row, "id"),
    title: text(row, "title"),
    description: text(row, "description"),
    category: parseJsonColumn.videoCategory(text(row, "category")),
    durationSeconds: num(row, "duration_seconds"),
    source: parseJsonColumn.videoSource(text(row, "source")),
    storageKey: textOrNull(row, "storage_key"),
    muxPlaybackId: textOrNull(row, "mux_playback_id"),
    youtubeId: textOrNull(row, "youtube_id"),
    publishedAt: isoOrNull(row, "published_at"),
    createdBy: text(row, "created_by"),
  };
}

function toApplication(row: Row): RegistrationApplication {
  return {
    id: text(row, "id"),
    status: parseJsonColumn.applicationStatus(text(row, "status")),
    guardianEmail: text(row, "guardian_email"),
    childFullName: text(row, "child_full_name"),
    childDisplayName: text(row, "child_display_name"),
    grade: parseJsonColumn.requiredGrade(text(row, "grade")),
    prefecture: parseJsonColumn.requiredPrefecture(text(row, "prefecture")),
    consentVersion: text(row, "consent_version"),
    createdAt: iso(row, "created_at"),
    reviewedAt: isoOrNull(row, "reviewed_at"),
    reviewedBy: textOrNull(row, "reviewed_by"),
    reviewNote: textOrNull(row, "review_note"),
    studentUserId: textOrNull(row, "student_user_id"),
    guardianUserId: textOrNull(row, "guardian_user_id"),
  };
}

function toInvitation(row: Row): Invitation {
  return {
    id: text(row, "id"),
    tokenHash: text(row, "token_hash"),
    purpose: text(row, "purpose") === "family_setup" ? "family_setup" : "account_setup",
    guardianUserId: textOrNull(row, "guardian_user_id"),
    studentUserId: textOrNull(row, "student_user_id"),
    accountUserId: textOrNull(row, "account_user_id"),
    expiresAt: iso(row, "expires_at"),
    usedAt: isoOrNull(row, "used_at"),
    createdBy: text(row, "created_by"),
    createdAt: iso(row, "created_at"),
  };
}

function toSoccerNote(row: Row): SoccerNote {
  return {
    id: text(row, "id"),
    studentId: text(row, "student_id"),
    photoStorageKey: text(row, "photo_storage_key"),
    studentComment: text(row, "student_comment"),
    coachId: textOrNull(row, "coach_id"),
    coachReply: textOrNull(row, "coach_reply"),
    submittedAt: iso(row, "submitted_at"),
    repliedAt: isoOrNull(row, "replied_at"),
  };
}

const MEMBER_COLUMNS = "user_id, role, display_name, avatar_key, age_band, full_name, email, grade, prefecture, created_at, deleted_at";

export class SqlDataStore implements DataStore {
  readonly kind = "supabase" as const;

  constructor(private readonly client: SqlClient) {}

  async transaction<T>(work: (store: DataStore) => Promise<T>): Promise<T> {
    return this.client.transaction((tx) => work(new SqlDataStore(tx)));
  }

  private async rows(sql: string, params: readonly unknown[] = []): Promise<Row[]> {
    return this.client.query<Row>(sql, params);
  }

  private async first(sql: string, params: readonly unknown[] = []): Promise<Row | null> {
    return (await this.rows(sql, params))[0] ?? null;
  }

  private async count(sql: string, params: readonly unknown[] = []): Promise<number> {
    const row = await this.first(sql, params);
    return row ? num(row, "count") : 0;
  }

  // --- 会員 ---

  async getPublicProfile(userId: UserId) {
    const row = await this.first(`select ${MEMBER_COLUMNS} from members where user_id = $1`, [userId]);
    return row ? toPublicProfile(row) : null;
  }

  async getPrivateProfile(userId: UserId) {
    const row = await this.first(`select ${MEMBER_COLUMNS} from members where user_id = $1`, [userId]);
    return row ? toPrivateProfile(row) : null;
  }

  async findUserIdByEmail(email: string) {
    const row = await this.first("select user_id from members where email = $1 and deleted_at is null", [email.trim().toLowerCase()]);
    return row ? text(row, "user_id") : null;
  }

  async listMembers(query: PageQuery & { role?: UserRole; includeDeleted?: boolean }): Promise<Page<PublicProfile>> {
    const { limit, offset, page, pageSize } = pageBounds(query);
    const conditions = ["($1::text is null or role = $1)", "($2::boolean or deleted_at is null)"];
    const params = [query.role ?? null, query.includeDeleted === true];
    const where = conditions.join(" and ");
    const [rows, total] = await Promise.all([
      this.rows(`select ${MEMBER_COLUMNS} from members where ${where} order by created_at, user_id limit ${limit} offset ${offset}`, params),
      this.count(`select count(*)::int as count from members where ${where}`, params),
    ]);
    return { items: rows.map(toPublicProfile), total, page, pageSize };
  }

  async createMember(member: NewMember) {
    const { publicProfile: pub, privateProfile: priv } = member;
    if (priv.email !== null) {
      const taken = await this.count("select count(*)::int as count from members where email = $1 and deleted_at is null", [priv.email]);
      if (taken > 0) return { outcome: "email_taken" as const };
    }
    await this.rows(
      `insert into members (${MEMBER_COLUMNS}) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [pub.userId, pub.role, pub.displayName, pub.avatarKey, pub.ageBand, priv.fullName, priv.email, priv.grade, priv.prefecture, priv.createdAt, priv.deletedAt],
    );
    return { outcome: "created" as const };
  }

  async applyMemberDeletion(input: { publicProfile: PublicProfile; privateProfile: PrivateProfile }) {
    const { publicProfile: pub, privateProfile: priv } = input;
    await this.client.transaction(async (tx) => {
      await tx.query(
        "update members set display_name = $2, avatar_key = $3, age_band = $4, full_name = $5, email = $6, grade = $7, prefecture = $8, deleted_at = $9 where user_id = $1",
        [pub.userId, pub.displayName, pub.avatarKey, pub.ageBand, priv.fullName, priv.email, priv.grade, priv.prefecture, priv.deletedAt],
      );
      await tx.query("delete from parent_student_links where guardian_id = $1 or student_id = $1", [pub.userId]);
      await tx.query("delete from coach_assignments where coach_id = $1 or student_id = $1", [pub.userId]);
      await tx.query("delete from class_enrollments where student_id = $1", [pub.userId]);
      await tx.query("update class_rooms set coach_ids = array_remove(coach_ids, $1) where $1 = any(coach_ids)", [pub.userId]);
      await tx.query("update memberships set ended_at = $2 where user_id = $1 and ended_at is null", [pub.userId, priv.deletedAt]);
      await tx.query("delete from credentials where user_id = $1", [pub.userId]);
      await tx.query("delete from sessions where user_id = $1", [pub.userId]);
    });
  }

  async countActiveAdmins() {
    return this.count("select count(*)::int as count from members where role = 'admin' and deleted_at is null");
  }

  async createParentStudentLink(link: ParentStudentLink) {
    await this.rows("insert into parent_student_links (guardian_id, student_id, created_at) values ($1, $2, $3) on conflict do nothing", [link.guardianId, link.studentId, link.createdAt]);
  }

  // --- 入会の申し込み ---

  async createApplication(application: RegistrationApplication) {
    const a = application;
    await this.rows(
      `insert into registration_applications (id, status, guardian_email, child_full_name, child_display_name, grade, prefecture, consent_version, created_at, reviewed_at, reviewed_by, review_note, student_user_id, guardian_user_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [a.id, a.status, a.guardianEmail, a.childFullName, a.childDisplayName, a.grade, a.prefecture, a.consentVersion, a.createdAt, a.reviewedAt, a.reviewedBy, a.reviewNote, a.studentUserId, a.guardianUserId],
    );
  }

  async getApplication(applicationId: string) {
    const row = await this.first("select * from registration_applications where id = $1", [applicationId]);
    return row ? toApplication(row) : null;
  }

  async listApplications(query: PageQuery & { status: ApplicationStatus }): Promise<Page<RegistrationApplication>> {
    const { limit, offset, page, pageSize } = pageBounds(query);
    // 審査待ちは古い順（待たせている順）、審査ずみは新しい順
    const order = query.status === "pending" ? "created_at asc, id" : "reviewed_at desc nulls last, id";
    const [rows, total] = await Promise.all([
      this.rows(`select * from registration_applications where status = $1 order by ${order} limit ${limit} offset ${offset}`, [query.status]),
      this.count("select count(*)::int as count from registration_applications where status = $1", [query.status]),
    ]);
    return { items: rows.map(toApplication), total, page, pageSize };
  }

  async countPendingApplicationsByEmail(email: string) {
    return this.count("select count(*)::int as count from registration_applications where status = 'pending' and guardian_email = $1", [email]);
  }

  async completeReview(application: RegistrationApplication) {
    const a = application;
    const updated = await this.rows(
      `update registration_applications
         set status = $2, child_full_name = $3, reviewed_at = $4, reviewed_by = $5, review_note = $6, student_user_id = $7, guardian_user_id = $8
       where id = $1 and status = 'pending'
       returning id`,
      [a.id, a.status, a.childFullName, a.reviewedAt, a.reviewedBy, a.reviewNote, a.studentUserId, a.guardianUserId],
    );
    return updated.length === 1;
  }

  // --- 招待とログイン ---

  async createInvitation(invitation: Invitation) {
    const i = invitation;
    await this.rows(
      `insert into invitations (id, token_hash, purpose, guardian_user_id, student_user_id, account_user_id, expires_at, used_at, created_by, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [i.id, i.tokenHash, i.purpose, i.guardianUserId, i.studentUserId, i.accountUserId, i.expiresAt, i.usedAt, i.createdBy, i.createdAt],
    );
  }

  async findInvitationByTokenHash(tokenHash: string) {
    const row = await this.first("select * from invitations where token_hash = $1", [tokenHash]);
    return row ? toInvitation(row) : null;
  }

  async markInvitationUsed(invitationId: string, usedAt: string) {
    const updated = await this.rows("update invitations set used_at = $2 where id = $1 and used_at is null returning id", [invitationId, usedAt]);
    return updated.length === 1;
  }

  async getCredentialByLoginId(loginId: string) {
    const row = await this.first("select * from credentials where login_id = $1", [loginId]);
    return row ? { userId: text(row, "user_id"), loginId: text(row, "login_id"), passwordHash: text(row, "password_hash"), updatedAt: iso(row, "updated_at") } : null;
  }

  async getCredentialByUserId(userId: UserId): Promise<Credential | null> {
    const row = await this.first("select * from credentials where user_id = $1", [userId]);
    return row ? { userId: text(row, "user_id"), loginId: text(row, "login_id"), passwordHash: text(row, "password_hash"), updatedAt: iso(row, "updated_at") } : null;
  }

  async saveCredential(credential: Credential) {
    const takenByOther = await this.count("select count(*)::int as count from credentials where login_id = $1 and user_id <> $2", [credential.loginId, credential.userId]);
    if (takenByOther > 0) return { outcome: "login_id_taken" as const };
    await this.rows(
      `insert into credentials (user_id, login_id, password_hash, updated_at) values ($1, $2, $3, $4)
       on conflict (user_id) do update set login_id = excluded.login_id, password_hash = excluded.password_hash, updated_at = excluded.updated_at`,
      [credential.userId, credential.loginId, credential.passwordHash, credential.updatedAt],
    );
    return { outcome: "saved" as const };
  }

  async createSession(session: Session) {
    await this.rows("insert into sessions (token_hash, user_id, created_at, expires_at) values ($1, $2, $3, $4)", [session.tokenHash, session.userId, session.createdAt, session.expiresAt]);
  }

  async findSession(tokenHash: string, now: Date) {
    const row = await this.first("select * from sessions where token_hash = $1 and expires_at > $2", [tokenHash, now.toISOString()]);
    return row ? { tokenHash: text(row, "token_hash"), userId: text(row, "user_id"), createdAt: iso(row, "created_at"), expiresAt: iso(row, "expires_at") } : null;
  }

  async deleteSession(tokenHash: string) {
    await this.rows("delete from sessions where token_hash = $1", [tokenHash]);
  }

  async deleteSessionsForUser(userId: UserId) {
    await this.rows("delete from sessions where user_id = $1", [userId]);
  }

  // --- 関係 ---

  async listLinkedStudentIds(guardianId: UserId) {
    return (await this.rows("select student_id from parent_student_links where guardian_id = $1 order by created_at, student_id", [guardianId])).map((row) => text(row, "student_id"));
  }

  async listAssignedStudentIds(coachId: UserId) {
    return (await this.rows("select student_id from coach_assignments where coach_id = $1 order by created_at, student_id", [coachId])).map((row) => text(row, "student_id"));
  }

  async listCoachClassRoomIds(coachId: UserId) {
    return (await this.rows("select id from class_rooms where $1 = any(coach_ids) order by id", [coachId])).map((row) => text(row, "id"));
  }

  async listEnrolledClassRoomIds(studentId: UserId) {
    return (await this.rows("select class_room_id from class_enrollments where student_id = $1 order by created_at", [studentId])).map((row) => text(row, "class_room_id"));
  }

  // --- プラン ---

  async listPlans(): Promise<Plan[]> {
    const rows = await this.rows("select * from plans order by sort_order");
    return rows.map((row) => ({
      code: parseJsonColumn.planCode(text(row, "code")),
      name: text(row, "name"),
      monthlyPriceYen: num(row, "monthly_price_yen"),
      sortOrder: num(row, "sort_order"),
      limits: parseJsonColumn.planLimits(row.limits),
    }));
  }

  async getActiveMembership(userId: UserId): Promise<Membership | null> {
    const row = await this.first("select * from memberships where user_id = $1 and ended_at is null", [userId]);
    return row
      ? { userId: text(row, "user_id"), planCode: parseJsonColumn.planCode(text(row, "plan_code")), startedAt: iso(row, "started_at"), endedAt: isoOrNull(row, "ended_at"), assignedBy: text(row, "assigned_by") }
      : null;
  }

  async replaceMembership(input: { userId: UserId; planCode: PlanCode | null; assignedBy: UserId; now: Date }) {
    const nowIso = input.now.toISOString();
    await this.client.transaction(async (tx) => {
      await tx.query("update memberships set ended_at = $2 where user_id = $1 and ended_at is null", [input.userId, nowIso]);
      if (input.planCode !== null) {
        await tx.query("insert into memberships (user_id, plan_code, started_at, ended_at, assigned_by) values ($1, $2, $3, null, $4)", [input.userId, input.planCode, nowIso, input.assignedBy]);
      }
    });
  }

  // --- ポイント ---

  async listPointRules(): Promise<PointRule[]> {
    const rows = await this.rows("select * from point_rules order by code");
    return rows.map((row) => ({
      code: parseJsonColumn.pointRuleCode(text(row, "code")),
      label: text(row, "label"),
      points: numOrNull(row, "points"),
      maxPerDay: numOrNull(row, "max_per_day"),
      grantedBy: parseJsonColumn.grantedBy(text(row, "granted_by")),
    }));
  }

  async listPointTransactions(userId: UserId) {
    return (await this.rows("select * from point_transactions where user_id = $1 order by created_at, id", [userId])).map(toPointTransaction);
  }

  async appendPointTransaction(transaction: PointTransaction, maxPerDay: number | null): Promise<AppendPointResult> {
    const t = transaction;
    return this.client.transaction(async (tx) => {
      // 同じ人・同じルールの付与を、この取引が終わるまで1本ずつに並べる（同時に来ても日次上限を超えない）
      await tx.query("select pg_advisory_xact_lock(hashtext($1))", [`points:${t.userId}:${t.reason}`]);
      const duplicate = await tx.query<Row>("select 1 from point_transactions where idempotency_key = $1", [t.idempotencyKey]);
      if (duplicate.length > 0) return { outcome: "duplicate_key" as const };
      if (maxPerDay !== null) {
        const today = await tx.query<Row>("select count(*)::int as count from point_transactions where user_id = $1 and reason = $2 and jst_date = $3", [t.userId, t.reason, t.jstDate]);
        if (num(today[0] ?? { count: 0 }, "count") >= maxPerDay) return { outcome: "daily_limit_reached" as const };
      }
      await tx.query(
        "insert into point_transactions (id, user_id, amount, reason, idempotency_key, jst_date, created_at, created_by, note) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [t.id, t.userId, t.amount, t.reason, t.idempotencyKey, t.jstDate, t.createdAt, t.createdBy, t.note],
      );
      return { outcome: "inserted" as const, transaction: structuredClone(t) };
    });
  }

  async getExchangeItem(itemId: string): Promise<ExchangeItem | null> {
    const row = await this.first("select * from exchange_items where id = $1", [itemId]);
    return row ? { id: text(row, "id"), name: text(row, "name"), costPoints: num(row, "cost_points"), stock: num(row, "stock") } : null;
  }

  async exchangePoints(input: { itemId: string; debit: Omit<PointTransaction, "amount"> }): Promise<ExchangeResult> {
    const d = input.debit;
    return this.client.transaction(async (tx) => {
      // 残高を読む前に、その人のポイント操作を並べる。交換品の行もロックして在庫を守る
      await tx.query("select pg_advisory_xact_lock(hashtext($1))", [`points:${d.userId}:exchange`]);
      if ((await tx.query<Row>("select 1 from point_transactions where idempotency_key = $1", [d.idempotencyKey])).length > 0) return { outcome: "duplicate_key" as const };
      const itemRow = (await tx.query<Row>("select * from exchange_items where id = $1 for update", [input.itemId]))[0];
      if (!itemRow) return { outcome: "item_not_found" as const };
      const balanceRow = (await tx.query<Row>("select coalesce(sum(amount), 0)::int as balance from point_transactions where user_id = $1", [d.userId]))[0];
      const decision = decideExchange({ balance: balanceRow ? num(balanceRow, "balance") : 0, costPoints: num(itemRow, "cost_points"), stock: num(itemRow, "stock") });
      if (decision.kind === "out_of_stock") return { outcome: "out_of_stock" as const };
      if (decision.kind === "insufficient_points") return { outcome: "insufficient_points" as const, shortBy: decision.shortBy };
      const transaction: PointTransaction = { ...d, amount: -decision.cost };
      await tx.query(
        "insert into point_transactions (id, user_id, amount, reason, idempotency_key, jst_date, created_at, created_by, note) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [transaction.id, transaction.userId, transaction.amount, transaction.reason, transaction.idempotencyKey, transaction.jstDate, transaction.createdAt, transaction.createdBy, transaction.note],
      );
      await tx.query("update exchange_items set stock = stock - 1 where id = $1", [input.itemId]);
      return { outcome: "exchanged" as const, transaction };
    });
  }

  // --- 監査 ---

  async appendAuditLog(log: AuditLog) {
    await this.rows(
      "insert into audit_logs (id, actor_id, actor_role, action, target_type, target_id, metadata, created_at) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)",
      [log.id, log.actorId, log.actorRole, log.action, log.targetType, log.targetId, JSON.stringify(log.metadata), log.createdAt],
    );
  }

  async listAuditLogs(query: PageQuery): Promise<Page<AuditLog>> {
    const { limit, offset, page, pageSize } = pageBounds(query);
    const [rows, total] = await Promise.all([
      this.rows(`select * from audit_logs order by created_at desc, id limit ${limit} offset ${offset}`),
      this.count("select count(*)::int as count from audit_logs"),
    ]);
    return {
      items: rows.map((row) => ({
        id: text(row, "id"),
        actorId: text(row, "actor_id"),
        actorRole: toRole(text(row, "actor_role")),
        action: parseJsonColumn.auditAction(text(row, "action")),
        targetType: text(row, "target_type"),
        targetId: text(row, "target_id"),
        metadata: parseJsonColumn.auditMetadata(row.metadata),
        createdAt: iso(row, "created_at"),
      })),
      total,
      page,
      pageSize,
    };
  }

  // --- コンテンツ ---

  async getVideo(videoId: string) {
    const row = await this.first("select * from videos where id = $1", [videoId]);
    return row ? toVideo(row) : null;
  }

  async listVideos(query: PageQuery & { category?: VideoCategory; publishedOnly: boolean }): Promise<Page<Video>> {
    const { limit, offset, page, pageSize } = pageBounds(query);
    const where = "($1::text is null or category = $1) and (not $2::boolean or published_at is not null)";
    const params = [query.category ?? null, query.publishedOnly];
    const [rows, total] = await Promise.all([
      this.rows(`select * from videos where ${where} order by published_at desc nulls last, id limit ${limit} offset ${offset}`, params),
      this.count(`select count(*)::int as count from videos where ${where}`, params),
    ]);
    return { items: rows.map(toVideo), total, page, pageSize };
  }

  async listClassRooms(): Promise<ClassRoom[]> {
    const rows = await this.rows("select * from class_rooms order by id");
    return rows.map((row) => ({
      id: text(row, "id"),
      name: text(row, "name"),
      category: parseJsonColumn.videoCategory(text(row, "category")),
      description: text(row, "description"),
      schedule: parseJsonColumn.classSchedule(row.schedule),
      coachIds: parseJsonColumn.textArray(row.coach_ids),
      capacity: num(row, "capacity"),
    }));
  }

  async listLectureCategories(): Promise<LectureCategory[]> {
    return (await this.rows("select * from lecture_categories order by sort_order")).map((row) => ({ id: text(row, "id"), name: text(row, "name"), sortOrder: num(row, "sort_order") }));
  }

  async listLectures(query: PageQuery & { categoryId?: string; publishedOnly: boolean }): Promise<Page<Lecture>> {
    const { limit, offset, page, pageSize } = pageBounds(query);
    const where = "($1::text is null or category_id = $1) and (not $2::boolean or published_at is not null)";
    const params = [query.categoryId ?? null, query.publishedOnly];
    const [rows, total] = await Promise.all([
      this.rows(`select * from lectures where ${where} order by published_at desc nulls last, id limit ${limit} offset ${offset}`, params),
      this.count(`select count(*)::int as count from lectures where ${where}`, params),
    ]);
    return { items: rows.map(toLecture), total, page, pageSize };
  }

  async getLecture(lectureId: string) {
    const row = await this.first("select * from lectures where id = $1", [lectureId]);
    return row ? toLecture(row) : null;
  }

  async listQuizQuestions(lectureId: string): Promise<QuizQuestion[]> {
    const rows = await this.rows("select * from quiz_questions where lecture_id = $1 order by id", [lectureId]);
    return rows.map((row) => ({ id: text(row, "id"), lectureId: text(row, "lecture_id"), prompt: text(row, "prompt"), explanation: text(row, "explanation"), choices: parseJsonColumn.choices(row.choices) }));
  }

  async createViewSession(session: ViewSession) {
    await this.rows("insert into view_sessions (id, user_id, kind, target_id, started_at) values ($1, $2, $3, $4, $5)", [session.id, session.userId, session.kind, session.targetId, session.startedAt]);
  }

  async getViewSession(sessionId: string): Promise<ViewSession | null> {
    const row = await this.first("select * from view_sessions where id = $1", [sessionId]);
    return row ? { id: text(row, "id"), userId: text(row, "user_id"), kind: text(row, "kind") === "lecture" ? "lecture" : "video", targetId: text(row, "target_id"), startedAt: iso(row, "started_at") } : null;
  }

  async getVideoProgress(userId: UserId, videoId: string) {
    const row = await this.first("select * from video_progress where user_id = $1 and video_id = $2", [userId, videoId]);
    return row ? toVideoProgress(row) : null;
  }

  async listVideoProgress(userId: UserId) {
    return (await this.rows("select * from video_progress where user_id = $1", [userId])).map(toVideoProgress);
  }

  async markVideoCompleted(progress: VideoProgress) {
    // すでに完了していれば何もしない（最初の完了日時を残す）。返ってくる行があれば「今回はじめて完了」
    const rows = await this.rows(
      `insert into video_progress (user_id, video_id, watched_seconds, completed_at) values ($1, $2, $3, $4)
       on conflict (user_id, video_id) do update
         set completed_at = excluded.completed_at, watched_seconds = greatest(video_progress.watched_seconds, excluded.watched_seconds)
         where video_progress.completed_at is null
       returning user_id`,
      [progress.userId, progress.videoId, progress.watchedSeconds, progress.completedAt],
    );
    return { firstTime: rows.length === 1 };
  }

  async getLectureProgress(userId: UserId, lectureId: string) {
    const row = await this.first("select * from lecture_progress where user_id = $1 and lecture_id = $2", [userId, lectureId]);
    return row ? toLectureProgress(row) : null;
  }

  async listLectureProgress(userId: UserId) {
    return (await this.rows("select * from lecture_progress where user_id = $1", [userId])).map(toLectureProgress);
  }

  async markLectureCompleted(input: { userId: UserId; lectureId: string; completedAt: string }) {
    const rows = await this.rows(
      `insert into lecture_progress (user_id, lecture_id, completed_at, quiz_passed_at) values ($1, $2, $3, null)
       on conflict (user_id, lecture_id) do update set completed_at = excluded.completed_at where lecture_progress.completed_at is null
       returning user_id`,
      [input.userId, input.lectureId, input.completedAt],
    );
    return { firstTime: rows.length === 1 };
  }

  async markQuizPassed(input: { userId: UserId; lectureId: string; passedAt: string }) {
    const rows = await this.rows(
      `insert into lecture_progress (user_id, lecture_id, completed_at, quiz_passed_at) values ($1, $2, null, $3)
       on conflict (user_id, lecture_id) do update set quiz_passed_at = excluded.quiz_passed_at where lecture_progress.quiz_passed_at is null
       returning user_id`,
      [input.userId, input.lectureId, input.passedAt],
    );
    return { firstTime: rows.length === 1 };
  }

  async getDiagnosis(diagnosisId: string): Promise<{ diagnosis: Diagnosis; questions: DiagnosisQuestion[] } | null> {
    const row = await this.first("select * from diagnoses where id = $1", [diagnosisId]);
    if (!row) return null;
    const questions = await this.rows("select * from diagnosis_questions where diagnosis_id = $1 order by sort_order", [diagnosisId]);
    return {
      diagnosis: toDiagnosis(row),
      questions: questions.map((question) => ({
        id: text(question, "id"),
        diagnosisId: text(question, "diagnosis_id"),
        categoryCode: text(question, "category_code"),
        prompt: text(question, "prompt"),
        sortOrder: num(question, "sort_order"),
        choices: parseJsonColumn.choices(question.choices),
      })),
    };
  }

  async listDiagnoses(): Promise<Diagnosis[]> {
    return (await this.rows("select * from diagnoses order by id")).map(toDiagnosis);
  }

  // --- 提出物 ---

  async getSoccerNote(noteId: string) {
    const row = await this.first("select * from soccer_notes where id = $1", [noteId]);
    return row ? toSoccerNote(row) : null;
  }

  async listSoccerNotes(query: PageQuery & { studentIds: readonly UserId[] }): Promise<Page<SoccerNote>> {
    const { limit, offset, page, pageSize } = pageBounds(query);
    const ids = JSON.stringify(query.studentIds);
    const where = "student_id in (select jsonb_array_elements_text($1::jsonb))";
    const [rows, total] = await Promise.all([
      this.rows(`select * from soccer_notes where ${where} order by submitted_at desc, id limit ${limit} offset ${offset}`, [ids]),
      this.count(`select count(*)::int as count from soccer_notes where ${where}`, [ids]),
    ]);
    return { items: rows.map(toSoccerNote), total, page, pageSize };
  }

  async getVideoReview(reviewId: string): Promise<VideoReview | null> {
    const row = await this.first("select * from video_reviews where id = $1", [reviewId]);
    return row
      ? {
          id: text(row, "id"),
          studentId: text(row, "student_id"),
          storageKey: text(row, "storage_key"),
          studentComment: text(row, "student_comment"),
          coachId: textOrNull(row, "coach_id"),
          coachReply: textOrNull(row, "coach_reply"),
          submittedAt: iso(row, "submitted_at"),
          repliedAt: isoOrNull(row, "replied_at"),
        }
      : null;
  }
}

function toLecture(row: Row): Lecture {
  return {
    id: text(row, "id"),
    categoryId: text(row, "category_id"),
    title: text(row, "title"),
    body: text(row, "body"),
    videoId: textOrNull(row, "video_id"),
    quizPassRatio: num(row, "quiz_pass_ratio"),
    publishedAt: isoOrNull(row, "published_at"),
  };
}

function toVideoProgress(row: Row): VideoProgress {
  return { userId: text(row, "user_id"), videoId: text(row, "video_id"), watchedSeconds: num(row, "watched_seconds"), completedAt: isoOrNull(row, "completed_at") };
}

function toLectureProgress(row: Row): LectureProgress {
  return { userId: text(row, "user_id"), lectureId: text(row, "lecture_id"), completedAt: isoOrNull(row, "completed_at"), quizPassedAt: isoOrNull(row, "quiz_passed_at") };
}

function toDiagnosis(row: Row): Diagnosis {
  return { id: text(row, "id"), title: text(row, "title"), description: text(row, "description"), categories: parseJsonColumn.diagnosisCategories(row.categories) };
}

export type { AgeBand, Grade, Prefecture };
