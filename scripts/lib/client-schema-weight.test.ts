import { describe, expect, it } from "vitest";

import {
  crossesServerBoundary,
  findHeavyClientImports,
  formatHeavyClientImports,
  isClientEntry,
  runtimeSpecifiers,
  type SourceModule,
} from "./client-schema-weight";

/** 相対指定を `.ts` のパスへ解決する。テストの中で辺を明示するためだけのもの。 */
const resolveAsIs = (_from: string, specifier: string) =>
  specifier.startsWith("./") ? `${specifier.slice(2)}.ts` : null;

function modules(...entries: readonly [string, string][]): SourceModule[] {
  return entries.map(([path, content]) => ({ path, content }));
}

describe("isClientEntry", () => {
  // ----- 正常系 -----
  it("先頭の use client を島の入口と見る", () => {
    expect(isClientEntry('"use client";\n')).toBe(true);
  });

  // ----- 異常系 -----
  it("宣言を持たない module は入口ではない", () => {
    expect(isClientEntry("export const a = 1;")).toBe(false);
  });
});

describe("crossesServerBoundary", () => {
  // ----- 正常系 -----
  it("use server を境界と見る", () => {
    expect(crossesServerBoundary('"use server";\n')).toBe(true);
  });

  it("server-only の import も境界と見る", () => {
    expect(crossesServerBoundary('import "server-only";\n')).toBe(true);
  });

  // ----- 異常系 -----
  it("どちらも無ければ境界ではない", () => {
    expect(crossesServerBoundary("export const a = 1;")).toBe(false);
  });
});

describe("runtimeSpecifiers", () => {
  // ----- 正常系 -----
  it("実行時に残る import 先を挙げる", () => {
    expect(runtimeSpecifiers('import { a } from "./a";')).toEqual(["./a"]);
  });

  // ----- 異常系 -----
  it("型だけの import は辺に数えない", () => {
    expect(runtimeSpecifiers('import type { A } from "./a";')).toEqual([]);
  });
});

describe("findHeavyClientImports", () => {
  // ----- 正常系 -----
  it("client から辿り着く module の重い入口を、到達元とともに挙げる", () => {
    const found = findHeavyClientImports(
      modules(
        ["ui.tsx", '"use client";\nimport { a } from "./a";'],
        ["a.ts", 'import { z } from "zod";'],
      ),
      resolveAsIs,
    );

    expect(found).toEqual([{ path: "a.ts", specifier: "zod", from: "ui.tsx" }]);
  });

  it("生成した zod スキーマも重い入口として挙げる", () => {
    const found = findHeavyClientImports(
      modules(["ui.tsx", '"use client";\nimport { m } from "src/adapters/gen/api/endpoints.zod";']),
      resolveAsIs,
    );

    expect(found.map((entry) => entry.specifier)).toEqual(["src/adapters/gen/api/endpoints.zod"]);
  });

  // ----- 異常系 -----
  it("server 境界の先は数えない", () => {
    const found = findHeavyClientImports(
      modules(
        ["ui.tsx", '"use client";\nimport { a } from "./a";'],
        ["a.ts", 'import "server-only";\nimport { z } from "zod";'],
      ),
      resolveAsIs,
    );

    expect(found).toEqual([]);
  });

  it("client から到達しない module は数えない", () => {
    expect(
      findHeavyClientImports(modules(["a.ts", 'import { z } from "zod";']), resolveAsIs),
    ).toEqual([]);
  });

  it("環状の参照でも止まる", () => {
    const found = findHeavyClientImports(
      modules(
        ["ui.ts", '"use client";\nimport { a } from "./a";'],
        ["a.ts", 'import { b } from "./ui";'],
      ),
      resolveAsIs,
    );

    expect(found).toEqual([]);
  });
});

describe("formatHeavyClientImports", () => {
  // ----- 正常系 -----
  it("到達元を添えて 1 件 1 行にする", () => {
    expect(formatHeavyClientImports([{ path: "a.ts", specifier: "zod", from: "ui.tsx" }])).toBe(
      "a.ts: zod（ui.tsx から到達）",
    );
  });

  // ----- 異常系 -----
  it("1 件も無ければ空文字を返す", () => {
    expect(formatHeavyClientImports([])).toBe("");
  });
});
