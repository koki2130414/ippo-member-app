/**
 * デモ用アカウントの固定ID。
 * 自動操作（Claude in Chrome / Playwright）が毎回同じ相手を指せるよう、seed のたびに変わらない値にする（仕様 10.7）。
 * ID に名前を含めない（data-testid や URL に個人を示す文字列が出ないようにするため。仕様 10.8）。
 */
export const DEMO_IDS = {
  /** 見学モード用。人物ではなく「見学用」の共用の入口（server/guest.ts、README の「見学モード」） */
  guest: "u-guest-0001",
  admin: "u-admin-0001",
  coach: "u-coach-0001",
  coach2: "u-coach-0002",
  student: "u-student-0001",
  student2: "u-student-0002",
  student3: "u-student-0003",
  guardian: "u-guardian-0001",
} as const;

export function isGuestUserId(userId: string): boolean {
  return userId === DEMO_IDS.guest;
}
