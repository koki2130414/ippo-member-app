import Link from "next/link";
import type { EntitlementMessage } from "@/domain/plans";
import { Card } from "./ui/card";

/** 「使えない」ときに、理由と次の一歩を必ずいっしょに出す（仕様 2章） */
export function EntitlementNotice({ message, testId }: { message: EntitlementMessage; testId: string }) {
  return (
    <Card data-testid={testId} className="bg-muted">
      <p className="font-semibold">{message.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{message.nextStep}</p>
      {message.href ? (
        <Link href={message.href} className="mt-3 inline-block text-sm font-semibold text-primary underline" data-testid={`${testId}-link`}>
          プランを見る
        </Link>
      ) : null}
    </Card>
  );
}
