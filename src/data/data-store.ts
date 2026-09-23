import type {
  AuditLog,
  ClassRoom,
  Diagnosis,
  DiagnosisQuestion,
  ExchangeItem,
  LectureCategory,
  Membership,
  Plan,
  PlanCode,
  PointRule,
  PointTransaction,
  PrivateProfile,
  PublicProfile,
  SoccerNote,
  UserId,
  UserRole,
  Video,
  VideoCategory,
  VideoReview,
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

  // --- 会員 ---
  getPublicProfile(userId: UserId): Promise<PublicProfile | null>;
  getPrivateProfile(userId: UserId): Promise<PrivateProfile | null>;
  findUserIdByEmail(email: string): Promise<UserId | null>;
  listMembers(query: PageQuery & { role?: UserRole; includeDeleted?: boolean }): Promise<Page<PublicProfile>>;
  createMember(member: NewMember): Promise<{ outcome: "created" } | { outcome: "email_taken" }>;
  /** 退会処理。公開・非公開プロフィールの置き換えと、紐付け類の削除を1回で行う */
  applyMemberDeletion(input: { publicProfile: PublicProfile; privateProfile: PrivateProfile }): Promise<void>;
  countActiveAdmins(): Promise<number>;

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
  getDiagnosis(diagnosisId: string): Promise<{ diagnosis: Diagnosis; questions: DiagnosisQuestion[] } | null>;
  listDiagnoses(): Promise<Diagnosis[]>;

  // --- 提出物 ---
  getSoccerNote(noteId: string): Promise<SoccerNote | null>;
  listSoccerNotes(query: PageQuery & { studentIds: readonly UserId[] }): Promise<Page<SoccerNote>>;
  getVideoReview(reviewId: string): Promise<VideoReview | null>;
}
