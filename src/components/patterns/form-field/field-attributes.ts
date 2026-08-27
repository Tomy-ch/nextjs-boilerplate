import { toDescriptionId } from "@/components/design-system/form/field/field.definition";

// 入力欄そのものへ与える a11y 属性の組み立て。

/** 入力欄そのものへ与える属性を組むために要る、項目の状態。 */
export type FieldControlState = {
  /** 入力欄の `id`。 */
  readonly controlId: string;
  /** 誤りの文言の `id`。 */
  readonly errorId: string;
  /** 誤りの文言。無ければ誤っていない。 */
  readonly message?: string;
  /**
   * 入力の補足。
   *
   * @remarks
   * 描画する側と指す側は別なので、**両方が同じ値を見る**必要があります。`FormField` が自分の
   * `description` をそのままここへ渡すので、片方だけに渡る状態は作れません。
   */
  readonly description?: string;
  /** 空欄を受け付けない項目か。 */
  readonly required: boolean;
};

/** 入力欄そのものへ与える属性。 */
export type FieldControlAttributes = {
  readonly "aria-describedby": string | undefined;
  readonly "aria-invalid": boolean;
  readonly "aria-required": boolean;
  readonly id: string;
};

/**
 * 入力欄へ与える a11y 属性を組む。
 *
 * @remarks
 * **何を与えるかをここが 1 か所で決めます。** 呼ぶのは `FormField` だけで、結果は children へ
 * 渡ります（渡す形にした理由は `FormField` の `children` が持ちます）。
 *
 * 誤りが無いときも `aria-invalid` を落とさず `false` で置きます。属性ごと消すと、支援技術に
 * とっては「一度も検証していない」と区別が付きません。
 *
 * 補足と誤りの両方があるときは、**描画される順**（補足 → 誤り）で並べます。読み上げの順が
 * 目で追う順と食い違うと、同じ項目の説明が 2 度に分かれて聞こえます。
 */
export function fieldControlAttributes({
  controlId,
  description,
  errorId,
  message,
  required,
}: FieldControlState): FieldControlAttributes {
  const describedBy = [
    description === undefined ? undefined : toDescriptionId(controlId),
    message === undefined ? undefined : errorId,
  ].filter((id): id is string => id !== undefined);

  return {
    "aria-describedby": describedBy.length === 0 ? undefined : describedBy.join(" "),
    "aria-invalid": message !== undefined,
    "aria-required": required,
    id: controlId,
  };
}
