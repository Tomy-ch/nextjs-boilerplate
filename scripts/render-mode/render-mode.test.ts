import { describe, expect, it } from "vitest";

import {
  declaredStaticRoutes,
  findRenderModeDrift,
  formatRenderModeDrift,
  type Page,
} from "./render-mode";

function pages(...entries: readonly [string, string][]): Page[] {
  return entries.map(([route, content]) => ({ route, content }));
}

const STATIC_PAGE = 'export const dynamic = "force-static";\n\nexport default function Page() {}\n';
const PLAIN_PAGE = "export default function Page() {}\n";

describe("declaredStaticRoutes", () => {
  // ----- 正常系 -----
  it("固めると宣言した route を挙げる", () => {
    expect(declaredStaticRoutes(pages(["/terms", STATIC_PAGE], ["/", PLAIN_PAGE]))).toEqual([
      "/terms",
    ]);
  });

  it("単引用符の宣言も読む", () => {
    expect(
      declaredStaticRoutes(pages(["/terms", "export const dynamic = 'force-static';\n"])),
    ).toEqual(["/terms"]);
  });

  // ----- 異常系 -----
  it("別のモードの宣言は挙げない", () => {
    expect(declaredStaticRoutes(pages(["/", 'export const dynamic = "force-dynamic";\n']))).toEqual(
      [],
    );
  });

  it("文中に綴りがあるだけでは挙げない", () => {
    expect(
      declaredStaticRoutes(pages(["/", "// force-static にはしない\nexport default 1;\n"])),
    ).toEqual([]);
  });
});

describe("findRenderModeDrift", () => {
  // ----- 正常系 -----
  it("宣言と実態が揃っていれば空を返す", () => {
    expect(findRenderModeDrift(["/terms"], pages(["/terms", STATIC_PAGE]), [])).toEqual([]);
  });

  it("固まっていない route に宣言が無くてよい", () => {
    expect(findRenderModeDrift([], pages(["/", PLAIN_PAGE]), [])).toEqual([]);
  });

  it("framework の route は突合しない", () => {
    expect(findRenderModeDrift(["/_not-found"], pages(["/", PLAIN_PAGE]), ["/_not-found"])).toEqual(
      [],
    );
  });

  it("route の順に並べて返す", () => {
    const drift = findRenderModeDrift(
      ["/b", "/a"],
      pages(["/a", PLAIN_PAGE], ["/b", PLAIN_PAGE]),
      [],
    );

    expect(drift.map(({ route }) => route)).toEqual(["/a", "/b"]);
  });

  // ----- 異常系 -----
  it("宣言せずに固まった route を undeclared-static として挙げる", () => {
    expect(findRenderModeDrift(["/about"], pages(["/about", PLAIN_PAGE]), [])).toEqual([
      { route: "/about", reason: "undeclared-static" },
    ]);
  });

  it("宣言したのに動的な route を declared-but-dynamic として挙げる", () => {
    expect(findRenderModeDrift([], pages(["/terms", STATIC_PAGE]), [])).toEqual([
      { route: "/terms", reason: "declared-but-dynamic" },
    ]);
  });

  it("page が消えた route が固まっていれば挙げる", () => {
    expect(findRenderModeDrift(["/ghost"], pages(["/", PLAIN_PAGE]), [])).toEqual([
      { route: "/ghost", reason: "undeclared-static" },
    ]);
  });
});

describe("formatRenderModeDrift", () => {
  // ----- 正常系 -----
  it("食い違いの向きごとに直し方を書き分ける", () => {
    const text = formatRenderModeDrift([
      { route: "/about", reason: "undeclared-static" },
      { route: "/terms", reason: "declared-but-dynamic" },
    ]);

    expect(text).toContain("/about: build 時に固まっています");
    expect(text).toContain("/terms: `force-static` を宣言していますが動的に描かれています");
  });

  // ----- 異常系 -----
  it("食い違いが無ければ空文字を返す", () => {
    expect(formatRenderModeDrift([])).toBe("");
  });
});
