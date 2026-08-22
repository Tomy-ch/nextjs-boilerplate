import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
} from "@/components/design-system/display/card/card";
import {
  KeyValueItem,
  KeyValueLabel,
  KeyValueList,
  KeyValueValue,
} from "@/components/design-system/display/key-value-list/key-value-list";
import { Separator } from "@/components/design-system/display/separator/separator";
import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";

/** 待機表示が出すカードの数。出来上がりの段組みと同じ枚数を同時に出す。 */
export const PLACEHOLDER_CARDS = 2;

/** プロフィールのカードに並べる項目数。[`../profile-card/`](../profile-card/profile-card.tsx) と同じ。 */
export const PLACEHOLDER_ROWS = 4;

/**
 * 購入サマリの表に置く行数。
 *
 * @remarks
 * ステータスの数は取得しないと分かりません。**同梱サンプルの契約が返す段数**を置いてあり、
 * ここだけは出来上がりと一致しない可能性が残ります。
 */
export const PLACEHOLDER_SUMMARY_ROWS = 4;

/** 下端の操作の並びに置く枠の数。[`../action-row/`](../action-row/action-row.tsx) と同じ。 */
export const PLACEHOLDER_ACTIONS = 3;

const ROWS = Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => index);

const SUMMARY_ROWS = Array.from({ length: PLACEHOLDER_SUMMARY_ROWS }, (_, index) => index);

const ACTIONS = Array.from({ length: PLACEHOLDER_ACTIONS }, (_, index) => index);

/**
 * マイページの待機表示。
 *
 * @remarks
 * **出来上がりと同じ器（`Card` / `KeyValueList` / `Separator`）で組みます。**寸法を写した数値を
 * 置くと、カードの側が変わったときに黙ってずれます。器を共有していれば、余白と段組みは同じ
 * 定義から来ます。
 *
 * 1 枚ずつ現れる形にすると、読み始めた位置が後から来たカードに押し下げられます。
 *
 * **下端の操作は、枠だけを置いて中身を置きません。**退会は戻せない操作なので、読み込み中に
 * 押せる位置へ現れてはいけません。一方、高さを空けておかないと、届いた瞬間に footer が
 * 押し下げられます（[0101](../../../../../../docs/adr/0101-performance-budget.md) §4）。
 */
export function MypageSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-8">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <CardAction>
              <Skeleton className="h-8 w-20" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <KeyValueList>
              {ROWS.map((row) => (
                <KeyValueItem key={row}>
                  <KeyValueLabel>
                    <Skeleton className="h-4 w-24" />
                  </KeyValueLabel>
                  <KeyValueValue>
                    <Skeleton className="h-4 w-full" />
                  </KeyValueValue>
                </KeyValueItem>
              ))}
            </KeyValueList>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <CardAction>
              <Skeleton className="h-8 w-20" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {SUMMARY_ROWS.map((row) => (
                <Skeleton className="h-6 w-full" key={row} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Separator />
      <div className="flex flex-col divide-y divide-border sm:grid sm:max-w-2xl sm:grid-cols-3 sm:gap-3 sm:divide-y-0">
        {ACTIONS.map((action) => (
          <div className="py-3 sm:py-0" key={action}>
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
