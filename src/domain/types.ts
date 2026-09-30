/**
 * IPPO 会員アプリのドメイン型。
 *
 * 方針:
 * - ここは「サーバー内部の完全な形」を定義する。クライアントへ渡す形は dto.ts で別名にし、
 *   秘密フィールドを Omit で落とす（仕様 5章・6章）。
 * - 日時はすべて UTC の ISO 文字列で持つ。「今日」「今月」の判定は jst.ts だけが行う。
 * - ID は string。DB の uuid と mock の連番のどちらでも同じ型で扱えるようにするため。
 */

// ---------------------------------------------------------------------------
// 共通
// ---------------------------------------------------------------------------

/** UTC の ISO 8601 文字列（例: 2026-09-24T00:00:00.000Z）。Date を持ち回らないのは、RSC のシリアライズで型が崩れるのを避けるため */
export type IsoDateTime = string;
/** JST の暦日（YYYY-MM-DD）。時刻を持たない「日付」はこの型にして、UTC と混ぜない */
export type JstDate = string;
/** JST の暦月（YYYY-MM） */
export type JstMonth = string;

export type UserId = string;

export const USER_ROLES = ["student", "guardian", "coach", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** 小学生・中学生の区分。年齢や生年月日そのものは保存しない（仕様 5章: 個人情報を必要以上に保存しない） */
export const AGE_BANDS = ["elementary_lower", "elementary_upper", "junior_high", "adult"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

// ---------------------------------------------------------------------------
// プロフィール
// ---------------------------------------------------------------------------

/**
 * 他の会員やコーチの画面に出てよい情報だけ。
 * 本名（fullName）はここに絶対に入れない。型で持たせないことで、うっかり表示する経路を消す。
 */
export interface PublicProfile {
  userId: UserId;
  displayName: string;
  /** アバターは用意したプリセットから選ぶ。顔写真のアップロードは受け付けない（未成年保護） */
  avatarKey: string;
  ageBand: AgeBand | null;
  role: UserRole;
}

/** 本人・紐づいた保護者・運営だけが見る情報 */
export interface PrivateProfile {
  userId: UserId;
  fullName: string;
  /** 連絡先。生徒は自分のメールを持たないことが多いので null を許す（保護者のメールで連絡する） */
  email: string | null;
  /** 申込時の学年と都道府県（生徒のみ）。学年は4月に変わるので、申込時点の値として持つ */
  grade: Grade | null;
  prefecture: Prefecture | null;
  createdAt: IsoDateTime;
  /** 退会済みなら日時が入る。行そのものは監査のために残し、個人情報だけを消す */
  deletedAt: IsoDateTime | null;
}

export interface ParentStudentLink {
  guardianId: UserId;
  studentId: UserId;
  createdAt: IsoDateTime;
}

/** コーチの担当範囲。「担当している生徒」を明示的な行で持つ（クラスから推測しない＝見える範囲を広げすぎない） */
export interface CoachAssignment {
  coachId: UserId;
  studentId: UserId;
  createdAt: IsoDateTime;
}

/**
 * 招待（初回のパスワード設定用の使い切りリンク）。
 * リンクのトークンそのものは保存せず、ハッシュだけを持つ（DB が漏れても招待リンクを作り直せないように）。
 */
/**
 * 見学リンク。運営が発行し、リンクを知っている人はログインなしで共用の「見学用」アカウントとして会員画面を見られる。
 * 有効なのは常に1本だけ（作り直すと前のリンクは使えなくなる）。トークンはハッシュだけを保存する。
 */
export interface GuestLink {
  id: string;
  tokenHash: string;
  createdBy: UserId;
  createdAt: IsoDateTime;
  revokedAt: IsoDateTime | null;
}

export interface Invitation {
  id: string;
  tokenHash: string;
  /**
   * family_setup: 申し込みを承認したときに保護者へ送る（保護者と子どもの両方のパスワードを決める）
   * account_setup: 運営が1人分のログインを用意するとき（パスワードの再設定にも使う）
   */
  purpose: "family_setup" | "account_setup";
  guardianUserId: UserId | null;
  studentUserId: UserId | null;
  /** account_setup のときの対象（生徒以外も含む） */
  accountUserId: UserId | null;
  expiresAt: IsoDateTime;
  usedAt: IsoDateTime | null;
  createdBy: UserId;
  createdAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// 入会の申し込み
// ---------------------------------------------------------------------------

export const GRADES = ["e1", "e2", "e3", "e4", "e5", "e6", "j1", "j2", "j3"] as const;
export type Grade = (typeof GRADES)[number];

export const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県",
  "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
  "海外",
] as const;
export type Prefecture = (typeof PREFECTURES)[number];

export const APPLICATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/**
 * 保護者からの入会申し込み。集めるのは運営が決めた4項目（名前・学年・出身地・メールアドレス）と、
 * アプリで表示するニックネーム（本名を他の会員に見せないため）だけ。
 */
export interface RegistrationApplication {
  id: string;
  status: ApplicationStatus;
  guardianEmail: string;
  childFullName: string;
  childDisplayName: string;
  grade: Grade;
  prefecture: Prefecture;
  /** 同意した規約・プライバシーポリシーの版 */
  consentVersion: string;
  createdAt: IsoDateTime;
  reviewedAt: IsoDateTime | null;
  reviewedBy: UserId | null;
  /** 運営だけが見るメモ（却下の理由など）。申込者には表示しない */
  reviewNote: string | null;
  studentUserId: UserId | null;
  guardianUserId: UserId | null;
}

// ---------------------------------------------------------------------------
// ログイン
// ---------------------------------------------------------------------------

/** ログインIDとパスワードのハッシュ。保護者・コーチ・運営のログインIDはメールアドレス、生徒は発行したID */
export interface Credential {
  userId: UserId;
  loginId: string;
  passwordHash: string;
  updatedAt: IsoDateTime;
}

/** ログイン中のセッション。クッキーにはランダムなトークンを入れ、ここにはハッシュだけを持つ */
export interface Session {
  tokenHash: string;
  userId: UserId;
  createdAt: IsoDateTime;
  expiresAt: IsoDateTime;
}

export interface TermsAcceptance {
  userId: UserId;
  termsVersion: string;
  acceptedAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// プランと利用権
// ---------------------------------------------------------------------------

export const PLAN_CODES = ["light", "balance", "soccer_iq", "personal", "professional"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

/**
 * 月あたりの上限。0 = 使えない、null = 無制限。
 * boolean を並べないのは、「月2本まで」への変更を数値の変更だけで済ませるため（仕様 7章）。
 */
export type MonthlyLimit = number | null;

export interface PlanLimits {
  /** 月に参加できるクラス開催回数 */
  classSlots: MonthlyLimit;
  /** 個別メニュー。月の回数ではなく「受け取れるか」なので、0 か null だけを使う */
  personalMenu: MonthlyLimit;
  personalSessions: MonthlyLimit;
  videoReviews: MonthlyLimit;
  notes: MonthlyLimit;
  /** 全プラン共通で見放題だが、将来の変更に備えて同じ形で持つ */
  classVideos: MonthlyLimit;
  lectures: MonthlyLimit;
  diagnoses: MonthlyLimit;
}

export type PlanFeature = keyof PlanLimits;

export interface Plan {
  code: PlanCode;
  name: string;
  monthlyPriceYen: number;
  limits: PlanLimits;
  /** 表示順。料金の安い順と一致させる */
  sortOrder: number;
}

/** 会員に割り当てたプラン。決済は MVP 外なので、運営が手で割り当てる（仕様 7章） */
export interface Membership {
  userId: UserId;
  planCode: PlanCode;
  startedAt: IsoDateTime;
  endedAt: IsoDateTime | null;
  assignedBy: UserId;
}

// ---------------------------------------------------------------------------
// クラス
// ---------------------------------------------------------------------------

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const; // 0 = 日曜
export type Weekday = (typeof WEEKDAYS)[number];

/** 「第n週」。5 は存在しない月があるので、その月は開催しない。"last" は最終週 */
export type WeekOfMonth = 1 | 2 | 3 | 4 | 5 | "last";

export interface ClassSchedule {
  weekOfMonth: WeekOfMonth;
  weekday: Weekday;
  /** JST の開始時刻 HH:mm */
  startTimeJst: string;
  durationMinutes: number;
}

export interface ClassRoom {
  id: string;
  name: string;
  category: VideoCategory;
  description: string;
  schedule: ClassSchedule;
  coachIds: UserId[];
  capacity: number;
}

export interface ClassSession {
  id: string;
  classRoomId: string;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  /** 会議URLはセッション直前まで出さない。生徒向け DTO では条件付きで渡す（Phase 4） */
  meetingUrl: string | null;
}

export const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface Attendance {
  sessionId: string;
  studentId: UserId;
  status: AttendanceStatus;
  recordedBy: UserId;
  recordedAt: IsoDateTime;
}

export interface ClassReflection {
  id: string;
  sessionId: string;
  studentId: UserId;
  body: string;
  createdAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// 動画
// ---------------------------------------------------------------------------

export const VIDEO_CATEGORIES = ["soccer_iq", "mentality", "fitness", "other"] as const;
export type VideoCategory = (typeof VIDEO_CATEGORIES)[number];

export const VIDEO_SOURCES = ["upload", "mux", "youtube"] as const;
export type VideoSource = (typeof VIDEO_SOURCES)[number];

export interface Video {
  id: string;
  title: string;
  description: string;
  category: VideoCategory;
  durationSeconds: number;
  source: VideoSource;
  /** Supabase Storage（private バケット）上のパス。サーバー専用 */
  storageKey: string | null;
  /** Mux の Signed Playback ID。サーバー専用 */
  muxPlaybackId: string | null;
  /**
   * YouTube の動画ID。これだけは意図的にクライアントへ渡す。
   * YouTube は署名で守れない（ID が分かれば誰でも外で見られる）ので、隠しても守ったことにならない。
   * 代わりに「アプリの外でも見られる」ことを UI で必ず明示する（仕様 9章）。
   */
  youtubeId: string | null;
  publishedAt: IsoDateTime | null;
  createdBy: UserId;
}

export interface VideoProgress {
  userId: UserId;
  videoId: string;
  watchedSeconds: number;
  completedAt: IsoDateTime | null;
}

/**
 * 「見はじめた／読みはじめた」の記録。完了を自己申告だけで認めないために、サーバーが開始時刻を持つ。
 * 再生トークンを発行したとき（動画）、講義ページを開いて POST が来たとき（講義）に作る。
 */
export interface ViewSession {
  id: string;
  userId: UserId;
  kind: "video" | "lecture";
  targetId: string;
  startedAt: IsoDateTime;
}

export interface LectureProgress {
  userId: UserId;
  lectureId: string;
  /** 読み終わった日時。クイズだけ先に合格した場合は null */
  completedAt: IsoDateTime | null;
  /** クイズに合格した日時。何度でも挑戦できるが、ポイントは合格1回分だけ */
  quizPassedAt: IsoDateTime | null;
}

// ---------------------------------------------------------------------------
// 講義とクイズ
// ---------------------------------------------------------------------------

export interface LectureCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface QuizChoice {
  id: string;
  label: string;
  /** 正解フラグ。サーバー専用。クライアント用 DTO では型レベルで落とす */
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  lectureId: string;
  prompt: string;
  choices: QuizChoice[];
  /** 送信後に見せる解説。送信前に渡すと答えが分かるのでこれもサーバー専用扱い */
  explanation: string;
}

export interface Lecture {
  id: string;
  categoryId: string;
  title: string;
  body: string;
  videoId: string | null;
  /** 合格に必要な正答数の割合（0〜1） */
  quizPassRatio: number;
  publishedAt: IsoDateTime | null;
}

// ---------------------------------------------------------------------------
// サッカーIQ診断
// ---------------------------------------------------------------------------

export interface Diagnosis {
  id: string;
  title: string;
  description: string;
  /** 採点の観点。結果はここに並んだ順で表示する */
  categories: DiagnosisCategory[];
}

export interface DiagnosisCategory {
  code: string;
  label: string;
}

export interface DiagnosisChoice {
  id: string;
  label: string;
  isCorrect: boolean;
}

export interface DiagnosisQuestion {
  id: string;
  diagnosisId: string;
  categoryCode: string;
  prompt: string;
  choices: DiagnosisChoice[];
  sortOrder: number;
}

export interface CategoryScore {
  categoryCode: string;
  correct: number;
  total: number;
  /** 0〜100 の整数。他人との比較には使わない（順位は作らない） */
  percent: number;
}

export interface DiagnosisAttempt {
  id: string;
  diagnosisId: string;
  userId: UserId;
  answers: Record<string, string>;
  scores: CategoryScore[];
  submittedAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// 個別サポート（パーソナル）
// ---------------------------------------------------------------------------

export interface PersonalMenuItem {
  id: string;
  studentId: UserId;
  coachId: UserId;
  title: string;
  instructions: string;
  createdAt: IsoDateTime;
  doneAt: IsoDateTime | null;
}

export interface PersonalSession {
  id: string;
  studentId: UserId;
  coachId: UserId;
  startsAt: IsoDateTime;
  status: "scheduled" | "done" | "cancelled";
}

export interface VideoReview {
  id: string;
  studentId: UserId;
  /** 生徒が出したプレー動画。private バケットに置き、署名URLでだけ見せる */
  storageKey: string;
  studentComment: string;
  coachId: UserId | null;
  coachReply: string | null;
  submittedAt: IsoDateTime;
  repliedAt: IsoDateTime | null;
}

export interface SoccerNote {
  id: string;
  studentId: UserId;
  /** soccer-notes バケット上のパス。サーバー専用 */
  photoStorageKey: string;
  studentComment: string;
  coachId: UserId | null;
  coachReply: string | null;
  submittedAt: IsoDateTime;
  repliedAt: IsoDateTime | null;
}

// ---------------------------------------------------------------------------
// 連絡（監査対象チャンネル）
// ---------------------------------------------------------------------------

/**
 * チャットは「コーチと生徒（＋保護者）の1対1」か「クラス全体へのお知らせ」だけ。
 * 生徒同士の DM は型としても作らない（仕様 5章: 未成年者保護）。
 */
export type ChatRoomKind = "coach_student" | "class_broadcast";

export interface ChatRoom {
  id: string;
  kind: ChatRoomKind;
  /** coach_student のときの生徒。保護者はこの生徒への紐付けで閲覧できる */
  studentId: UserId | null;
  classRoomId: string | null;
  coachIds: UserId[];
  createdAt: IsoDateTime;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  authorId: UserId;
  body: string;
  createdAt: IsoDateTime;
  editedAt: IsoDateTime | null;
  /** 削除も非表示も行は消さない。監査で経緯を追えるようにするため */
  deletedAt: IsoDateTime | null;
  hiddenAt: IsoDateTime | null;
}

// ---------------------------------------------------------------------------
// ポイント
// ---------------------------------------------------------------------------

export const POINT_RULE_CODES = [
  "login_daily",
  "profile_completed",
  "video_completed",
  "lecture_completed",
  "quiz_passed",
  "diagnosis_completed",
  "streak_daily",
  "streak_bonus_7",
  "class_attended",
  "reflection_submitted",
  "personal_menu_done",
  "personal_session_done",
  "video_review_submitted",
  "note_submitted",
  "coach_bonus",
  "event_participation",
  "admin_adjustment",
] as const;
export type PointRuleCode = (typeof POINT_RULE_CODES)[number];

export interface PointRule {
  code: PointRuleCode;
  label: string;
  /** 1行動 = 1pt。null は「付与する人が都度決める」（コーチ加点・運営調整など） */
  points: number | null;
  /** JST の1暦日あたりの上限回数。null = 無制限 */
  maxPerDay: number | null;
  /** 誰が付与を起こせるか。生徒自身の行動で起きるものは system */
  grantedBy: "system" | "coach" | "admin";
}

/**
 * ポイントの取引履歴。これが唯一の正で、残高はここから計算する（仕様 8章）。
 * 引き落とし（交換）は負の amount で表す。
 */
export interface PointTransaction {
  id: string;
  userId: UserId;
  amount: number;
  /** 交換による引き落としは "exchange" */
  reason: PointRuleCode | "exchange";
  /** 同じイベントへの二重付与を防ぐキー。DB ではユニーク制約を張る */
  idempotencyKey: string;
  /** JST の暦日。日次上限の判定に使う */
  jstDate: JstDate;
  createdAt: IsoDateTime;
  createdBy: UserId;
  note: string | null;
}

export interface ExchangeItem {
  id: string;
  name: string;
  costPoints: number;
  stock: number;
}

// ---------------------------------------------------------------------------
// お知らせ・通知
// ---------------------------------------------------------------------------

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: "all" | UserRole;
  publishedAt: IsoDateTime;
  createdBy: UserId;
}

export interface AppNotification {
  id: string;
  userId: UserId;
  title: string;
  href: string | null;
  createdAt: IsoDateTime;
  readAt: IsoDateTime | null;
}

// ---------------------------------------------------------------------------
// 監査
// ---------------------------------------------------------------------------

export const AUDIT_ACTIONS = [
  "member.create",
  "application.approve",
  "application.reject",
  "invitation.accept",
  "invitation.issue",
  "admin.setup",
  "guest_link.issue",
  "guest_link.revoke",
  "member.delete",
  "member.plan_assign",
  "link.create",
  "link.delete",
  "coach_assignment.create",
  "coach_assignment.delete",
  "video.create",
  "video.update",
  "video.delete",
  "points.adjust",
  "points.exchange",
  "chat.message_edit",
  "chat.message_delete",
  "chat.message_hide",
  "announcement.create",
  "attendance.record",
  "note.reply",
  "video_review.reply",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * 監査ログ。metadata には「何を変えたか」の識別子だけを入れ、本文や本名などの中身は入れない
 * （監査ログ自体が個人情報の溜まり場にならないように）。
 */
export interface AuditLog {
  id: string;
  actorId: UserId;
  actorRole: UserRole;
  action: AuditAction;
  targetType: string;
  targetId: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: IsoDateTime;
}

export interface ModerationLog {
  id: string;
  messageId: string;
  moderatorId: UserId;
  action: "hide" | "unhide";
  reason: string;
  createdAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// 認可で使う「いまの利用者」
// ---------------------------------------------------------------------------

/**
 * サーバーがセッションから組み立てる利用者像。
 * クライアントから送られた値で作らない（ロールや担当範囲を詐称させないため）。
 */
export interface Actor {
  userId: UserId;
  role: UserRole;
  /** 保護者のときだけ中身がある */
  linkedStudentIds: readonly UserId[];
  /** コーチのときだけ中身がある */
  assignedStudentIds: readonly UserId[];
  /** コーチが担当するクラス */
  coachClassRoomIds: readonly string[];
  /** 生徒が参加しているクラス（クラス全体のお知らせチャンネルを見るため） */
  enrolledClassRoomIds: readonly string[];
}

export interface ClassEnrollment {
  classRoomId: string;
  studentId: UserId;
  createdAt: IsoDateTime;
}
