import { describe, expect, it } from "vitest";

import {
  artifactDirOf,
  entryStylesheets,
  initialChunks,
  sharedChunks,
  statsChunks,
  unionByRoute,
} from "./manifest";

describe("initialChunks", () => {
  // ----- 正常系 -----
  it("route 固有の chunk と共有 chunk を畳んで返す", () => {
    const chunks = initialChunks(
      { clientModules: { "a.tsx": { chunks: ["/_next/static/chunks/a.js"] } } },
      { rootMainFiles: ["static/chunks/main.js"] },
    );

    expect(chunks).toEqual(["static/chunks/a.js", "static/chunks/main.js"]);
  });

  it("対応ブラウザが取得しない polyfill は数えない", () => {
    // 実物の `build-manifest.json` は `polyfillFiles` を持つ。受け取る型が宣言しなくなっても
    // 鍵は届くので、無視することを実物の形で見る。
    const build: Record<string, readonly string[]> = {
      rootMainFiles: ["static/chunks/main.js"],
      polyfillFiles: ["static/chunks/poly.js"],
    };

    expect(initialChunks(undefined, build)).toEqual(["static/chunks/main.js"]);
  });

  it("同じ chunk を複数の module が指しても 1 度だけ数える", () => {
    const chunks = initialChunks(
      {
        clientModules: {
          "a.tsx": { chunks: ["/_next/static/chunks/shared.js"] },
          "b.tsx": { chunks: ["/_next/static/chunks/shared.js"] },
        },
      },
      { rootMainFiles: ["static/chunks/shared.js"] },
    );

    expect(chunks).toEqual(["static/chunks/shared.js"]);
  });

  it("JavaScript でない成果物を落とす", () => {
    const chunks = initialChunks(
      { clientModules: { "a.tsx": { chunks: ["/_next/static/chunks/a.css"] } } },
      { rootMainFiles: ["static/chunks/main.js"] },
    );

    expect(chunks).toEqual(["static/chunks/main.js"]);
  });

  // ----- 異常系 -----
  it("client component を持たない route でも共有 chunk を返す", () => {
    expect(initialChunks(undefined, { rootMainFiles: ["static/chunks/main.js"] })).toEqual([
      "static/chunks/main.js",
    ]);
  });

  it("どちらの manifest も無ければ空を返す", () => {
    expect(initialChunks(undefined, undefined)).toEqual([]);
  });

  it("chunks を持たない module を飛ばす", () => {
    expect(initialChunks({ clientModules: { "a.tsx": {} } }, {})).toEqual([]);
  });
});

describe("artifactDirOf", () => {
  // ----- 正常系 -----
  it("内部 page パスを成果物のディレクトリへ写す", () => {
    expect(artifactDirOf("/page")).toBe("server/app/page");
  });

  it("route group の括弧をそのまま残す", () => {
    expect(artifactDirOf("/(site-info)/reports/page")).toBe("server/app/(site-info)/reports/page");
  });
});

describe("entryStylesheets", () => {
  // ----- 正常系 -----
  it("entry ごとの stylesheet を和集合にする", () => {
    expect(
      entryStylesheets({
        entryCSSFiles: {
          "[project]/src/app/layout": [{ path: "static/chunks/base.css" }],
          "[project]/src/app/admin/page": [
            { path: "static/chunks/base.css" },
            { path: "static/chunks/admin.css" },
          ],
        },
      }),
    ).toEqual(["static/chunks/base.css", "static/chunks/admin.css"]);
  });

  it("`_next` を先頭に持つ綴りを成果物からの相対へ均す", () => {
    expect(
      entryStylesheets({ entryCSSFiles: { a: [{ path: "/_next/static/chunks/a.css" }] } }),
    ).toEqual(["static/chunks/a.css"]);
  });

  it("manifest が無ければ空を返す", () => {
    expect(entryStylesheets(undefined)).toEqual([]);
  });

  it("stylesheet を持たない route では空を返す", () => {
    expect(entryStylesheets({ entryCSSFiles: {} })).toEqual([]);
  });
});

describe("unionByRoute", () => {
  const entry = (
    route: string,
    initial: string[],
    deferred: string[] = [],
    css: string[] = [],
  ) => ({
    route,
    initial,
    deferred,
    css,
  });

  // ----- 正常系 -----
  it("同じ公開 route を指す entry の資材を和集合にする", () => {
    expect(
      unionByRoute([
        entry("/admin", ["a.js", "shared.js"], ["lazy.js"], ["base.css"]),
        entry("/admin", ["breadcrumb.js", "shared.js"], ["lazy.js"], ["admin.css"]),
      ]),
    ).toEqual([
      {
        route: "/admin",
        initial: ["a.js", "shared.js", "breadcrumb.js"],
        deferred: ["lazy.js"],
        css: ["base.css", "admin.css"],
      },
    ]);
  });

  it("別の entry が初期で読むものは遅延から外す", () => {
    expect(
      unionByRoute([entry("/admin", [], ["shared.js"]), entry("/admin", ["shared.js"])]),
    ).toEqual([{ route: "/admin", initial: ["shared.js"], deferred: [], css: [] }]);
  });

  it("公開 route が違えば畳まない", () => {
    expect(unionByRoute([entry("/admin", ["a.js"]), entry("/admin/users", ["b.js"])])).toEqual([
      { route: "/admin", initial: ["a.js"], deferred: [], css: [] },
      { route: "/admin/users", initial: ["b.js"], deferred: [], css: [] },
    ]);
  });

  it("最初に現れた順で返す", () => {
    expect(
      unionByRoute([entry("/b", []), entry("/a", []), entry("/b", ["x.js"])]).map(
        (row) => row.route,
      ),
    ).toEqual(["/b", "/a"]);
  });

  it("entry が 1 つも無ければ空を返す", () => {
    expect(unionByRoute([])).toEqual([]);
  });
});

describe("statsChunks", () => {
  // ----- 正常系 -----
  it("route ごとの初期 JS を、成果物からの相対へ均して返す", () => {
    const chunks = statsChunks([
      { route: "/", firstLoadChunkPaths: [".next/static/chunks/a.js", "static/chunks/b.js"] },
    ]);

    expect(chunks.get("/")).toEqual(["static/chunks/a.js", "static/chunks/b.js"]);
  });

  it("chunk を持たない route も鍵として残す", () => {
    expect(statsChunks([{ route: "/" }]).get("/")).toEqual([]);
  });

  it("読めなかった場合は空を返し、呼び出し側が和集合へ落ちられる", () => {
    expect(statsChunks(undefined).size).toBe(0);
  });
});

describe("sharedChunks", () => {
  const entry = (route: string, initial: string[]) => ({ route, initial, deferred: [], css: [] });

  // ----- 正常系 -----
  it("2 つ以上の route が読む chunk を挙げる", () => {
    expect([
      ...sharedChunks([entry("/a", ["shared.js", "a.js"]), entry("/b", ["shared.js", "b.js"])]),
    ]).toEqual(["shared.js"]);
  });

  it("1 つの route しか読まない chunk は挙げない", () => {
    expect([...sharedChunks([entry("/a", ["a.js"]), entry("/b", ["b.js"])])]).toEqual([]);
  });

  it("route が 1 つしか無ければ、共有は無いものとして扱う", () => {
    expect([...sharedChunks([entry("/a", ["a.js", "b.js"])])]).toEqual([]);
  });

  it("route が 1 つも無ければ空を返す", () => {
    expect([...sharedChunks([])]).toEqual([]);
  });
});
