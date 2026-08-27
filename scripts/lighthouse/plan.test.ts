import { describe, expect, it } from "vitest";

import type { Screen } from "../../e2e/lib/screens";
import { planTargets } from "./plan";

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
      { route: "/checkout/complete", name: "complete", path: "/checkout/complete?purchase=1" },
    ];

    expect(planTargets(screens, BASE_URL)[0]?.url).toBe(
      "http://127.0.0.1:3300/checkout/complete?purchase=1",
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
      { route: "/admin/products", name: "admin", path: "/admin/products", signedIn: "admin" },
    ];

    expect(planTargets(screens, BASE_URL)[0]?.role).toBe("admin");
  });

  it("画面が 1 つも無ければ空を返す", () => {
    expect(planTargets([], BASE_URL)).toEqual([]);
  });
});
