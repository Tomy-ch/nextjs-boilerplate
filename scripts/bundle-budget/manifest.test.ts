import { describe, expect, it } from "vitest";

import { artifactDirOf, initialChunks, unionByRoute } from "./manifest";

describe("initialChunks", () => {
  // ----- 正常系 -----
  it("route 固有の chunk と共有 chunk を畳んで返す", () => {
    const chunks = initialChunks(
      { clientModules: { "a.tsx": { chunks: ["/_next/static/chunks/a.js"] } } },
      { rootMainFiles: ["static/chunks/main.js"], polyfillFiles: ["static/chunks/poly.js"] },
    );

    expect(chunks).toEqual([
      "static/chunks/a.js",
      "static/chunks/main.js",
      "static/chunks/poly.js",
    ]);
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
    expect(artifactDirOf("/(shop)/products/page")).toBe("server/app/(shop)/products/page");
  });
});

describe("unionByRoute", () => {
  // ----- 正常系 -----
  it("同じ公開 route を指す entry の chunk を和集合にする", () => {
    expect(
      unionByRoute([
        { route: "/admin", chunks: ["a.js", "shared.js"] },
        { route: "/admin", chunks: ["breadcrumb.js", "shared.js"] },
      ]),
    ).toEqual([{ route: "/admin", chunks: ["a.js", "shared.js", "breadcrumb.js"] }]);
  });

  it("公開 route が違えば畳まない", () => {
    expect(
      unionByRoute([
        { route: "/admin", chunks: ["a.js"] },
        { route: "/admin/users", chunks: ["b.js"] },
      ]),
    ).toEqual([
      { route: "/admin", chunks: ["a.js"] },
      { route: "/admin/users", chunks: ["b.js"] },
    ]);
  });

  it("最初に現れた順で返す", () => {
    expect(
      unionByRoute([
        { route: "/b", chunks: [] },
        { route: "/a", chunks: [] },
        { route: "/b", chunks: ["x.js"] },
      ]).map((entry) => entry.route),
    ).toEqual(["/b", "/a"]);
  });

  // ----- 異常系 -----
  it("entry が 1 つも無ければ空を返す", () => {
    expect(unionByRoute([])).toEqual([]);
  });
});
