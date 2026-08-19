import type { ProfileFieldProps } from "./use-profile-fields";

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
 * `FormField` は children を受け取る形で入力欄そのものへ触れないため、属性を与えるのは項目の
 * 部品です。**何を与えるかはここが決めます。** 部品ごとに書き写すと、項目の種類が増えたときに
 * `aria-invalid` や `aria-describedby` の付け忘れが起きます。
 *
 * 誤りが無いときも `aria-invalid` を落とさず `false` で置きます。属性ごと消すと、支援技術に
 * とっては「一度も検証していない」と区別が付きません。
 */
export function fieldControlAttributes({
  controlId,
  errorId,
  message,
  required,
}: Pick<
  ProfileFieldProps,
  "controlId" | "errorId" | "message" | "required"
>): FieldControlAttributes {
  return {
    "aria-describedby": message === undefined ? undefined : errorId,
    "aria-invalid": message !== undefined,
    "aria-required": required,
    id: controlId,
  };
}
