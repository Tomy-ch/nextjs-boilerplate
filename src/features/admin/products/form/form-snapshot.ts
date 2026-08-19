import { PRODUCT_FORM_NAMES } from "./parse-product-form";
import type { ProductSelectOption } from "./ui/select-field/select-field";

/** 送信直前の内容を、確認のために読み取ったもの。 */
export type ProductFormSnapshot = Readonly<Record<string, string>>;

/**
 * form に今入っている値を読む。
 *
 * @remarks
 * 入力欄を 1 つずつ state に持つ代わりに、form そのものから読みます。**送信されるのは form の
 * 内容そのもの**なので、確認に出す値と送る値が食い違いません。写しを別に持つと、写し忘れた欄が
 * 確認に現れないまま送られます。
 *
 * 画像は複数の欄で運ぶため、ここでは扱いません。並びを持つ値は呼び出し元が自分の一覧から出します。
 */
export function readProductFormSnapshot(form: HTMLFormElement): ProductFormSnapshot {
  const data = new FormData(form);
  const snapshot: Record<string, string> = {};

  for (const [key, value] of data.entries()) {
    if (typeof value === "string" && key !== PRODUCT_FORM_NAMES.images) {
      snapshot[key] = value;
    }
  }

  return snapshot;
}

/**
 * 識別子で選ばれた候補を、表示する文言へ直す。
 *
 * @remarks
 * 送るのは識別子ですが、確認で見せるのは人が読める名前です。選ばれていなければ何も返しません。
 */
export function toOptionLabel(
  options: readonly ProductSelectOption[],
  value: string | undefined,
): string | undefined {
  return options.find((option) => option.value === value)?.label;
}
