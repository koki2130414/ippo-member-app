import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** forbidden() を呼んだときに出る画面。ステータスは 403 になる */
export default function Forbidden() {
  return (
    <main data-page="forbidden" data-state="ready" className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">このページは見られません</h1>
      <p className="text-muted-foreground">いまのアカウントでは、このページを開けません。ホームにもどって、もう一度えらんでみてください。</p>
      <Link href="/home" className={buttonVariants()} data-testid="forbidden-home">ホームにもどる</Link>
    </main>
  );
}
