import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Migration } from "./setup";

/** db/migrations の SQL を名前順に読む（ビルド時のスクリプトとテストで使う。アプリの実行時には読まない） */
export function loadMigrations(directory = join(process.cwd(), "db", "migrations")): Migration[] {
  return readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(directory, name), "utf8") }));
}
