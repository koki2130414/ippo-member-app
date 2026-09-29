import { decideExchange, sumBalance } from "@/domain/points";
import type { ApplicationStatus, AuditLog, Credential, Invitation, ParentStudentLink, RegistrationApplication, Session, PlanCode, PointTransaction, PrivateProfile, PublicProfile, UserId, UserRole, VideoCategory, VideoProgress, ViewSession } from "@/domain/types";
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

  /**
   * デモでは、途中で失敗したら状態を丸ごと元に戻すことで「全部か無か」にする。
   * （同時に別の操作が走ると、その変更も巻き戻る。デモ用なので割り切っている）
   */
  async transaction<T>(work: (store: MockDataStore) => Promise<T>): Promise<T> {
    const snapshot = structuredClone(this.state);
    try {
      return await work(this);
    } catch (error) {
      for (const key of Object.keys(snapshot)) Reflect.set(this.state, key, Reflect.get(snapshot, key));
      throw error;
    }
  }

  async createParentStudentLink(link: ParentStudentLink) {
    const exists = this.state.parentStudentLinks.some((item) => item.guardianId === link.guardianId && item.studentId === link.studentId);
    if (!exists) this.state.parentStudentLinks.push(structuredClone(link));
  }

  // --- 入会の申し込み ---

  async createApplication(application: RegistrationApplication) {
    this.state.applications.push(structuredClone(application));
  }

  async getApplication(applicationId: string) {
    return copyOrNull(this.state.applications.find((application) => application.id === applicationId));
  }

  async listApplications(query: PageQuery & { status: ApplicationStatus }) {
    // 未対応は古い順（待たせている順）、対応済みは新しい順
    const filtered = this.state.applications
      .filter((application) => application.status === query.status)
      .sort((a, b) => (query.status === "pending" ? a.createdAt.localeCompare(b.createdAt) : (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? "")));
    return paginate(filtered, query);
  }

  async countPendingApplicationsByEmail(email: string) {
    return this.state.applications.filter((application) => application.status === "pending" && application.guardianEmail === email).length;
  }

  async completeReview(application: RegistrationApplication) {
    const current = this.state.applications.find((item) => item.id === application.id);
    if (!current || current.status !== "pending") return false;
    replaceWhere(this.state.applications, (item) => item.id === application.id, structuredClone(application));
    return true;
  }

  // --- 招待とログイン ---

  async createInvitation(invitation: Invitation) {
    this.state.invitations.push(structuredClone(invitation));
  }

  async findInvitationByTokenHash(tokenHash: string) {
    return copyOrNull(this.state.invitations.find((invitation) => invitation.tokenHash === tokenHash));
  }

  async markInvitationUsed(invitationId: string, usedAt: string) {
    const invitation = this.state.invitations.find((item) => item.id === invitationId);
    if (!invitation || invitation.usedAt !== null) return false;
    invitation.usedAt = usedAt;
    return true;
  }

  async getCredentialByLoginId(loginId: string) {
    return copyOrNull(this.state.credentials.find((credential) => credential.loginId === loginId));
  }

  async getCredentialByUserId(userId: UserId) {
    return copyOrNull(this.state.credentials.find((credential) => credential.userId === userId));
  }

  async saveCredential(credential: Credential) {
    const takenByOther = this.state.credentials.some((item) => item.loginId === credential.loginId && item.userId !== credential.userId);
    if (takenByOther) return { outcome: "login_id_taken" as const };
    this.state.credentials = this.state.credentials.filter((item) => item.userId !== credential.userId);
    this.state.credentials.push(structuredClone(credential));
    return { outcome: "saved" as const };
  }

  async createSession(session: Session) {
    this.state.sessions.push(structuredClone(session));
  }

  async findSession(tokenHash: string, now: Date) {
    return copyOrNull(this.state.sessions.find((session) => session.tokenHash === tokenHash && new Date(session.expiresAt).getTime() > now.getTime()));
  }

  async deleteSession(tokenHash: string) {
    this.state.sessions = this.state.sessions.filter((session) => session.tokenHash !== tokenHash);
  }

  async deleteSessionsForUser(userId: UserId) {
    this.state.sessions = this.state.sessions.filter((session) => session.userId !== userId);
  }

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
    const emailTaken = member.privateProfile.email !== null && this.state.privateProfiles.some((profile) => profile.email === member.privateProfile.email && profile.deletedAt === null);
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
    // ログインできないようにする（パスワードとログイン中のセッションを消す）
    this.state.credentials = this.state.credentials.filter((credential) => credential.userId !== userId);
    this.state.sessions = this.state.sessions.filter((session) => session.userId !== userId);
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
    const filtered = this.state.videos
      .filter((video) => (query.category === undefined || video.category === query.category) && (!query.publishedOnly || video.publishedAt !== null))
      // 新しいクラスから並べる（公開日の無い下書きは最後）
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    return paginate(filtered, query);
  }

  async listClassRooms() {
    return structuredClone(this.state.classRooms);
  }

  async listLectureCategories() {
    return structuredClone([...this.state.lectureCategories].sort((a, b) => a.sortOrder - b.sortOrder));
  }

  async listLectures(query: PageQuery & { categoryId?: string; publishedOnly: boolean }) {
    const filtered = this.state.lectures.filter(
      (lecture) => (query.categoryId === undefined || lecture.categoryId === query.categoryId) && (!query.publishedOnly || lecture.publishedAt !== null),
    );
    return paginate(filtered, query);
  }

  async getLecture(lectureId: string) {
    return copyOrNull(this.state.lectures.find((lecture) => lecture.id === lectureId));
  }

  async listQuizQuestions(lectureId: string) {
    return structuredClone(this.state.quizQuestions.filter((question) => question.lectureId === lectureId));
  }

  // --- 学習の進み具合 ---

  async createViewSession(session: ViewSession) {
    this.state.viewSessions.push(structuredClone(session));
    // デモのメモリが増え続けないよう、古いものから捨てる（完了判定には直近のものしか使わない）
    if (this.state.viewSessions.length > 5000) this.state.viewSessions.splice(0, this.state.viewSessions.length - 5000);
  }

  async getViewSession(sessionId: string) {
    return copyOrNull(this.state.viewSessions.find((session) => session.id === sessionId));
  }

  async getVideoProgress(userId: UserId, videoId: string) {
    return copyOrNull(this.state.videoProgress.find((progress) => progress.userId === userId && progress.videoId === videoId));
  }

  async listVideoProgress(userId: UserId) {
    return structuredClone(this.state.videoProgress.filter((progress) => progress.userId === userId));
  }

  async markVideoCompleted(progress: VideoProgress) {
    const existing = this.state.videoProgress.find((item) => item.userId === progress.userId && item.videoId === progress.videoId);
    if (existing?.completedAt) return { firstTime: false };
    if (existing) {
      existing.completedAt = progress.completedAt;
      existing.watchedSeconds = Math.max(existing.watchedSeconds, progress.watchedSeconds);
    } else {
      this.state.videoProgress.push(structuredClone(progress));
    }
    return { firstTime: true };
  }

  async getLectureProgress(userId: UserId, lectureId: string) {
    return copyOrNull(this.state.lectureProgress.find((progress) => progress.userId === userId && progress.lectureId === lectureId));
  }

  async listLectureProgress(userId: UserId) {
    return structuredClone(this.state.lectureProgress.filter((progress) => progress.userId === userId));
  }

  async markLectureCompleted(input: { userId: UserId; lectureId: string; completedAt: string }) {
    const existing = this.state.lectureProgress.find((item) => item.userId === input.userId && item.lectureId === input.lectureId);
    if (existing?.completedAt) return { firstTime: false };
    if (existing) {
      existing.completedAt = input.completedAt;
    } else {
      this.state.lectureProgress.push({ userId: input.userId, lectureId: input.lectureId, completedAt: input.completedAt, quizPassedAt: null });
    }
    return { firstTime: true };
  }

  async markQuizPassed(input: { userId: UserId; lectureId: string; passedAt: string }) {
    const existing = this.state.lectureProgress.find((item) => item.userId === input.userId && item.lectureId === input.lectureId);
    if (existing?.quizPassedAt) return { firstTime: false };
    if (existing) {
      existing.quizPassedAt = input.passedAt;
    } else {
      // クイズだけ先に解いた場合も、講義は「読んだ」扱いにはしない（読了は別の判定）。合格だけを記録する
      this.state.lectureProgress.push({ userId: input.userId, lectureId: input.lectureId, completedAt: null, quizPassedAt: input.passedAt });
    }
    return { firstTime: true };
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
