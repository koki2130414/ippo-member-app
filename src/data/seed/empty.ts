import type { MockState } from "../mock/mock-state";
import { BASE_CLASS_ROOMS, BASE_DIAGNOSIS, BASE_DIAGNOSIS_QUESTIONS, BASE_LECTURE_CATEGORIES, BASE_PLANS, BASE_POINT_RULES, SEED_CREATED_AT } from "./base-content";
import { DEMO_IDS } from "./ids";

/**
 * 既定の seed。運営アカウント1つと、人物以外の定義だけ。架空の子どもは1人も入れない。
 * 環境変数を書き忘れても、架空の子どもが本番の画面に出ることを構造的に防ぐため（仕様 12章）。
 */
export function createEmptySeed(): MockState {
  return {
    publicProfiles: [{ userId: DEMO_IDS.admin, displayName: "運営", avatarKey: "default", ageBand: "adult", role: "admin" }],
    privateProfiles: [{ userId: DEMO_IDS.admin, fullName: "運営アカウント", email: "admin@example.invalid", createdAt: SEED_CREATED_AT, deletedAt: null }],
    parentStudentLinks: [],
    coachAssignments: [],
    classEnrollments: [],
    plans: structuredClone(BASE_PLANS),
    memberships: [],
    pointRules: structuredClone(BASE_POINT_RULES),
    pointTransactions: [],
    exchangeItems: [],
    auditLogs: [],
    videos: [],
    classRooms: structuredClone(BASE_CLASS_ROOMS),
    lectureCategories: structuredClone(BASE_LECTURE_CATEGORIES),
    diagnoses: [structuredClone(BASE_DIAGNOSIS)],
    diagnosisQuestions: structuredClone(BASE_DIAGNOSIS_QUESTIONS),
    soccerNotes: [],
    videoReviews: [],
  };
}
