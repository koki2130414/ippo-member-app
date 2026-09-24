import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn/ui の定番。Tailwind のクラスの衝突（p-2 と p-4 など）を後勝ちで解決する */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
