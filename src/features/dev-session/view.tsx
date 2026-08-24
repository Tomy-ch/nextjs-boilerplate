import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/design-system/display/card/card";
import type { Session } from "@/model/session";
import { withScreenSpan } from "@/observability/render-span";
import type { DiscardDevSessionAction, IssueDevSessionAction } from "./form-state";
import { CurrentSession } from "./ui/current-session/current-session";
import { type AuthorizationHandoff, DevSessionForm } from "./ui/session-form/session-form";

/** `DevSessionView` の props。 */
export type DevSessionViewProps = {
  /** いま持っている session。持っていなければ null。 */
  session: Session | null;
  /** 発行したあとの戻り先。 */
  returnUrl: string;
  /**
   * 認可の往復からの引き渡し。直接開いたときは null。
   *
   * @remarks
   * 入っていれば、発行の指定は認可 endpoint へ送られます。この画面は中身を読まず、
   * 受け取ったものをそのまま発行の指定へ渡すだけです。
   */
  authorization: AuthorizationHandoff | null;
  /** 発行の送信先。 */
  issueAction: IssueDevSessionAction;
  /** 破棄の送信先。 */
  discardAction: DiscardDevSessionAction;
  /** 実物の API へ繋いでいるか。トークンを取りに行くかの既定になる。 */
  connectsLiveApi: boolean;
  /** 設定が指している IdP。接続先の初期値になる。 */
  defaultIssuer: string;
};

/**
 * 開発用 session の発行画面。
 *
 * @remarks
 * いまの状態を先に置き、発行の指定を後に置きます。**開いた人がまず知りたいのは「いま誰として
 * 入っているか」**で、それが判ってから入り直すかどうかを決めるためです。
 *
 * 送信先を自分で決めません。理由は [`form-state.ts`](./form-state.ts) が持ちます。
 */
export const DevSessionView = withScreenSpan(
  "features/dev-session/view",
  ({
    session,
    returnUrl,
    authorization,
    issueAction,
    discardAction,
    connectsLiveApi,
    defaultIssuer,
  }: DevSessionViewProps) => {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>いまの session</CardTitle>
          </CardHeader>
          <CardContent>
            <CurrentSession action={discardAction} session={session} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>session を発行する</CardTitle>
          </CardHeader>
          <CardContent>
            <DevSessionForm
              action={issueAction}
              authorization={authorization}
              connectsLiveApi={connectsLiveApi}
              defaultIssuer={defaultIssuer}
              returnUrl={returnUrl}
            />
          </CardContent>
        </Card>
      </div>
    );
  },
);
