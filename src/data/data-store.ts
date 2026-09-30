import type {
  ApplicationStatus,
  AuditLog,
  Credential,
  GuestLink,
  Invitation,
  ParentStudentLink,
  RegistrationApplication,
  Session,
  ClassRoom,
  Diagnosis,
  DiagnosisQuestion,
  ExchangeItem,
  Lecture,
  LectureCategory,
  LectureProgress,
  Membership,
  Plan,
  PlanCode,
  PointRule,
  PointTransaction,
  PrivateProfile,
  PublicProfile,
  QuizQuestion,
  SoccerNote,
  UserId,
  UserRole,
  Video,
  VideoCategory,
  VideoProgress,
  VideoReview,
  ViewSession,
} from "@/domain/types";

/**
 * データの出し入れの窓口。mock（インメモリ）と supabase（本番）の2実装を持つ。
 *
 * ここには「認可」を書かない。認可はサービス層（src/server/services）と Supabase RLS の仕事。
 * 逆に「同時に来ても壊れない」ことが必要な操作（ポイント付与・交換）は、ここで1回の原子的な操作として定義する。
 * サービス層で「数えてから足す」を別々に呼ぶと、同時アクセスで上限を超えるため。
 */

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PageQuery {
  page: number;
  pageSize: number;
}

export type AppendPointResult = { outcome: "inserted"; transaction: PointTransaction } | { outcome: "duplicate_key" } | { outcome: "daily_limit_reached" };

export type ExchangeResult =
  | { outcome: "exchanged"; transaction: PointTransaction }
  | { outcome: "duplicate_key" }
  | { outcome: "out_of_stock" }
  | { outcome: "insufficient_points"; shortBy: number }
  | { outcome: "item_not_found" };

export interface NewMember {
  publicProfile: PublicProfile;
  privateProfile: PrivateProfile;
}

export interface DataStore {
  readonly kind: "mock" | "supabase";

  /**
   * いくつかの書き込みを「全部やるか、何もしないか」にする。
   * 承認（生徒・保護者・紐付け・プラン・招待をまとめて作る）の途中で失敗して、半端なアカウントが残らないように。
   */
  transaction<T>(work: (store: DataStore) => Promise<T>): Promise<T>;

  // --- 会員 ---
  getPublicProfile(userId: UserId): Promise<PublicProfile | null>;
  getPrivateProfile(userId: UserId): Promise<PrivateProfile | null>;
  findUserIdByEmail(email: string): Promise<UserId | null>;
  listMembers(query: PageQuery & { role?: UserRole; includeDeleted?: boolean }): Promise<Page<PublicProfile>>;
  createMember(member: NewMember): Promise<{ outcome: "created" } | { outcome: "email_taken" }>;
  /** 退会処理。公開・非公開プロフィールの置き換えと、紐付け類の削除を1回で行う */
  applyMemberDeletion(input: { publicProfile: PublicProfile; privateProfile: PrivateProfile }): Promise<void>;
  countActiveAdmins(): Promise<number>;

  createParentStudentLink(link: ParentStudentLink): Promise<void>;

  // --- 入会の申し込み ---
  createApplication(application: RegistrationApplication): Promise<void>;
  getApplication(applicationId: string): Promise<RegistrationApplication | null>;
  listApplications(query: PageQuery & { status: ApplicationStatus }): Promise<Page<RegistrationApplication>>;
  countPendingApplicationsByEmail(email: string): Promise<number>;
  /**
   * 審査結果を書く。status が pending のときだけ書き換える（2人の運営が同時に押しても、二重に承認されない）。
   * 書き換えられたら true
   */
  completeReview(application: RegistrationApplication): Promise<boolean>;

  // --- 招待とログイン ---
  createInvitation(invitation: Invitation): Promise<void>;
  findInvitationByTokenHash(tokenHash: string): Promise<Invitation | null>;
  /** まだ使われていないときだけ使用済みにする。できたら true */
  markInvitationUsed(invitationId: string, usedAt: string): Promise<boolean>;
  // --- 見学リンク（有効なのは常に1本） ---
  /** 有効な見学リンクをすべて止めてから、新しい1本を入れる（まとめて1回で） */
  replaceGuestLink(link: GuestLink): Promise<void>;
  /** 有効な見学リンクを止める。止めた本数を返す */
  revokeGuestLinks(revokedAt: string): Promise<number>;
  getActiveGuestLink(): Promise<GuestLink | null>;
  findActiveGuestLinkByTokenHash(tokenHash: string): Promise<GuestLink | null>;
  getCredentialByLoginId(loginId: string): Promise<Credential | null>;
  getCredentialByUserId(userId: UserId): Promise<Credential | null>;
  saveCredential(credential: Credential): Promise<{ outcome: "saved" } | { outcome: "login_id_taken" }>;
  createSession(session: Session): Promise<void>;
  /** 有効期限内のセッションだけを返す */
  findSession(tokenHash: string, now: Date): Promise<Session | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteSessionsForUser(userId: UserId): Promise<void>;

  // --- 関係（認可の材料） ---
  listLinkedStudentIds(guardianId: UserId): Promise<UserId[]>;
  listAssignedStudentIds(coachId: UserId): Promise<UserId[]>;
  listCoachClassRoomIds(coachId: UserId): Promise<string[]>;
  listEnrolledClassRoomIds(studentId: UserId): Promise<string[]>;

  // --- プラン ---
  listPlans(): Promise<Plan[]>;
  getActiveMembership(userId: UserId): Promise<Membership | null>;
  /** 今のプランを終了し、新しいプランを始める。null なら終了だけ */
  replaceMembership(input: { userId: UserId; planCode: PlanCode | null; assignedBy: UserId; now: Date }): Promise<void>;

  // --- ポイント ---
  listPointRules(): Promise<PointRule[]>;
  listPointTransactions(userId: UserId): Promise<PointTransaction[]>;
  /**
   * 取引を1行足す。冪等キーの重複と、同じルール・同じ JST 暦日の件数上限を、書き込みと同時に確かめる。
   * maxPerDay が null なら件数は見ない。
   */
  appendPointTransaction(transaction: PointTransaction, maxPerDay: number | null): Promise<AppendPointResult>;
  getExchangeItem(itemId: string): Promise<ExchangeItem | null>;
  /** 残高確認・在庫確認・引き落とし・在庫減を1回で行う */
  exchangePoints(input: { itemId: string; debit: Omit<PointTransaction, "amount"> }): Promise<ExchangeResult>;

  // --- 監査 ---
  appendAuditLog(log: AuditLog): Promise<void>;
  listAuditLogs(query: PageQuery): Promise<Page<AuditLog>>;

  // --- コンテンツ（Phase 3 以降で増やす） ---
  getVideo(videoId: string): Promise<Video | null>;
  listVideos(query: PageQuery & { category?: VideoCategory; publishedOnly: boolean }): Promise<Page<Video>>;
  listClassRooms(): Promise<ClassRoom[]>;
  listLectureCategories(): Promise<LectureCategory[]>;
  listLectures(query: PageQuery & { categoryId?: string; publishedOnly: boolean }): Promise<Page<Lecture>>;
  getLecture(lectureId: string): Promise<Lecture | null>;
  /** 正解フラグを含む。サービス層で DTO に変換してからしか外へ出さない */
  listQuizQuestions(lectureId: string): Promise<QuizQuestion[]>;

  // --- 学習の進み具合 ---
  createViewSession(session: ViewSession): Promise<void>;
  getViewSession(sessionId: string): Promise<ViewSession | null>;
  getVideoProgress(userId: UserId, videoId: string): Promise<VideoProgress | null>;
  listVideoProgress(userId: UserId): Promise<VideoProgress[]>;
  /** 完了にする。すでに完了なら何もしない（最初の完了日時を残す） */
  markVideoCompleted(progress: VideoProgress): Promise<{ firstTime: boolean }>;
  getLectureProgress(userId: UserId, lectureId: string): Promise<LectureProgress | null>;
  listLectureProgress(userId: UserId): Promise<LectureProgress[]>;
  markLectureCompleted(input: { userId: UserId; lectureId: string; completedAt: string }): Promise<{ firstTime: boolean }>;
  markQuizPassed(input: { userId: UserId; lectureId: string; passedAt: string }): Promise<{ firstTime: boolean }>;
  getDiagnosis(diagnosisId: string): Promise<{ diagnosis: Diagnosis; questions: DiagnosisQuestion[] } | null>;
  listDiagnoses(): Promise<Diagnosis[]>;

  // --- 提出物 ---
  getSoccerNote(noteId: string): Promise<SoccerNote | null>;
  listSoccerNotes(query: PageQuery & { studentIds: readonly UserId[] }): Promise<Page<SoccerNote>>;
  getVideoReview(reviewId: string): Promise<VideoReview | null>;
}
