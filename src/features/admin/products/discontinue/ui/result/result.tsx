import { Alert, AlertDescription, AlertTitle } from "@/components/design-system/status/alert/alert";
import { formatDateTime } from "@/model/datetime";
import { formatNumber } from "@/model/number";
import type { ProductDiscontinueResult } from "@/model/product/product";
import { withPartSpan } from "@/observability/render-span";

/** `DiscontinueResult` の props。 */
export type DiscontinueResultProps = {
  /** 実行の応答。 */
  result: ProductDiscontinueResult;
};

/**
 * 廃番を実行した結果。
 *
 * @remarks
 * **確認の外に置きます。** 確認は成立すると閉じ、その中に出した文言は一緒に消えます。件数は
 * 応答にしか無く取り直せないため、読み込み直すと消えることを添えます。
 *
 * @see Storybook `Features/Admin/Products/Discontinue/Result`
 */
export const DiscontinueResult = withPartSpan(
  "features/admin/products/discontinue/ui/result/result",
  ({ result }: DiscontinueResultProps) => {
    return (
      <Alert>
        <AlertTitle>廃番にしました</AlertTitle>
        <AlertDescription>
          <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-[max-content_minmax(0,1fr)]">
            <dt className="text-muted-foreground">廃番にした日時</dt>
            <dd>{formatDateTime(new Date(result.discontinuedAt))}</dd>
            <dt className="text-muted-foreground">理由が表示されたカート</dt>
            <dd className="tabular-nums">{formatNumber(result.affectedCartCount)} 件</dd>
            <dt className="text-muted-foreground">クーポンを受け取った利用者</dt>
            <dd className="tabular-nums">{formatNumber(result.affectedUserCount)} 人</dd>
            <dt className="text-muted-foreground">発行したクーポン</dt>
            <dd className="tabular-nums">{formatNumber(result.issuedCouponCount)} 枚</dd>
          </dl>
          <p className="mt-2 text-xs">
            件数はこの操作の応答にだけ含まれます。画面を読み込み直すと、廃番にした日時だけが残ります。
          </p>
        </AlertDescription>
      </Alert>
    );
  },
);
