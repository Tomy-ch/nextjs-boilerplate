import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/design-system/status/alert/alert";

import { ADMIN_ANALYTICS_PATH } from "../../../paths";
import { PERIOD_KEY } from "../../period";

/** `AnalyticsInvalidQuery` の props。 */
export type AnalyticsInvalidQueryProps = {
  /** 表示する文言。境界で正規化済みのものを渡す。 */
  message: string;
  /** 契約を外れた条件のキー。 */
  invalidKeys: readonly string[];
};

/** 条件のキーを画面上の呼び名へ直す。表に無いキーはそのまま出す。 */
const KEY_LABEL: Readonly<Record<string, string>> = {
  [PERIOD_KEY.PERIOD]: "期間の区分",
  [PERIOD_KEY.FROM]: "開始日",
  [PERIOD_KEY.TO]: "終了日",
};

/**
 * URL の期間が契約を外れているときの表示。
 *
 * @remarks
 * 集計の代わりに出します。読めない期間を既定へ戻して今日の集計を出すと、指定したつもりの
 * 期間とは違う数を、違うと判らないまま読むことになります。
 *
 * 直せる導線を必ず添えます。期間は URL に入っており、画面の操作だけでは戻せない状態になり得る
 * ためです（[0080](../../../../../../docs/adr/0080-error-handling.md)）。
 */
export function AnalyticsInvalidQuery({ message, invalidKeys }: AnalyticsInvalidQueryProps) {
  const labels = invalidKeys.map((key) => KEY_LABEL[key] ?? key);

  return (
    <Alert variant="destructive">
      <AlertTitle>この期間では集計を表示できません</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{message}</p>
        {labels.length === 0 ? null : <p>確認する条件: {labels.join("、")}</p>}
        <Button asChild size="sm" variant="outline">
          <Link href={ADMIN_ANALYTICS_PATH}>期間を外して見る</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
