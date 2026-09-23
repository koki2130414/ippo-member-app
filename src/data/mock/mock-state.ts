import type {
  AuditLog,
  ClassEnrollment,
  ClassRoom,
  CoachAssignment,
  Diagnosis,
  DiagnosisQuestion,
  ExchangeItem,
  LectureCategory,
  Membership,
  ParentStudentLink,
  Plan,
  PointRule,
  PointTransaction,
  PrivateProfile,
  PublicProfile,
  SoccerNote,
  Video,
  VideoReview,
} from "@/domain/types";

/**
 * デモモードのデータ一式。テーブルと1対1に対応させておき、Supabase へ移すときに形を変えずに済むようにする。
 * Map ではなく配列にしているのは、seed をそのまま JSON で読み書き・比較できるようにするため。
 */
export interface MockState {
  publicProfiles: PublicProfile[];
  privateProfiles: PrivateProfile[];
  parentStudentLinks: ParentStudentLink[];
  coachAssignments: CoachAssignment[];
  classEnrollments: ClassEnrollment[];
  plans: Plan[];
  memberships: Membership[];
  pointRules: PointRule[];
  pointTransactions: PointTransaction[];
  exchangeItems: ExchangeItem[];
  auditLogs: AuditLog[];
  videos: Video[];
  classRooms: ClassRoom[];
  lectureCategories: LectureCategory[];
  diagnoses: Diagnosis[];
  diagnosisQuestions: DiagnosisQuestion[];
  soccerNotes: SoccerNote[];
  videoReviews: VideoReview[];
}
