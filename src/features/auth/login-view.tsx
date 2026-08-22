import { Button } from "@/components/design-system/action/button/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/design-system/display/card/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/design-system/status/alert/alert";
import type { SafeReturnUrl } from "@/model/return-url";

import { LOGIN_NOTICE, type LoginNotice } from "./facade/paths";

/**
 * 理由ごとの案内。
 *
 * @remarks
 * 理由を鍵にした表で持ちます。**理由が増えたときに文言が無いことを型が咎める**ためで、
 * 分岐を並べると、文言の無い理由が無言で素通りします。
 */
const NOTICE_TEXT = {
  [LOGIN_NOTICE.UNAVAILABLE]: {
    title: "認証を始められませんでした",
    description: "認証基盤へ接続できませんでした。しばらく待ってから、もう一度お試しください。",
  },
} as const satisfies Readonly<Record<LoginNotice, { title: string; description: string }>>;

/** `LoginView` の props。 */
export type LoginViewProps = {
  /**
   * 認証後に戻る先。
   *
   * @remarks
   * この画面は受け取った値をそのまま送り出すだけで、妥当性は判断しません。検証済みで
   * あることは型が示します（`toSafeReturnUrl`）。
   */
  returnUrl: SafeReturnUrl;
  /**
   * この画面へ戻された理由。無ければ null。
   *
   * @remarks
   * 判断済みの分類だけを受け取ります。URL に載っていた文字列をそのまま渡すと、この画面が
   * 検証の場所になります（検証は route segment が持ちます）。
   */
  notice: LoginNotice | null;
};

/**
 * ログイン画面。
 *
 * @remarks
 * 資格情報の入力欄を持ちません。ID とパスワードを受け取るのは IdP の画面であり、この画面が
 * 持つのは「認証を始める」操作だけです（[0079](../../../docs/adr/0079-auth-frontend-seam.md) §6）。
 * ここに入力欄を置くと、資格情報がこのアプリを通ることになります。
 *
 * リンクではなく form にしてあります。認証の開始は状態を作る操作（一時状態の cookie を置く）で
 * あり、リンクにすると prefetch や先読みで**利用者が押していないのに始まります**。同じ理由で
 * `next/link` も使いません。
 *
 * 始められなかったときの案内を操作の手前へ置きます。押した結果として戻されているので、押す前に
 * 読む位置に無いと、同じ操作をもう一度押すまで理由が目に入りません。
 */
export function LoginView({ returnUrl, notice }: LoginViewProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>ログイン</CardTitle>
          <CardDescription>
            操作を続けるには認証が必要です。認証が完了すると、元の操作に戻ります。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notice === null ? null : (
            <Alert variant="destructive">
              <AlertTitle>{NOTICE_TEXT[notice].title}</AlertTitle>
              <AlertDescription>
                <p>{NOTICE_TEXT[notice].description}</p>
              </AlertDescription>
            </Alert>
          )}
          <form action="/api/auth/login" method="get">
            <input type="hidden" name="returnUrl" value={returnUrl} />
            <Button type="submit" className="w-full">
              ログインへ進む
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
