import type { UserRole } from "../src/domain/types";

/** ロールごとのログイン済み状態の保存先（.gitignore 済み） */
export function storageStatePath(role: UserRole): string {
  return `e2e/.auth/${role}.json`;
}
