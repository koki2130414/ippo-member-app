/**
 * ログ出力。機密情報をログに出さないため、console を直接呼ばずにここを通す（仕様 5章）。
 *
 * 渡された context のうち、名前から機密と分かるキーは値を伏せる。
 * キー名での判定は完全ではないので、「そもそも本文・本名・メール・トークンを context に入れない」のが原則。
 * これは入れてしまったときの保険。
 */

const SENSITIVE_KEY_PATTERN = /(password|token|secret|key|email|fullname|full_name|name|body|comment|reply|playback|storage|signed|cookie|authorization)/i;

type LogContext = Record<string, unknown>;

export function redact(context: LogContext): LogContext {
  const result: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      result[key] = "[redacted]";
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[key] = redact(Object.fromEntries(Object.entries(value)));
    } else {
      result[key] = value;
    }
  }
  return result;
}

function write(level: "warn" | "error", message: string, context?: LogContext): void {
  const payload = context ? ` ${JSON.stringify(redact(context))}` : "";
  if (level === "warn") console.warn(`[ippo] ${message}${payload}`);
  else console.error(`[ippo] ${message}${payload}`);
}

export const logger = {
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};
