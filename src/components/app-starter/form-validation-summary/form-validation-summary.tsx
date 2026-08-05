import { Alert, AlertDescription, AlertTitle } from "@/components/design-system/status/alert/alert";

/** 要約に並べる、field 単位の検証エラー。 */
export type FormValidationError = {
  /** 対応する入力欄の `id`。要約からの link 先になる。 */
  fieldId: string;
  /** 利用者向けのエラー文言。 */
  message: string;
};

/** {@link FormValidationSummary} の props。 */
export type FormValidationSummaryProps = {
  /** 表示する検証エラー。空なら何も描画しない。 */
  errors: readonly FormValidationError[];
  /** 要約の見出し。 */
  title?: string;
  /** 送信後に focus を移す場合の対象。呼び出し元が参照する。 */
  id?: string;
};

/**
 * form 全体の検証エラーを要約し、各入力欄への link を並べる SSR first の feedback。
 *
 * @remarks
 * 項目数の多い form では、field 単位のエラーだけでは submit 後にどこを直すか辿れない。この部品は
 * 「どこが」「いくつ」誤っているかを一箇所に集め、`fieldId` への link で該当欄へ飛ばす。
 * 個々の欄に出す文言は `FieldError` が担い、この要約は置き換えない。両方を出す。
 *
 * 送信結果そのものの要約（成功・失敗・request ID）は `FormFeedback` が担う。この部品は
 * 検証エラーだけを扱い、成功時は描画しない。
 *
 * `Alert` を通すため `role="alert"` を持つ。submit 後にこの要約が現れると支援技術へ読み上げられる。
 * **focus の移動は持たない。** Server Component で描画されるため、`id` を受け取って呼び出し元
 * （client 境界）が移す。要約自体は `tabIndex` を持たないので、focus させたい場合は呼び出し元が
 * 付与する。
 *
 * 検証規則、エラーの分類、文言への変換は持たない。feature が利用者に意味の通る文言へ変換して渡す。
 *
 * @example
 * ```tsx
 * <FormValidationSummary
 *   errors={[{ fieldId: "email", message: "メールアドレスの形式が正しくありません" }]}
 *   id="form-errors"
 * />
 * ```
 *
 * @param props.errors - 表示する検証エラー。空なら何も描画しない。
 * @param props.title - 要約の見出し。
 * @param props.id - 呼び出し元が focus を移す際に参照する識別子。
 *
 * @see Storybook `Feedback/FormValidationSummary`
 */
export function FormValidationSummary({
  errors,
  id,
  title = "入力内容を確認してください",
}: FormValidationSummaryProps) {
  if (errors.length === 0) return null;

  return (
    <Alert data-slot="form-validation-summary" id={id} variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <ul className="flex list-disc flex-col gap-1 ps-5">
          {errors.map((error) => (
            <li key={error.fieldId}>
              <a className="underline underline-offset-4" href={`#${error.fieldId}`}>
                {error.message}
              </a>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
