import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/design-system/status/alert/alert";

import { FILTER_KEY, PRODUCT_LIST_PATH } from "../../../facade/list-url/list-url";

/** `ProductInvalidQuery` の props。 */
export type ProductInvalidQueryProps = {
  /** 表示する文言。境界で正規化済みのものを渡す。 */
  message: string;
  /** 契約を外れた条件のキー。 */
  invalidKeys: readonly string[];
};

/** 条件のキーを画面上の呼び名へ直す。表に無いキーはそのまま出す。 */
const KEY_LABEL: Readonly<Record<string, string>> = {
  [FILTER_KEY.CATEGORY]: "カテゴリ",
  [FILTER_KEY.STATUS]: "状態",
  [FILTER_KEY.KEYWORD]: "キーワード",
  [FILTER_KEY.SORT]: "並び替え",
  after: "読み込み位置",
  first: "読み込む件数",
};

/**
 * URL の条件が契約を外れているときの表示。
 *
 * @remarks
 * 一覧の代わりに出します。範囲外の条件を捨てて既定の一覧を出すと、絞り込んだつもりの利用者が
 * 絞り込まれていない結果を見ることになります。
 *
 * 直せる導線を必ず添えます。条件は URL に入っており、画面の操作だけでは戻せない状態になり得る
 * ためです（[0080](../../../../../../docs/adr/0080-error-handling.md)）。
 */
export function ProductInvalidQuery({ message, invalidKeys }: ProductInvalidQueryProps) {
  const labels = invalidKeys.map((key) => KEY_LABEL[key] ?? key);

  return (
    <Alert variant="destructive">
      <AlertTitle>この条件では商品を表示できません</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{message}</p>
        {labels.length === 0 ? null : <p>確認する条件: {labels.join("、")}</p>}
        <Button asChild size="sm" variant="outline">
          <Link href={PRODUCT_LIST_PATH}>条件を外して一覧を見る</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
