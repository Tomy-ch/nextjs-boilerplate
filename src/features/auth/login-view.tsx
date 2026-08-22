import { Button } from "@/components/design-system/action/button/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/design-system/display/card/card";
import type { SafeReturnUrl } from "@/model/return-url";

/**
 * 画面の説明。
 *
 * @remarks
 * JSX の本文へ直に書くと、行の折り返しがそのまま半角空白として描画されます。和文では語の
 * 途中に空白が入って見えるため、結合した 1 つの文字列を渡します。
 */
const DESCRIPTION = [
  "操作を続けるには認証が必要です。",
  "認証はこのアプリの外にある認証基盤で行い、済むと元の操作に戻ります。",
  "この画面ではアカウントを作らず、初めての方も認証を済ませてから登録へ進みます。",
].join("");

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
};

/**
 * ログイン画面。
 *
 * @remarks
 * 資格情報の入力欄を持ちません。ID とパスワードを受け取るのは IdP の画面であり、この画面が
 * 持つのは「認証を始める」操作だけです（[0079](../../../docs/adr/0079-auth-frontend-seam.md) §6）。
 * ここに入力欄を置くと、資格情報がこのアプリを通ることになります。
 *
 * **どこへ渡るのかと、ここで何が起きないのかを説明に書きます。** 押した先が別の見た目の画面に
 * なることも、この画面がアカウントを作らないことも、押す前でなければ意味がありません。どの IdP を
 * 繋いでも真である範囲だけを書き、名前や環境ごとの案内は入れません。
 *
 * リンクではなく form にしてあります。認証の開始は状態を作る操作（一時状態の cookie を置く）で
 * あり、リンクにすると prefetch や先読みで**利用者が押していないのに始まります**。同じ理由で
 * `next/link` も使いません。
 */
export function LoginView({ returnUrl }: LoginViewProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>ログイン</CardTitle>
          <CardDescription>{DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent>
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
