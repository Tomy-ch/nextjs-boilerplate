import { Badge } from "../../display/badge/badge";
import { BADGE_VARIANT } from "../../display/badge/badge.definition";

/** {@link RequirementBadge} の props。 */
export type RequirementBadgeProps = {
  /** 空欄を受け付けない項目か。 */
  required: boolean;
};

/**
 * 入力項目が必須か任意かを示す印。
 *
 * @remarks
 * **視覚のためだけの印であり、読み上げからは外す**（`aria-hidden`）。必須であることは control 側の
 * `aria-required` が伝えるため、印まで読ませると「姓、必須、required」のように二重になる。
 * `aria-required` を付けるのは呼び出し元である。
 *
 * `label` の中へ入れない。入れると項目の名前が「姓必須」に変わり、`getByLabelText("姓")` のような
 * 名前での取得も一致しなくなる。`label` の隣へ並べる。
 *
 * **塗りつぶさない。** 塗ると誤りの表示と同じ強さになり、何も間違えていない画面に赤い塊が項目の
 * 数だけ並ぶ。誤りは文言と枠の色が示すので、印はそこまで強い必要がない。
 *
 * 任意の側にも印を出す。印の有無で読み分けさせると、印が無いのが「任意」なのか「印を付け忘れた」
 * のかを利用者が区別できない。どちらの文言も 2 文字なので、`label` の前に置けば印の列と label の
 * 開始位置が同時に揃う。
 *
 * @example
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <RequirementBadge required />
 *   <FieldLabel htmlFor="last-name">姓</FieldLabel>
 * </div>
 * ```
 *
 * @param props.required - 空欄を受け付けない項目か。
 * @see Storybook `Form/RequirementBadge`
 */
export function RequirementBadge({ required }: RequirementBadgeProps) {
  return required ? (
    <Badge
      aria-hidden="true"
      className="border-destructive/40 bg-destructive/10 text-destructive"
      variant={BADGE_VARIANT.OUTLINE}
    >
      必須
    </Badge>
  ) : (
    <Badge aria-hidden="true" className="text-muted-foreground" variant={BADGE_VARIANT.OUTLINE}>
      任意
    </Badge>
  );
}
