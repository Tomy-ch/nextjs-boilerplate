import { describe, expect, it } from "vitest";

import {
  listScreenRoutes,
  resolveScreens,
  SCREENS,
  type Screen,
  type ScreenDeclaration,
  selectScreens,
} from "./screens";

/** build が書き出す対応表と同じ形を組み立てる。 */
function manifest(entries: Record<string, string>): string {
  return JSON.stringify(entries);
}

describe("listScreenRoutes", () => {
  // ----- 正常系 -----
  it("面を持つ route だけを返す", () => {
    const json = manifest({
      "/(alpha)/page": "/",
      "/api/beta/route": "/api/beta",
      "/favicon.ico/route": "/favicon.ico",
    });

    expect(listScreenRoutes(json)).toEqual(["/"]);
  });

  it("動的な区間を持つ route も返す", () => {
    const json = manifest({ "/(alpha)/gamma/[id]/page": "/gamma/[id]" });

    expect(listScreenRoutes(json)).toEqual(["/gamma/[id]"]);
  });

  it("並びを固定して返す", () => {
    const json = manifest({ "/b/page": "/b", "/a/page": "/a" });

    expect(listScreenRoutes(json)).toEqual(["/a", "/b"]);
  });

  // ----- 異常系 -----
  it("面が 1 つも無い対応表を落とす", () => {
    expect(() => listScreenRoutes(manifest({ "/api/x/route": "/api/x" }))).toThrow();
  });
});

describe("resolveScreens", () => {
  const declarations: readonly ScreenDeclaration[] = [
    { route: "/", name: "home", path: "/" },
    { route: "/_global-error", skip: "URL では開けない" },
  ];

  // ----- 正常系 -----
  it("開く画面だけを返す", () => {
    expect(resolveScreens(["/", "/_global-error"], declarations)).toMatchObject([
      { route: "/", name: "home", path: "/" },
    ]);
  });

  it("ハイフンで繋いだ名前を通す", () => {
    const declared: readonly ScreenDeclaration[] = [
      {
        route: "/admin/reports/[id]/edit",
        name: "admin-report-edit",
        path: "/admin/reports/1/edit",
      },
    ];

    expect(resolveScreens(["/admin/reports/[id]/edit"], declared)[0]?.name).toBe(
      "admin-report-edit",
    );
  });

  it("撮影から外す領域の宣言を、撮る側まで運ぶ", () => {
    // 運ばれないと、要求時刻から導く値を描く画面が、基準を撮った日を過ぎた時点で毎回落ちる。
    const withMask: readonly ScreenDeclaration[] = [
      { route: "/", name: "home", path: "/", mask: ['[data-slot="clock"]'] },
    ];

    expect(resolveScreens(["/"], withMask)[0]?.mask).toEqual(['[data-slot="clock"]']);
  });

  it("外す領域を宣言しない画面は、何も外さない", () => {
    expect(resolveScreens(["/", "/_global-error"], declarations)[0]?.mask).toBeUndefined();
  });

  it("描き終わりの目印の宣言を、撮る側まで運ぶ", () => {
    // 運ばれないと、最初の一式から外した島を持つ画面が、枠のまま撮られた絵と交互に基準へ入る。
    const withSettled: readonly ScreenDeclaration[] = [
      { route: "/", name: "home", path: "/", settled: '[data-slot="quote"]' },
    ];

    expect(resolveScreens(["/"], withSettled)[0]?.settled).toBe('[data-slot="quote"]');
  });

  it("目印を持たない画面は、待たずに撮る側へ渡る", () => {
    expect(resolveScreens(["/", "/_global-error"], declarations)[0]?.settled).toBeUndefined();
  });

  it("動的な区間を宣言された URL へ置き換える", () => {
    const resolved = resolveScreens(
      ["/gamma/[id]"],
      [{ route: "/gamma/[id]", name: "detail", path: "/gamma/1" }],
    );

    expect(resolved[0]?.path).toBe("/gamma/1");
  });

  it("session を要する宣言をそのまま運ぶ", () => {
    const resolved = resolveScreens(
      ["/delta"],
      [{ route: "/delta", name: "delta", path: "/delta", signedIn: "user" }],
    );

    expect(resolved[0]?.signedIn).toBe("user");
  });

  it("session を要さない画面には印を立てない", () => {
    expect(
      resolveScreens(["/"], [{ route: "/", name: "home", path: "/" }])[0]?.signedIn,
    ).toBeUndefined();
  });

  // ----- 異常系 -----
  it("Markdown やパスを作れる文字を名前に持てない", () => {
    const declared: readonly ScreenDeclaration[] = [
      { route: "/", name: "home`](http://evil)", path: "/" },
    ];

    expect(() => resolveScreens(["/"], declared)).toThrow("画面の名前が採れる形ではありません");
  });

  it("区切りを含む名前を持てない", () => {
    const declared: readonly ScreenDeclaration[] = [{ route: "/", name: "../escape", path: "/" }];

    expect(() => resolveScreens(["/"], declared)).toThrow("画面の名前が採れる形ではありません");
  });

  it("大文字や下線を名前に持てない", () => {
    const declared: readonly ScreenDeclaration[] = [{ route: "/", name: "Home_Screen", path: "/" }];

    expect(() => resolveScreens(["/"], declared)).toThrow("画面の名前が採れる形ではありません");
  });

  it("宣言の無い画面を落とす", () => {
    // 文言まで固定する。route 名だけを見ると、2 つの分岐が同じ文言へ壊れても気づけない。
    expect(() => resolveScreens(["/", "/新しい画面", "/_global-error"], declarations)).toThrow(
      /^画面の宣言がありません: \/新しい画面/,
    );
  });

  it("実体を失った宣言を落とす", () => {
    expect(() => resolveScreens(["/"], declarations)).toThrow(
      /^宣言が指す画面がありません: \/_global-error$/,
    );
  });
});

describe("SCREENS", () => {
  // ----- 正常系 -----
  it("同じ route を 2 度宣言しない", () => {
    const routes = SCREENS.map((entry) => entry.route);

    expect(new Set(routes).size).toBe(routes.length);
  });

  it("撮る画面の名前が重ならない", () => {
    const names = SCREENS.filter((entry) => "name" in entry).map((entry) => entry.name);

    expect(new Set(names).size).toBe(names.length);
  });
});

describe("selectScreens", () => {
  const screens: Screen[] = [
    { route: "/", name: "home", path: "/" },
    { route: "/settings", name: "settings", path: "/settings" },
  ];

  // ----- 正常系 -----
  it("名指しした画面だけを残す", () => {
    expect(selectScreens(screens, "settings")).toEqual([screens[1]]);
  });

  it("前後の空白を無視して読む", () => {
    expect(selectScreens(screens, " home , settings ")).toEqual(screens);
  });

  it("指定が無ければ全数を返す", () => {
    expect(selectScreens(screens, undefined)).toEqual(screens);
  });

  it("空文字列は指定が無いものとして扱う", () => {
    expect(selectScreens(screens, "")).toEqual(screens);
  });

  // ----- 異常系 -----
  it("空白だけの指定は、指定が無いものとして扱わずに落とす", () => {
    expect(() => selectScreens(screens, " ")).toThrow(/^E2E_ONLY に該当する画面がありません:/);
  });

  it("1 件も該当しない指定を落とす", () => {
    expect(() => selectScreens(screens, "存在しない画面")).toThrow(
      /^E2E_ONLY に該当する画面がありません: 存在しない画面$/,
    );
  });
});
