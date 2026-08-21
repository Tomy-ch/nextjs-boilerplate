/**
 * 誤りの文言に与える `id`。入力欄の `aria-describedby` が指す。
 *
 * @remarks
 * `errorId` を受け取る側（{@link fieldControlAttributes}）と対になる規約なので、隣に置きます。
 * 項目の部品の側に住むと、接尾の綴りを変えたい人がその部品を開くことになり、同じ規約を使う
 * 他の部品への波及が import を辿らないと見えません。
 */
export function toErrorId(controlId: string): string {
  return `${controlId}-error`;
}

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
