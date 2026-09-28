import { describe, expect, it } from "vitest";

import { isTest } from "./test-file";

describe("isTest", () => {
  // ----- 正常系 -----
  it("`.test` を持つ TypeScript と JavaScript の各拡張子をテストとして読む", () => {
    for (const extension of ["ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs"]) {
      expect(isTest(`src/features/cart/view.test.${extension}`)).toBe(true);
    }
  });

  it("絶対パスで渡されたファイルもテストとして読む", () => {
    expect(isTest("/repo/src/adapters/server/api/users.test.ts")).toBe(true);
  });

  // ----- 異常系 -----
  it("`.test` を持たないファイルはテストとして読まない", () => {
    expect(isTest("src/features/cart/view.tsx")).toBe(false);
    expect(isTest("src/features/cart/view.stories.tsx")).toBe(false);
  });

  it("名前の途中に `.test` を含むだけのファイルはテストとして読まない", () => {
    expect(isTest("src/lib/view.test.helper.ts")).toBe(false);
  });
});
