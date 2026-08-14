import { describe, expect, it } from "vitest";
import { toSafeReturnUrl } from "./return-url";

describe("toSafeReturnUrl", () => {
  // ----- 正常系 -----
  it("同一 origin の相対パスをそのまま通す", () => {
    expect(toSafeReturnUrl("/products/1")).toBe("/products/1");
  });

  it("クエリとフラグメントを保つ", () => {
    expect(toSafeReturnUrl("/products?sort=new#list")).toBe("/products?sort=new#list");
  });

  it("ルートのパスを通す", () => {
    expect(toSafeReturnUrl("/")).toBe("/");
  });

  // ----- 異常系 -----
  it("復帰先が無ければルートへ倒す", () => {
    expect(toSafeReturnUrl(null)).toBe("/");
  });

  it("未指定ならルートへ倒す", () => {
    expect(toSafeReturnUrl(undefined)).toBe("/");
  });

  it("空文字列ならルートへ倒す", () => {
    expect(toSafeReturnUrl("")).toBe("/");
  });

  it("scheme 付きの絶対 URL を落とす", () => {
    expect(toSafeReturnUrl("https://example.com/steal")).toBe("/");
  });

  it("protocol-relative URL を落とす", () => {
    expect(toSafeReturnUrl("//example.com/steal")).toBe("/");
  });

  it("バックスラッシュで始まる protocol-relative URL を落とす", () => {
    expect(toSafeReturnUrl("/\\example.com/steal")).toBe("/");
  });

  it("先頭が / でないパスを落とす", () => {
    expect(toSafeReturnUrl("products/1")).toBe("/");
  });
});
