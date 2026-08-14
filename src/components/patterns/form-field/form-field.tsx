import type { ReactNode } from "react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "../../design-system/form/field/field";
import { RequirementBadge } from "../../design-system/form/requirement-badge/requirement-badge";

/** {@link FormField} の props。 */
export type FormFieldProps = {
  /** 入力欄。`id` に `controlId`、誤りがあるとき `aria-describedby` に `errorId` を与える。 */
  children: ReactNode;
  /** 入力欄の `id`。label の `htmlFor` が指す。 */
  controlId: string;
  /** 誤りの文言の `id`。入力欄の `aria-describedby` が指す。 */
  errorId: string;
  /** 項目の名前。 */
  label: string;
  /** 誤りの文言。無ければ誤りは描画しない。 */
  message?: string;
  /** 入力の補足。誤りとは別に常時出す。 */
  description?: string;
  /** 空欄を受け付けない項目か。 */
  required: boolean;
};

/**
 * 項目名・入力欄・補足・誤りを 1 つの組にまとめる外枠。
 *
 * @remarks
 * 入力欄そのものは受け取らず、children として差し込む。text / select / 独自の合成のいずれでも
 * 同じ外枠を使えるようにするためで、入力欄の種類ごとに外枠を作ると、誤りの位置も必須の印の
 * 位置も種類ごとにずれていく。
 *
 * **`id` を生成しない。** 同じフォームを 1 つの文書へ 2 度置いたときに重複するため、生成は
 * `useId()` を持てる呼び出し元が行う。ここは受け取った `id` を label と誤りへ配るだけである。
 *
 * **`aria-invalid` / `aria-describedby` / `aria-required` は入力欄へ付かない。** children を
 * 受け取る形である以上ここからは触れないので、**呼び出し元が入力欄へ与える**。外枠が持つのは
 * `data-invalid` による見た目の切り替えまでである。
 *
 * 検証も、必須かどうかの判定も持たない。どちらも呼び出し元が検証スキーマから導いて渡す。
 *
 * @example
 * ```tsx
 * <FormField controlId={id} errorId={`${id}-error`} label="姓" message={error} required>
 *   <Input aria-describedby={error && `${id}-error`} aria-invalid={error !== undefined}
 *     aria-required id={id} {...register("lastName")} />
 * </FormField>
 * ```
 *
 * @see Storybook `Form/FormField`
 */
export function FormField({
  children,
  controlId,
  description,
  errorId,
  label,
  message,
  required,
}: FormFieldProps) {
  return (
    <Field data-invalid={message !== undefined}>
      <div className="flex items-center gap-2">
        <RequirementBadge required={required} />
        <FieldLabel htmlFor={controlId}>{label}</FieldLabel>
      </div>
      {children}
      {description === undefined ? null : <FieldDescription>{description}</FieldDescription>}
      {message === undefined ? null : <FieldError id={errorId}>{message}</FieldError>}
    </Field>
  );
}
