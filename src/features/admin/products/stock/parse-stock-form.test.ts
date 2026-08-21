import { describe, expect, it } from "vitest";

import { STOCK_FORM_NAMES } from "./form-names";
import { STOCK_QUANTITY_INVALID_MESSAGE, STOCK_TARGET_LOST_MESSAGE } from "./form-state";
import { parseStockForm } from "./parse-stock-form";
import { STOCK_DIRECTION } from "./stock-direction";

const PRODUCT_ID = "0195f0c2-0000-7000-8000-000000000001";

function formData(
  overrides: Partial<Record<keyof typeof STOCK_FORM_NAMES, string | null>> = {},
): FormData {
  const values = {
    productId: PRODUCT_ID,
    direction: STOCK_DIRECTION.REPLENISH,
    quantity: "50",
    ...overrides,
  };
  const data = new FormData();

  for (const [key, value] of Object.entries(values)) {
    if (value !== null) data.append(STOCK_FORM_NAMES[key as keyof typeof STOCK_FORM_NAMES], value);
  }

  return data;
}

describe("parseStockForm", () => {
  // ----- 正常系 -----
  it("補充は正の増減量として読む", () => {
    expect(parseStockForm(formData())).toEqual({ ok: true, productId: PRODUCT_ID, delta: 50 });
  });

  it("差し引きは負の増減量として読む", () => {
    expect(parseStockForm(formData({ direction: STOCK_DIRECTION.DEDUCT }))).toEqual({
      ok: true,
      productId: PRODUCT_ID,
      delta: -50,
    });
  });

  // ----- 異常系 -----
  it("対象が届かなければ、入力の誤りではなく画面を開き直す案内を返す", () => {
    expect(parseStockForm(formData({ productId: null }))).toEqual({
      ok: false,
      formError: STOCK_TARGET_LOST_MESSAGE,
    });
  });

  it("対象が空文字なら同じく開き直す案内を返す", () => {
    expect(parseStockForm(formData({ productId: "" }))).toEqual({
      ok: false,
      formError: STOCK_TARGET_LOST_MESSAGE,
    });
  });

  it("向きが読めない値なら、既定へ倒さず退ける", () => {
    expect(parseStockForm(formData({ direction: "increase" }))).toEqual({
      ok: false,
      formError: STOCK_TARGET_LOST_MESSAGE,
    });
  });

  it("量が読めなければ、その欄あての文言だけを返す", () => {
    expect(parseStockForm(formData({ quantity: "0" }))).toEqual({
      ok: false,
      formError: null,
      fieldErrors: { quantity: [STOCK_QUANTITY_INVALID_MESSAGE] },
    });
  });

  it("量そのものが届かなければ、同じくその欄あての文言を返す", () => {
    expect(parseStockForm(formData({ quantity: null }))).toEqual({
      ok: false,
      formError: null,
      fieldErrors: { quantity: [STOCK_QUANTITY_INVALID_MESSAGE] },
    });
  });
});
