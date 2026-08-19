/** 入力欄そのものへ与える属性を組むために要る、項目の状態。 */
export type FieldControlState = {
  /** 入力欄の `id`。 */
  readonly controlId: string;
  /** 誤りの文言の `id`。 */
  readonly errorId: string;
  /** 誤りの文言。無ければ誤っていない。 */
  readonly message?: string;
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
 * [`FormField`](./README.md) は children を受け取る形で入力欄そのものへ触れないため、属性を
 * 与えるのは項目の部品です。**何を与えるかはここが決めます。** 部品ごとに書き写すと、項目の
 * 種類が増えたときに `aria-invalid` や `aria-describedby` の付け忘れが起き、画面が増えるほど
 * 写しの数だけ食い違います。
 *
 * 誤りが無いときも `aria-invalid` を落とさず `false` で置きます。属性ごと消すと、支援技術に
 * とっては「一度も検証していない」と区別が付きません。
 */
export function fieldControlAttributes({
  controlId,
  errorId,
  message,
  required,
}: FieldControlState): FieldControlAttributes {
  return {
    "aria-describedby": message === undefined ? undefined : errorId,
    "aria-invalid": message !== undefined,
    "aria-required": required,
    id: controlId,
  };
}
