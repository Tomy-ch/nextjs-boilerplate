import { describe, expect, it } from "vitest";

import {
  validateCategoryId,
  validateName,
  validatePrice,
  validatePublishedAt,
  validateQuantity,
  validateStatusId,
  validateStockWarningThreshold,
} from "./product-rules";

describe("validateName", () => {
  // ----- 正常系 -----
  it("入っていれば通す", () => {
    expect(validateName("ワイヤレスイヤホン")).toBeUndefined();
  });

  // ----- 異常系 -----
  it("空欄を断る", () => {
    expect(validateName("")).toBe("商品名を入力してください。");
  });

  it("空白だけの入力を空欄として断る", () => {
    expect(validateName("   ")).toBe("商品名を入力してください。");
  });

  it("上限を超えた長さを断る", () => {
    expect(validateName("あ".repeat(256))).toBe("商品名は 255 文字までです。");
  });

  it("上限ちょうどは通す", () => {
    expect(validateName("あ".repeat(255))).toBeUndefined();
  });

  it("前後の空白は長さに数えない", () => {
    expect(validateName(` ${"あ".repeat(255)} `)).toBeUndefined();
  });
});

describe("validatePrice", () => {
  // ----- 正常系 -----
  it("小数を含む十進を通す", () => {
    expect(validatePrice("19.99")).toBeUndefined();
  });

  it("整数を通す", () => {
    expect(validatePrice("20")).toBeUndefined();
  });

  // ----- 異常系 -----
  it("空欄を断る", () => {
    expect(validatePrice("")).toBe("価格を入力してください。");
  });

  it("数として読めない入力を断る", () => {
    expect(validatePrice("abc")).toBe("価格は 0 以上の数値で入力してください。");
  });

  it("負の値を断る", () => {
    expect(validatePrice("-1")).toBe("価格は 0 以上の数値で入力してください。");
  });
});

describe("validateQuantity", () => {
  // ----- 正常系 -----
  it("0 以上の整数を通す", () => {
    expect(validateQuantity("0")).toBeUndefined();
  });

  // ----- 異常系 -----
  it("空欄を断る", () => {
    expect(validateQuantity("")).toBe("在庫数を入力してください。");
  });

  it("整数でない入力を断る", () => {
    expect(validateQuantity("1.5")).toBe("在庫数は 0 以上の整数で入力してください。");
  });

  it("負の値を断る", () => {
    expect(validateQuantity("-1")).toBe("在庫数は 0 以上の整数で入力してください。");
  });
});

describe("validateStockWarningThreshold", () => {
  // ----- 正常系 -----
  it("空欄を許す", () => {
    expect(validateStockWarningThreshold("")).toBeUndefined();
  });

  it("0 以上の整数を通す", () => {
    expect(validateStockWarningThreshold("3")).toBeUndefined();
  });

  // ----- 異常系 -----
  it("整数でない入力を断る", () => {
    expect(validateStockWarningThreshold("2.5")).toBe(
      "在庫警告の閾値は 0 以上の整数で入力してください。",
    );
  });
});

describe("validateCategoryId", () => {
  // ----- 正常系 -----
  it("選ばれていれば通す", () => {
    expect(validateCategoryId("01936f6d-0000-7000-8000-000000000001")).toBeUndefined();
  });

  // ----- 異常系 -----
  it("選ばれていなければ断る", () => {
    expect(validateCategoryId("")).toBe("分類を選んでください。");
  });
});

describe("validateStatusId", () => {
  // ----- 正常系 -----
  it("選ばれていれば通す", () => {
    expect(validateStatusId("01936f6d-0000-7000-8000-000000000101")).toBeUndefined();
  });

  // ----- 異常系 -----
  it("選ばれていなければ断る", () => {
    expect(validateStatusId("")).toBe("状態を選んでください。");
  });
});

describe("validatePublishedAt", () => {
  // ----- 正常系 -----
  it("空欄を許す", () => {
    expect(validatePublishedAt("")).toBeUndefined();
  });

  it("日付として読める入力を通す", () => {
    expect(validatePublishedAt("2026-08-07T09:00")).toBeUndefined();
  });

  // ----- 異常系 -----
  it("日付として読めない入力を断る", () => {
    expect(validatePublishedAt("いつか")).toBe("公開日時を日付として読み取れませんでした。");
  });
});
