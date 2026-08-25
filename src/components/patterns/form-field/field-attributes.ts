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
   * **`FormField` へ渡すなら、ここへも渡します。** 描画する側と指す側が別なので、片方だけに
   * 渡すと「見えているのに読み上げられない」補足になります。
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
 * これを呼ぶのは [`FormField`](./README.md) だけで、結果は children へ渡ります。**何を与えるかを
 * ここが 1 か所で決める**ので、項目の種類が増えても付け忘れが起きません。呼び出し元に組ませて
 * いた頃は、外枠だけを使って属性を通さない画面が書けました。
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
