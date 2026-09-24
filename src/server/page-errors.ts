import "server-only";
import { forbidden, notFound, redirect } from "next/navigation";
import { ServiceError } from "./services/errors";

/**
 * サービス層のエラーを、画面の HTTP ステータスに変える。
 * not_found → 404、forbidden → 403、未ログイン → /login。それ以外はそのまま投げる（error 画面へ）。
 */
export async function loadForPage<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ServiceError) {
      if (error.code === "not_found") notFound();
      if (error.code === "forbidden") forbidden();
      if (error.code === "unauthenticated") redirect("/login");
    }
    throw error;
  }
}
