// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { toProductId } from "@/model/product/product";

import { emptyProductValues, productValuesOf, useProductValues } from "./use-product-values";

const PRODUCT = {
  id: toProductId("0195f0c2-0000-7000-8000-000000000001"),
  name: "ワイヤレスイヤホン",
  description: "<p>説明</p>",
  price: "19.99",
  quantity: 12,
  stockWarningThreshold: 3,
  status: { id: "status-1", name: "在庫あり" },
  category: { id: "category-1", name: "電子機器" },
  publishedAt: new Date("2026-08-07T09:00:00.000Z"),
  imagePaths: [],
  version: 4,
};

function renderValues(initial = emptyProductValues(), withQuantity = true) {
  return renderHook(() => useProductValues(initial, { withQuantity }));
}

describe("emptyProductValues", () => {
  // ----- 正常系 -----
  it("すべての項目を空欄から始める", () => {
    expect(Object.values(emptyProductValues()).every((value) => value === "")).toBe(true);
  });
});

describe("productValuesOf", () => {
  // ----- 正常系 -----
  it("読み込んだ商品を入力欄の値へ写す", () => {
    expect(productValuesOf(PRODUCT)).toMatchObject({
      name: "ワイヤレスイヤホン",
      price: "19.99",
      quantity: "12",
      stockWarningThreshold: "3",
      categoryId: "category-1",
      statusId: "status-1",
      description: "<p>説明</p>",
    });
  });

  it("持っていない閾値を空欄として写す", () => {
    expect(productValuesOf({ ...PRODUCT, stockWarningThreshold: null }).stockWarningThreshold).toBe(
      "",
    );
  });

  it("未公開を空欄として写す", () => {
    expect(productValuesOf({ ...PRODUCT, publishedAt: null }).publishedAt).toBe("");
  });

  it("説明を持たない商品を空欄として写す", () => {
    expect(productValuesOf({ ...PRODUCT, description: null }).description).toBe("");
  });

  it("保存された瞬間を、読む人の時差の壁時計へ写す", () => {
    // 書式だけを見ると、符号の取り違えや二重補正でも通る。実行時の時差は Asia/Tokyo に
    // 固定してあるので（`vitest.config.ts`）、09:00Z は 18:00 として出るはずである。
    expect(productValuesOf(PRODUCT).publishedAt).toBe("2026-08-07T18:00");
  });
});

describe("useProductValues", () => {
  // ----- 正常系 -----
  it("書き換えた値を覚える", () => {
    const { result } = renderValues();

    act(() => result.current.setValue("name", "新しい名前"));

    expect(result.current.values.name).toBe("新しい名前");
  });

  it("触れていない項目の誤りは出さない", () => {
    const { result } = renderValues();

    expect(result.current.errors.name).toBeUndefined();
  });

  it("触れた項目の誤りだけを出す", () => {
    const { result } = renderValues();

    act(() => result.current.touch("name"));

    expect(result.current.errors.name).toEqual(["商品名を入力してください。"]);
    expect(result.current.errors.price).toBeUndefined();
  });

  it("直せば誤りは消える", () => {
    const { result } = renderValues();

    act(() => result.current.touch("name"));
    act(() => result.current.setValue("name", "入れた"));

    expect(result.current.errors.name).toBeUndefined();
  });

  it("開いた時点の値から変わっていなければ書きかけではない", () => {
    const { result } = renderValues(productValuesOf(PRODUCT));

    expect(result.current.dirty).toBe(false);
  });

  it("1 項目でも変われば書きかけになる", () => {
    const { result } = renderValues(productValuesOf(PRODUCT));

    act(() => result.current.setValue("name", "別の名前"));

    expect(result.current.dirty).toBe(true);
  });

  // ----- 異常系 -----
  it("必須が埋まっていない段からは進ませない", () => {
    const { result } = renderValues();

    expect(result.current.isSectionBlocked("basics")).toBe(true);
  });

  it("埋まれば進ませる", () => {
    const { result } = renderValues(productValuesOf(PRODUCT));

    expect(result.current.isSectionBlocked("basics")).toBe(false);
    expect(result.current.isSectionBlocked("publish")).toBe(false);
  });

  it("判定を持つ項目が無い段は止めない", () => {
    const { result } = renderValues();

    expect(result.current.isSectionBlocked("description")).toBe(false);
    expect(result.current.isSectionBlocked("images")).toBe(false);
  });

  it("在庫数を尋ねない画面では、空欄でも基本情報を止めない", () => {
    const values = { ...productValuesOf(PRODUCT), quantity: "" };
    const { result } = renderValues(values, false);

    expect(result.current.isSectionBlocked("basics")).toBe(false);
  });
});
