import type { ProductFormField } from "./form-state";

/**
 * 入力欄の `name`。
 *
 * @remarks
 * **送る側と読む側が同じ綴りを見るための 1 か所です。**入力欄を組む部品と、送られてきた内容を
 * 読む Server Action の両方が引きます。どちらかに書き写すと、綴りを直した側だけが届かなくなり、
 * 「送ったのに空で届く」形の失敗になります。
 *
 * 版と時差は項目ではありませんが、同じ form で運ぶため並べます。
 */
export const PRODUCT_FORM_NAMES = {
  name: "name",
  description: "description",
  price: "price",
  quantity: "quantity",
  stockWarningThreshold: "stockWarningThreshold",
  categoryId: "categoryId",
  statusId: "statusId",
  publishedAt: "publishedAt",
  images: "images",
  version: "version",
  timezoneOffset: "timezoneOffset",
} as const satisfies Readonly<Record<ProductFormField | "version" | "timezoneOffset", string>>;
