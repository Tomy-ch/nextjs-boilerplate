import { describe, expect, it } from "vitest";

import { REFERENCE_PATCHES } from "./references";
import type { DrawFromEndpoint } from "./stable-responses";

const CATEGORIES = [
  { id: "category-1", name: "分類 1" },
  { id: "category-2", name: "分類 2" },
  { id: "category-3", name: "分類 3" },
];

const STATUSES = [
  { id: "status-1", name: "状態 1" },
  { id: "status-2", name: "状態 2" },
];

/** マスタの口を引く相手。実物と同じく、名前で応答を返す。 */
const draw: DrawFromEndpoint = (name) => {
  if (name === "getGetProductCategoriesResponseMock") {
    return CATEGORIES;
  }

  if (name === "getGetProductStatusesResponseMock") {
    return STATUSES;
  }

  throw new Error(`知らない口です: ${name}`);
};

/** 契約から生成した商品 1 件のうち、参照の項目だけを持つ形。 */
function product(id: string) {
  return {
    id,
    name: "商品",
    category: { id: "生成された分類の識別子", name: "生成された分類" },
    status: { id: "生成された状態の識別子", name: "生成された状態" },
  };
}

/** 表から 1 件の差し替えを引く。宣言が消えていれば落ちる。 */
function patchOf(name: string) {
  const patch = REFERENCE_PATCHES.get(name);

  if (patch === undefined) {
    throw new Error(`表に宣言がありません: ${name}`);
  }

  return patch;
}

describe("REFERENCE_PATCHES", () => {
  // ----- 正常系 -----
  it("商品 1 件の分類と状態を、マスタの一覧に在るものへ揃える", () => {
    const patched = patchOf("getGetProductsDetailResponseMock")(product("p1"), draw) as {
      category: { id: string };
      status: { id: string };
    };

    expect(CATEGORIES.map((entry) => entry.id)).toContain(patched.category.id);
    expect(STATUSES.map((entry) => entry.id)).toContain(patched.status.id);
  });

  it("参照の項目以外はそのまま残す", () => {
    const patched = patchOf("getGetProductsDetailResponseMock")(product("p1"), draw) as {
      id: string;
      name: string;
    };

    expect(patched).toMatchObject({ id: "p1", name: "商品" });
  });

  it("同じ商品には同じ分類を選ぶ", () => {
    const patch = patchOf("getGetProductsDetailResponseMock");

    expect(patch(product("p1"), draw)).toEqual(patch(product("p1"), draw));
  });

  it("一覧の応答は商品ごとに揃える", () => {
    const patched = patchOf("getGetProductsResponseMock")(
      { products: [product("p1"), product("p2")], nextCursor: "next" },
      draw,
    ) as { products: readonly { category: { id: string } }[]; nextCursor: string };

    for (const entry of patched.products) {
      expect(CATEGORIES.map((category) => category.id)).toContain(entry.category.id);
    }

    expect(patched.nextCursor).toBe("next");
  });

  it("在庫僅少の一覧も商品ごとに揃える", () => {
    const patched = patchOf("getGetProductsLowStockResponseMock")(
      { products: [product("p1"), product("p2")] },
      draw,
    ) as { products: readonly { status: { id: string } }[] };

    for (const entry of patched.products) {
      expect(STATUSES.map((status) => status.id)).toContain(entry.status.id);
    }
  });

  it("書き込みの応答も同じ形で揃える", () => {
    for (const name of [
      "getPostProductsResponseMock",
      "getPatchProductsDetailResponseMock",
      "getPatchProductsStockResponseMock",
    ]) {
      const patched = patchOf(name)(product("p1"), draw) as { category: { id: string } };

      expect(CATEGORIES.map((category) => category.id)).toContain(patched.category.id);
    }
  });

  // ----- 異常系 -----
  it("マスタの応答が一覧でなければ落ちる", () => {
    const patch = patchOf("getGetProductsDetailResponseMock");

    expect(() => patch(product("p1"), () => ({ unexpected: true }))).toThrow("一覧ではありません");
  });

  it("マスタの一覧が空なら落ちる", () => {
    const patch = patchOf("getGetProductsDetailResponseMock");

    expect(() => patch(product("p1"), () => [])).toThrow("空です");
  });

  it("商品の応答が object でなければ落ちる", () => {
    expect(() => patchOf("getGetProductsDetailResponseMock")(null, draw)).toThrow(
      "object ではありません",
    );
  });

  it("参照の項目が契約から消えていれば落ちる", () => {
    expect(() =>
      patchOf("getGetProductsDetailResponseMock")({ id: "p1", name: "商品" }, draw),
    ).toThrow("分類または状態を持ちません");
  });

  it("一覧の応答が object でなければ落ちる", () => {
    expect(() => patchOf("getGetProductsResponseMock")(null, draw)).toThrow(
      "object ではありません",
    );
  });

  it("一覧の応答が商品の配列を持たなければ落ちる", () => {
    expect(() => patchOf("getGetProductsResponseMock")({ nextCursor: null }, draw)).toThrow(
      "配列を持ちません",
    );
  });
});
