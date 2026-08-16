import { describe, expect, it } from "vitest";

import { readProductId, readQuantity } from "./parse-cart-form";

/** 送信された内容を組み立てる。 */
function formOf(entries: Readonly<Record<string, string | Blob>>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.append(key, value);
  }

  return formData;
}

describe("readProductId", () => {
  // ----- 正常系 -----
  it("商品を指す値を取り出す", () => {
    expect(readProductId(formOf({ productId: "p-1" }))).toBe("p-1");
  });

  // ----- 異常系 -----
  it("項目が無いとき null を返す", () => {
    expect(readProductId(formOf({}))).toBeNull();
  });

  it("空文字のとき null を返す", () => {
    expect(readProductId(formOf({ productId: "" }))).toBeNull();
  });

  it("文字列でない値のとき null を返す", () => {
    expect(readProductId(formOf({ productId: new Blob(["p-1"]) }))).toBeNull();
  });
});

describe("readQuantity", () => {
  // ----- 正常系 -----
  it("数量を整数として取り出す", () => {
    expect(readQuantity(formOf({ quantity: "3" }))).toBe(3);
  });

  it("契約の範囲外でも整数なら取り出す（受け付ける範囲はバックエンドが決める）", () => {
    expect(readQuantity(formOf({ quantity: "999" }))).toBe(999);
  });

  // ----- 異常系 -----
  it("整数として読めないとき null を返す", () => {
    expect(readQuantity(formOf({ quantity: "いくつか" }))).toBeNull();
  });

  it("小数のとき null を返す", () => {
    expect(readQuantity(formOf({ quantity: "1.5" }))).toBeNull();
  });
});
