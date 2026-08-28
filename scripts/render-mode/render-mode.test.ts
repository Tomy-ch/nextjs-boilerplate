import { describe, expect, it } from "vitest";

import {
  allowsBlocking,
  findRenderModeDrift,
  formatRenderModeDrift,
  formatRenderModeSummary,
  type RenderMode,
  renderModes,
} from "./render-mode";

const NONE: string[] = [];

function modes(entries: Record<string, RenderMode>): Map<string, RenderMode> {
  return new Map(Object.entries(entries));
}

function declarations(entries: Record<string, boolean>): Map<string, boolean> {
  return new Map(Object.entries(entries));
}

describe("renderModes", () => {
  // ----- 正常系 -----
  it("固めた route を静的として読む", () => {
    expect(renderModes({ routes: { "/about": { compute: "static" } } }).get("/about")).toBe(
      "static",
    );
  });

  it("殻だけ配る route を部分として読む", () => {
    expect(renderModes({ routes: { "/cart": { compute: "resuming" } } }).get("/cart")).toBe(
      "partial",
    );
  });

  it("動的セグメントを持つ route も同じ表から読む", () => {
    expect(
      renderModes({ dynamicRoutes: { "/products/[id]": { compute: "resuming" } } }).get(
        "/products/[id]",
      ),
    ).toBe("partial");
  });

  it("成果物が空でも落ちない", () => {
    expect(renderModes({}).size).toBe(0);
  });

  // ----- 異常系 -----
  it("殻を配らない route をブロッキングとして読む", () => {
    expect(renderModes({ routes: { "/admin": { compute: "blocking" } } }).get("/admin")).toBe(
      "blocking",
    );
  });

  it("知らない綴りをブロッキング側へ倒す", () => {
    // 通す側へ倒すと、Next.js が値を増やした日にゲートが黙る。
    expect(renderModes({ routes: { "/x": { compute: "未知" } } }).get("/x")).toBe("blocking");
    expect(renderModes({ routes: { "/y": {} } }).get("/y")).toBe("blocking");
  });
});

describe("allowsBlocking", () => {
  // ----- 正常系 -----
  it("ブロッキングを許す宣言を読む", () => {
    expect(allowsBlocking("export const instant = false;\n")).toBe(true);
  });

  // ----- 異常系 -----
  it("宣言を持たない内容を許可と読まない", () => {
    expect(allowsBlocking("export default function Page() {}\n")).toBe(false);
  });

  it("行の中に埋もれた綴りを宣言と読まない", () => {
    expect(allowsBlocking("// export const instant = false を検討する\n")).toBe(false);
  });

  it("真を宣言している route を許可と読まない", () => {
    expect(allowsBlocking("export const instant = true;\n")).toBe(false);
  });
});

describe("findRenderModeDrift", () => {
  // ----- 正常系 -----
  it("宣言なしで殻を配れている route を通す", () => {
    expect(
      findRenderModeDrift(modes({ "/cart": "partial" }), declarations({ "/cart": false }), NONE),
    ).toEqual([]);
  });

  it("宣言のとおりブロックしている route を通す", () => {
    expect(
      findRenderModeDrift(modes({ "/admin": "blocking" }), declarations({ "/admin": true }), NONE),
    ).toEqual([]);
  });

  it("除外した route を見ない", () => {
    expect(
      findRenderModeDrift(modes({ "/_not-found": "blocking" }), declarations({}), ["/_not-found"]),
    ).toEqual([]);
  });

  it("画面を持たない route を見ない", () => {
    // route handler は成果物には並ぶが、描くモードの宣言を置く先が無い。
    expect(
      findRenderModeDrift(modes({ "/api/products": "blocking" }), declarations({}), NONE),
    ).toEqual([]);
  });

  // ----- 異常系 -----
  it("宣言なしにブロックしている route を挙げる", () => {
    expect(
      findRenderModeDrift(
        modes({ "/mypage": "blocking" }),
        declarations({ "/mypage": false }),
        NONE,
      ),
    ).toEqual([{ route: "/mypage", reason: "undeclared-blocking" }]);
  });

  it("宣言したのに殻を配れている route を挙げる", () => {
    expect(
      findRenderModeDrift(modes({ "/login": "static" }), declarations({ "/login": true }), NONE),
    ).toEqual([{ route: "/login", reason: "declared-but-prerendered" }]);
  });

  it("route の綴りの順に並べる", () => {
    const drift = findRenderModeDrift(
      modes({ "/b": "blocking", "/a": "blocking" }),
      declarations({ "/a": false, "/b": false }),
      NONE,
    );

    expect(drift.map(({ route }) => route)).toEqual(["/a", "/b"]);
  });
});

describe("formatRenderModeDrift", () => {
  // ----- 正常系 -----
  it("違反が無ければ空文字を返す", () => {
    expect(formatRenderModeDrift([])).toBe("");
  });

  it("ブロックした route には殻の落とし方を添える", () => {
    const formatted = formatRenderModeDrift([{ route: "/mypage", reason: "undeclared-blocking" }]);

    expect(formatted).toContain("/mypage");
    expect(formatted).toContain("Suspense");
  });

  it("余った宣言には外す指示を添える", () => {
    const formatted = formatRenderModeDrift([
      { route: "/login", reason: "declared-but-prerendered" },
    ]);

    expect(formatted).toContain("/login");
    expect(formatted).toContain("外して");
  });
});

describe("formatRenderModeSummary", () => {
  // ----- 正常系 -----
  it("扱いごとの枚数を内訳として並べる", () => {
    const observed = new Map<string, RenderMode>([
      ["/about", "static"],
      ["/", "partial"],
      ["/products", "partial"],
      ["/admin", "blocking"],
    ]);

    const summary = formatRenderModeSummary(["/about", "/", "/products", "/admin"], observed, []);

    expect(summary).toContain("4 枚");
    expect(summary).toContain("○ 静的 1");
    expect(summary).toContain("◐ 部分 2");
    expect(summary).toContain("ƒ 動的 1");
  });

  it("突合の対象外にした route は内訳に数えない", () => {
    const observed = new Map<string, RenderMode>([
      ["/about", "static"],
      ["/dev/session", "blocking"],
    ]);

    const summary = formatRenderModeSummary(["/about", "/dev/session"], observed, ["/dev/session"]);

    expect(summary).toContain("○ 静的 1");
    expect(summary).not.toContain("ƒ 動的");
  });

  // ----- 異常系 -----
  it("成果物に扱いの無い route は内訳から落とす", () => {
    const summary = formatRenderModeSummary(["/ghost"], new Map<string, RenderMode>(), []);

    expect(summary).toContain("1 枚");
    expect(summary).not.toContain("○");
  });
});
