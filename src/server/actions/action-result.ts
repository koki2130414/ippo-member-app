import "server-only";
import { ZodError } from "zod";
import { logger } from "../logger";
import { ServiceError } from "../services/errors";

/**
 * Server Action の戻り値。例外をそのまま投げると、本番では中身の分からないエラー画面になり
 * 子どもが次に何をすればいいか分からない。そこで「画面に出してよい文」に変えて返す。
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

export async function runAction<T>(name: string, work: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await work() };
  } catch (error) {
    if (error instanceof ServiceError) return { ok: false, message: error.userMessage };
    if (error instanceof ZodError) {
      return { ok: false, message: error.issues[0]?.message ?? "入力をたしかめて、もう一度ためしてください" };
    }
    // 想定外のエラー。中身（個人情報を含むかもしれない）はログにも出さず、種類だけ残す
    logger.error("Server Action で想定外のエラー", { action: name, errorType: error instanceof Error ? error.name : typeof error });
    return { ok: false, message: "うまくいきませんでした。少し時間をおいて、もう一度ためしてください" };
  }
}
