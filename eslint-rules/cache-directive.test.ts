import { describe, expect, it } from "vitest";

import { isServerCacheDirective } from "./cache-directive";

describe("isServerCacheDirective", () => {
  // ----- 正常系 -----
  it("素の `use cache` を、サーバへ保存される宣言として読む", () => {
    expect(isServerCacheDirective("use cache")).toBe(true);
  });

  it("profile を伴う宣言も、private でなければサーバへ保存される", () => {
    expect(isServerCacheDirective("use cache: remote")).toBe(true);
    expect(isServerCacheDirective("use cache:remote")).toBe(true);
  });

  // ----- 異常系 -----
  it("`use cache: private` はサーバへ保存されない", () => {
    expect(isServerCacheDirective("use cache: private")).toBe(false);
  });

  it("キャッシュの宣言でない文字列を、宣言として読まない", () => {
    expect(isServerCacheDirective("use client")).toBe(false);
    expect(isServerCacheDirective("use server")).toBe(false);
    expect(isServerCacheDirective("use cache だから速い")).toBe(false);
  });
});
