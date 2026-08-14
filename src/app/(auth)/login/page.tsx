import type { Metadata } from "next";

import { LoginView } from "@/features/auth/login-view";
import { toSafeReturnUrl } from "@/model/return-url";

export const metadata: Metadata = {
  title: "ログイン",
  description: "認証を始めます。資格情報の入力は認証基盤の画面で行われます。",
  robots: { index: false, follow: false },
};

/**
 * ログイン。
 *
 * @remarks
 * 復帰先は URL から受け取るため、検索エンジンに拾わせません。同じ画面が復帰先の数だけ
 * 別 URL として索引され、そのどれもが単独では意味を持たないためです。
 *
 * 検証をこの層で行うのは、`searchParams` が外から来る値だからです
 * （`docs/rules.md` #42）。feature へは検証済みの値だけを渡します。
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { returnUrl } = await searchParams;

  return (
    <LoginView returnUrl={toSafeReturnUrl(typeof returnUrl === "string" ? returnUrl : null)} />
  );
}
