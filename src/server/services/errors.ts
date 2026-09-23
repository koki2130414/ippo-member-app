/**
 * サービス層が投げるエラー。
 * userMessage は画面にそのまま出してよい文（何が起きたか＋次にどうすればいいか）。
 * 内部の事情（どの判定で落ちたか、対象のID など）は userMessage に入れない。
 */

export class ServiceError extends Error {
  constructor(
    readonly code: "forbidden" | "not_found" | "invalid" | "conflict" | "unauthenticated",
    readonly userMessage: string,
    /** ログ用。個人情報を入れない */
    readonly internalDetail?: string,
  ) {
    super(internalDetail ?? code);
    this.name = "ServiceError";
  }
}

export function forbidden(internalDetail?: string): ServiceError {
  return new ServiceError("forbidden", "このページは見られません。ホームにもどって、もう一度えらんでください", internalDetail);
}

export function notFound(internalDetail?: string): ServiceError {
  return new ServiceError("not_found", "さがしているものが見つかりませんでした。一覧からえらびなおしてください", internalDetail);
}

export function unauthenticated(): ServiceError {
  return new ServiceError("unauthenticated", "ログインが必要です。ログインしてから、もう一度ためしてください");
}

export function invalid(userMessage: string, internalDetail?: string): ServiceError {
  return new ServiceError("invalid", userMessage, internalDetail);
}

export function conflict(userMessage: string, internalDetail?: string): ServiceError {
  return new ServiceError("conflict", userMessage, internalDetail);
}
