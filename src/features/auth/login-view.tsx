import { Button } from "@/components/design-system/action/button/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/design-system/display/card/card";

/** `LoginView` の props。 */
export type LoginViewProps = {
  /**
   * 認証後に戻る先。
   *
   * @remarks
   * 検証済みの相対パスであること。この画面は受け取った値をそのまま送り出すだけで、
   * 妥当性は判断しません。
   */
  returnUrl: string;
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
 */
export function LoginView({ returnUrl }: LoginViewProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>ログイン</CardTitle>
          <CardDescription>
            操作を続けるには認証が必要です。認証が完了すると、元の操作に戻ります。
          </CardDescription>
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
