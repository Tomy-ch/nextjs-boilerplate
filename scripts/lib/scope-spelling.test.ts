import { describe, expect, it } from "vitest";

import { findUnspelledScopes, formatUnspelledScopes } from "./scope-spelling";

const SPELLED = {
  path: "src/adapters/server/api/users.ts",
  content: 'createHttpClient({ scope: "user-scoped", baseUrl });',
};

const CONSTANT = {
  path: "src/adapters/server/api/cart.ts",
  content: "createHttpClient({ scope: DATA_SCOPE.userScoped, baseUrl });",
};

describe("findUnspelledScopes", () => {
  // ----- 正常系 -----
  it("綴りのまま宣言した口を挙げない", () => {
    expect(findUnspelledScopes([SPELLED])).toEqual([]);
  });

  it("口を作らないモジュールを挙げない", () => {
    expect(
      findUnspelledScopes([{ path: "src/model/session.ts", content: "export type Session = {};" }]),
    ).toEqual([]);
  });

  it("public の綴りも読む", () => {
    expect(
      findUnspelledScopes([
        { path: "src/adapters/server/api/prefectures.ts", content: 'createHttpClient({ scope: "public" });' },
      ]),
    ).toEqual([]);
  });

  // ----- 異常系 -----
  it("分類を定数へ寄せた口を挙げる", () => {
    expect(findUnspelledScopes([SPELLED, CONSTANT])).toEqual([CONSTANT]);
  });

  it("分類を宣言していない口を挙げる", () => {
    const missing = { path: "src/adapters/server/api/new.ts", content: "createHttpClient({ baseUrl });" };

    expect(findUnspelledScopes([missing])).toEqual([missing]);
  });
});

describe("formatUnspelledScopes", () => {
  // ----- 正常系 -----
  it("違反が無ければ空文字を返す", () => {
    expect(formatUnspelledScopes([])).toBe("");
  });

  // ----- 異常系 -----
  it("違反したモジュールの path と直し方を並べる", () => {
    const formatted = formatUnspelledScopes([CONSTANT]);

    expect(formatted).toContain(CONSTANT.path);
    expect(formatted).toContain('scope: "user-scoped"');
  });
});
