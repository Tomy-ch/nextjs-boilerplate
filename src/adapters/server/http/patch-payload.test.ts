import { describe, expect, it } from "vitest";
import { normalizePatchPayload } from "./patch-payload";

type Product = {
  name: string;
  description: string;
  imagePath: string;
};

describe("正常系", () => {
  describe("normalizePatchPayload", () => {
    it("値のあるキーをそのまま残す", () => {
      expect(normalizePatchPayload<Product>({ name: "商品" })).toEqual({ name: "商品" });
    });
    it("消す指示の null を残す", () => {
      expect(normalizePatchPayload<Product>({ imagePath: null })).toEqual({ imagePath: null });
    });
    it("値と消す指示を同時に扱う", () => {
      expect(normalizePatchPayload<Product>({ name: "商品", imagePath: null })).toEqual({
        name: "商品",
        imagePath: null,
      });
    });
    it("空のペイロードを空のまま返す", () => {
      expect(normalizePatchPayload<Product>({})).toEqual({});
    });
  });
});

describe("異常系", () => {
  describe("normalizePatchPayload", () => {
    it("undefined のキーを落とす", () => {
      expect(Object.keys(normalizePatchPayload<Product>({ name: undefined }))).toEqual([]);
    });
    it("undefined を落としても他のキーは残す", () => {
      expect(normalizePatchPayload<Product>({ name: undefined, imagePath: null })).toEqual({
        imagePath: null,
      });
    });
    it("undefined のキーと未指定を同じ結果にする", () => {
      expect(JSON.stringify(normalizePatchPayload<Product>({ description: undefined }))).toBe(
        JSON.stringify(normalizePatchPayload<Product>({})),
      );
    });
  });
});
