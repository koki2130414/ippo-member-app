import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main data-page="not-found" data-state="ready" className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">ページが見つかりませんでした</h1>
      <p className="text-muted-foreground">URL が変わったか、なくなったのかもしれません。一覧からえらびなおしてみてください。</p>
      <Link href="/home" className={buttonVariants()}>ホームにもどる</Link>
    </main>
  );
}
