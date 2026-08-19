import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/design-system/status/alert/alert";

/** `InvalidQueryFeedback` の props。 */
export type InvalidQueryFeedbackProps = {
  /** 何を出せないのかを述べる題。画面ごとに違う。 */
  title: string;
  /** 表示する文言。境界で正規化済みのものを渡す。 */
  message: string;
  /** 契約を外れた条件のキー。 */
  invalidKeys: readonly string[];
  /** キーを画面上の呼び名へ直す表。表に無いキーはそのまま出す。 */
  keyLabels: Readonly<Record<string, string>>;
  /** 条件を外した先。 */
  resetHref: string;
  /** 条件を外す操作の文言。 */
  resetLabel: string;
};

/**
 * URL の条件が契約を外れているときの表示。
 *
 * @remarks
 * **本体の代わりに出します。** 範囲外の条件を捨てて既定の結果を出すと、絞り込んだつもりの利用者が
 * 絞り込まれていない結果を、指定したつもりの期間とは違う数を、それと判らないまま読みます。
 *
 * **直せる導線を必ず添えます。** 条件は URL に入っており、画面の操作だけでは戻せない状態になり得る
 * ためです（[0080](../../../../docs/adr/0080-error-handling.md)）。
 *
 * **キーの呼び名も、どこへ戻すかも持ちません。** どのキーが何を指すかは URL の契約を持つ画面が
 * 知っています。ここが持つのは、表に無いキーをそのまま出すという**落とし方**だけです —— 呼び名を
 * 書き写した表が各画面にあると、契約にキーが増えたとき生の名前が出る画面と出ない画面に割れます。
 *
 * @see Storybook `Feedback/InvalidQueryFeedback`
 */
export function InvalidQueryFeedback({
  title,
  message,
  invalidKeys,
  keyLabels,
  resetHref,
  resetLabel,
}: InvalidQueryFeedbackProps) {
  const labels = invalidKeys.map((key) => keyLabels[key] ?? key);

  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{message}</p>
        {labels.length === 0 ? null : <p>確認する条件: {labels.join("、")}</p>}
        <Button asChild size="sm" variant="outline">
          <Link href={resetHref}>{resetLabel}</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
