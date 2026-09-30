import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** IPPO のロゴ（運営から受け取った画像を切り出したもの: public/brand）。代替テキストで「IPPO」と読ませる */
export function BrandLogo({ href = "/", className, full = false, priority = false }: { href?: string; className?: string; full?: boolean; priority?: boolean }) {
  return (
    <Link href={href} className={cn("inline-block", className)} data-testid="brand-logo">
      {full ? (
        <Image src="/brand/ippo-logo-full.png" alt="IPPO オンラインサッカー塾" width={785} height={412} priority={priority} className="h-auto w-full" />
      ) : (
        <Image src="/brand/ippo-logo.png" alt="IPPO" width={784} height={237} priority={priority} className="h-full w-auto" />
      )}
    </Link>
  );
}
