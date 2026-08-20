import { describe, expect, it } from "vitest";

import { toValidationErrors } from "./validation-summary";

describe("toValidationErrors", () => {
  // ----- 正常系 -----
  it("項目の呼び名を添えて要約の 1 件へ写す", () => {
    expect(toValidationErrors({ name: ["商品名を入力してください。"] }, "form")).toEqual([
      { fieldId: "form-name", message: "商品名: 商品名を入力してください。" },
    ]);
  });

  it("宛先の id に、入力欄と同じ前置きを使う", () => {
    const [error] = toValidationErrors({ statusId: ["状態を選んでください。"] }, ":r1:");

    expect(error?.fieldId).toBe(":r1:-status");
  });

  it("入力欄が並ぶ順で出す。直しに行く順序を画面の並びと揃えるため", () => {
    const errors = toValidationErrors(
      { publishedAt: ["読み取れません。"], name: ["入力してください。"] },
      "form",
    );

    expect(errors.map((error) => error.fieldId)).toEqual(["form-name", "form-published-at"]);
  });

  it("同じ項目に複数あっても先頭の 1 件だけを出す", () => {
    const errors = toValidationErrors({ name: ["ひとつ目。", "ふたつ目。"] }, "form");

    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain("ひとつ目。");
  });

  // ----- 異常系 -----
  it("誤りが無ければ何も並べない", () => {
    expect(toValidationErrors({}, "form")).toEqual([]);
  });

  it("項目ごとの誤りそのものが無ければ何も並べない", () => {
    expect(toValidationErrors(undefined, "form")).toEqual([]);
  });
});
