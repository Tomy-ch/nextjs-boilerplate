import { describe, expect, it } from "vitest";

import type { Screen } from "../../e2e/lib/screens";
import { planScreens, planTargets } from "./plan";

const BASE_URL = "http://127.0.0.1:3300";

describe("planTargets", () => {
  // ----- 正常系 -----
  it("画面の名前とパスから、開く URL を組み立てる", () => {
    const screens: Screen[] = [{ route: "/", name: "home", path: "/" }];

    expect(planTargets(screens, BASE_URL)).toEqual([
      { name: "home", url: "http://127.0.0.1:3300/", role: undefined },
    ]);
  });

  it("query を持つパスを二重の `?` にしない", () => {
    const screens: Screen[] = [
      { route: "/reports/export", name: "export", path: "/reports/export?page=1" },
    ];

    expect(planTargets(screens, BASE_URL)[0]?.url).toBe(
      "http://127.0.0.1:3300/reports/export?page=1",
    );
  });

  it("ASCII の外の文字を持つパスを符号化する", () => {
    const screens: Screen[] = [
      { route: "/_not-found", name: "not-found", path: "/この経路は存在しない" },
    ];

    expect(planTargets(screens, BASE_URL)[0]?.url).toBe(
      `http://127.0.0.1:3300/${encodeURIComponent("この経路は存在しない")}`,
    );
  });

  it("役割を宣言した画面は、その役割を運ぶ", () => {
    const screens: Screen[] = [
      { route: "/admin/reports", name: "admin", path: "/admin/reports", signedIn: "admin" },
    ];

    expect(planTargets(screens, BASE_URL)[0]?.role).toBe("admin");
  });

  it("画面が 1 つも無ければ空を返す", () => {
    expect(planTargets([], BASE_URL)).toEqual([]);
  });
});

/** 画面 1 枚。名前だけが判定に効く。 */
function screen(name: string): Screen {
  return { route: `/${name}`, name, path: `/${name}` };
}

const SELECTED: Screen[] = [screen("home"), screen("reports"), screen("not-found")];

describe("planScreens", () => {
  // ----- 正常系 -----
  it("担当ぶんだけを測る", () => {
    const plan = planScreens(SELECTED, { index: 1, total: 2 }, "not-found");

    expect(plan.screens.map((s) => s.name)).toEqual(["home", "not-found"]);
  });

  it("床を担当しない台は、床を足して測る", () => {
    const plan = planScreens(SELECTED, { index: 2, total: 2 }, "not-found");

    expect(plan.screens.map((s) => s.name)).toEqual(["reports", "not-found"]);
  });

  it("足した床は、機械の速さを読むためだけのものとして返す", () => {
    expect(planScreens(SELECTED, { index: 2, total: 2 }, "not-found").control?.name).toBe(
      "not-found",
    );
  });

  it("床を担当する台は、二度測らない", () => {
    const plan = planScreens(SELECTED, { index: 1, total: 2 }, "not-found");

    expect(plan.control).toBeUndefined();
  });

  it("割らない実行では足さない", () => {
    const plan = planScreens(SELECTED, { index: 1, total: 1 }, "not-found");

    expect(plan.screens.map((s) => s.name)).toEqual(["home", "reports", "not-found"]);
    expect(plan.control).toBeUndefined();
  });

  // ----- 異常系 -----
  it("絞りが床を落としていれば足さない", () => {
    const plan = planScreens([screen("reports")], { index: 1, total: 2 }, "not-found");

    expect(plan.control).toBeUndefined();
  });
});
