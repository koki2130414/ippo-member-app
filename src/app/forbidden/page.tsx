import { forbidden } from "next/navigation";

// 静的に書き出すとステータスが 200 になるので、毎回サーバーで描画して 403 を返す
export const dynamic = "force-dynamic";

/** /forbidden を直接開いたときも、同じ 403 の画面にする */
export default function ForbiddenPage() {
  forbidden();
}
