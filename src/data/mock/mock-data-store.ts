import { decideExchange, sumBalance } from "@/domain/points";
import type { AuditLog, PlanCode, PointTransaction, PrivateProfile, PublicProfile, UserId, UserRole, VideoCategory } from "@/domain/types";
import type { AppendPointResult, DataStore, ExchangeResult, NewMember, Page, PageQuery } from "../data-store";
import type { MockState } from "./mock-state";

/**
 * デモモード用のインメモリ実装。
 *
 * - 返す値は必ず structuredClone する。呼び出し側が返り値を書き換えても、保存済みの状態が変わらないように
 *   （本番の DB と同じ「読んだものは写し」という性質にそろえる）。
 * - 原子性が必要な操作（ポイント付与・交換）は、メソッドの中で await を挟まずに判定と書き込みを行う。
 *   JavaScript は await の間でしか他の処理が割り込まないので、これで同時アクセスでも上限を超えない。
 */
export class MockDataStore implements DataStore {
  readonly kind = "mock" as const;

  constructor(private readonly state: MockState) {}

  // --- 会員 ---

  async getPublicProfile(userId: UserId) {
    return copyOrNull(this.state.publicProfiles.find((profile) => profile.userId === userId));
  }

  async getPrivateProfile(userId: UserId) {
    return copyOrNull(this.state.privateProfiles.find((profile) => profile.userId === userId));
  }

  async findUserIdByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    return this.state.privateProfiles.find((profile) => profile.email === normalized && profile.deletedAt === null)?.userId ?? null;
  }

  async listMembers(query: PageQuery & { role?: UserRole; includeDeleted?: boolean }) {
    const deletedIds = new Set(this.state.privateProfiles.filter((profile) => profile.deletedAt !== null).map((profile) => profile.userId));
    const filtered = this.state.publicProfiles.filter(
      (profile) => (query.role === undefined || profile.role === query.role) && (query.includeDeleted === true || !deletedIds.has(profile.userId)),
    );
    return paginate(filtered, query);
  }

  async createMember(member: NewMember) {
    const emailTaken = this.state.privateProfiles.some((profile) => profile.email === member.privateProfile.email && profile.deletedAt === null);
    if (emailTaken) return { outcome: "email_taken" as const };
    this.state.publicProfiles.push(structuredClone(member.publicProfile));
    this.state.privateProfiles.push(structuredClone(member.privateProfile));
    return { outcome: "created" as const };
  }

  async applyMemberDeletion(input: { publicProfile: PublicProfile; privateProfile: PrivateProfile }) {
    const userId = input.publicProfile.userId;
    replaceWhere(this.state.publicProfiles, (profile) => profile.userId === userId, structuredClone(input.publicProfile));
    replaceWhere(this.state.privateProfiles, (profile) => profile.userId === userId, structuredClone(input.privateProfile));
    // 紐付け・担当・参加クラスは消す。残すと、退会した子の情報へ保護者やコーチの経路が残ってしまう
    this.state.parentStudentLinks = this.state.parentStudentLinks.filter((link) => link.guardianId !== userId && link.studentId !== userId);
    this.state.coachAssignments = this.state.coachAssignments.filter((assignment) => assignment.coachId !== userId && assignment.studentId !== userId);
    this.state.classEnrollments = this.state.classEnrollments.filter((enrollment) => enrollment.studentId !== userId);
    for (const classRoom of this.state.classRooms) classRoom.coachIds = classRoom.coachIds.filter((coachId) => coachId !== userId);
    const now = input.privateProfile.deletedAt;
    for (const membership of this.state.memberships) {
      if (membership.userId === userId && membership.endedAt === null) membership.endedAt = now;
    }
  }

  async countActiveAdmins() {
    const deletedIds = new Set(this.state.privateProfiles.filter((profile) => profile.deletedAt !== null).map((profile) => profile.userId));
    return this.state.publicProfiles.filter((profile) => profile.role === "admin" && !deletedIds.has(profile.userId)).length;
  }

  // --- 関係 ---

  async listLinkedStudentIds(guardianId: UserId) {
    return this.state.parentStudentLinks.filter((link) => link.guardianId === guardianId).map((link) => link.studentId);
  }

  async listAssignedStudentIds(coachId: UserId) {
    return this.state.coachAssignments.filter((assignment) => assignment.coachId === coachId).map((assignment) => assignment.studentId);
  }

  async listCoachClassRoomIds(coachId: UserId) {
    return this.state.classRooms.filter((classRoom) => classRoom.coachIds.includes(coachId)).map((classRoom) => classRoom.id);
  }

  async listEnrolledClassRoomIds(studentId: UserId) {
    return this.state.classEnrollments.filter((enrollment) => enrollment.studentId === studentId).map((enrollment) => enrollment.classRoomId);
  }

  // --- プラン ---

  async listPlans() {
    return structuredClone(this.state.plans);
  }

  async getActiveMembership(userId: UserId) {
    return copyOrNull(this.state.memberships.find((membership) => membership.userId === userId && membership.endedAt === null));
  }

  async replaceMembership(input: { userId: UserId; planCode: PlanCode | null; assignedBy: UserId; now: Date }) {
    const nowIso = input.now.toISOString();
    for (const membership of this.state.memberships) {
      if (membership.userId === input.userId && membership.endedAt === null) membership.endedAt = nowIso;
    }
    if (input.planCode !== null) {
      this.state.memberships.push({ userId: input.userId, planCode: input.planCode, startedAt: nowIso, endedAt: null, assignedBy: input.assignedBy });
    }
  }

  // --- ポイント ---

  async listPointRules() {
    return structuredClone(this.state.pointRules);
  }

  async listPointTransactions(userId: UserId) {
    return structuredClone(this.state.pointTransactions.filter((transaction) => transaction.userId === userId));
  }

  async appendPointTransaction(transaction: PointTransaction, maxPerDay: number | null): Promise<AppendPointResult> {
    // ここから書き込みまで await を挟まない（原子性のため）
    if (this.state.pointTransactions.some((existing) => existing.idempotencyKey === transaction.idempotencyKey)) {
      return { outcome: "duplicate_key" };
    }
    if (maxPerDay !== null) {
      const todayCount = this.state.pointTransactions.filter(
        (existing) => existing.userId === transaction.userId && existing.reason === transaction.reason && existing.jstDate === transaction.jstDate,
      ).length;
      if (todayCount >= maxPerDay) return { outcome: "daily_limit_reached" };
    }
    this.state.pointTransactions.push(structuredClone(transaction));
    return { outcome: "inserted", transaction: structuredClone(transaction) };
  }

  async getExchangeItem(itemId: string) {
    return copyOrNull(this.state.exchangeItems.find((item) => item.id === itemId));
  }

  async exchangePoints(input: { itemId: string; debit: Omit<PointTransaction, "amount"> }): Promise<ExchangeResult> {
    // ここから書き込みまで await を挟まない（残高・在庫の確認と引き落としを分けないため）
    if (this.state.pointTransactions.some((existing) => existing.idempotencyKey === input.debit.idempotencyKey)) {
      return { outcome: "duplicate_key" };
    }
    const item = this.state.exchangeItems.find((candidate) => candidate.id === input.itemId);
    if (!item) return { outcome: "item_not_found" };
    const balance = sumBalance(this.state.pointTransactions.filter((transaction) => transaction.userId === input.debit.userId));
    const decision = decideExchange({ balance, costPoints: item.costPoints, stock: item.stock });
    if (decision.kind === "out_of_stock") return { outcome: "out_of_stock" };
    if (decision.kind === "insufficient_points") return { outcome: "insufficient_points", shortBy: decision.shortBy };
    const transaction: PointTransaction = { ...input.debit, amount: -decision.cost };
    this.state.pointTransactions.push(structuredClone(transaction));
    item.stock -= 1;
    return { outcome: "exchanged", transaction: structuredClone(transaction) };
  }

  // --- 監査 ---

  async appendAuditLog(log: AuditLog) {
    this.state.auditLogs.push(structuredClone(log));
  }

  async listAuditLogs(query: PageQuery) {
    // 新しい順。監査画面は直近の操作から見たいので
    const sorted = [...this.state.auditLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginate(sorted, query);
  }

  // --- コンテンツ ---

  async getVideo(videoId: string) {
    return copyOrNull(this.state.videos.find((video) => video.id === videoId));
  }

  async listVideos(query: PageQuery & { category?: VideoCategory; publishedOnly: boolean }) {
    const filtered = this.state.videos.filter(
      (video) => (query.category === undefined || video.category === query.category) && (!query.publishedOnly || video.publishedAt !== null),
    );
    return paginate(filtered, query);
  }

  async listClassRooms() {
    return structuredClone(this.state.classRooms);
  }

  async listLectureCategories() {
    return structuredClone([...this.state.lectureCategories].sort((a, b) => a.sortOrder - b.sortOrder));
  }

  async getDiagnosis(diagnosisId: string) {
    const diagnosis = this.state.diagnoses.find((candidate) => candidate.id === diagnosisId);
    if (!diagnosis) return null;
    const questions = this.state.diagnosisQuestions.filter((question) => question.diagnosisId === diagnosisId).sort((a, b) => a.sortOrder - b.sortOrder);
    return structuredClone({ diagnosis, questions });
  }

  async listDiagnoses() {
    return structuredClone(this.state.diagnoses);
  }

  // --- 提出物 ---

  async getSoccerNote(noteId: string) {
    return copyOrNull(this.state.soccerNotes.find((note) => note.id === noteId));
  }

  async listSoccerNotes(query: PageQuery & { studentIds: readonly UserId[] }) {
    const filtered = this.state.soccerNotes
      .filter((note) => query.studentIds.includes(note.studentId))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    return paginate(filtered, query);
  }

  async getVideoReview(reviewId: string) {
    return copyOrNull(this.state.videoReviews.find((review) => review.id === reviewId));
  }
}

function copyOrNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : structuredClone(value);
}

function replaceWhere<T>(items: T[], predicate: (item: T) => boolean, replacement: T): void {
  const index = items.findIndex(predicate);
  if (index >= 0) items[index] = replacement;
}

function paginate<T>(items: readonly T[], query: PageQuery): Page<T> {
  // ページサイズの上限を決めておく。URL から巨大な値を渡されて全件を返さないように
  const pageSize = Math.min(Math.max(1, Math.floor(query.pageSize)), 100);
  const page = Math.max(1, Math.floor(query.page));
  const start = (page - 1) * pageSize;
  return { items: structuredClone(items.slice(start, start + pageSize)), total: items.length, page, pageSize };
}
