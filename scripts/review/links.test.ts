import { describe, expect, it } from "vitest";

import type { ScreenDeclaration } from "../../e2e/lib/screens";
import { formatLinks, screenLinks, storyLinks } from "./links";

const BASE = "http://localhost:6106";
const APP = "http://localhost:3200";

const SCREENS: readonly ScreenDeclaration[] = [
  { route: "/about", name: "about", path: "/about" },
  { route: "/admin", name: "admin-dashboard", path: "/admin", signedIn: "admin" },
  { route: "/_global-error", skip: "URL では開けない" },
];

describe("storyLinks", () => {
  // ----- 正常系 -----
  it("id を sidebar 付きの面の URL へ変える", () => {
    expect(storyLinks(BASE, ["action-button--pending"])).toEqual([
      {
        name: "action-button--pending",
        url: `${BASE}/?path=/story/action-button--pending`,
        note: "",
      },
    ]);
  });

  it("受け取った順序を保つ", () => {
    expect(storyLinks(BASE, ["b", "a"]).map((link) => link.name)).toEqual(["b", "a"]);
  });
});

describe("screenLinks", () => {
  // ----- 正常系 -----
  it("役割の要らない画面はそのまま開く URL を返す", () => {
    expect(screenLinks(APP, ["about"], SCREENS, "/dev/session", "returnUrl")).toEqual([
      { name: "about", url: `${APP}/about`, note: "" },
    ]);
  });

  it("役割の要る画面は session の面を経由し、行き先を持たせる", () => {
    expect(screenLinks(APP, ["admin-dashboard"], SCREENS, "/dev/session", "returnUrl")).toEqual([
      {
        name: "admin-dashboard",
        url: `${APP}/dev/session?returnUrl=%2Fadmin`,
        note: "admin の session を発行してから開く",
      },
    ]);
  });

  // ----- 異常系 -----
  it("宣言に無い名前を落とさず、理由を添えて残す", () => {
    expect(screenLinks(APP, ["消えた画面"], SCREENS, "/dev/session", "returnUrl")).toEqual([
      { name: "消えた画面", url: null, note: "このブランチの宣言に無い画面です" },
    ]);
  });

  it("開かない宣言の route は突き合わせの対象に入らない", () => {
    expect(screenLinks(APP, ["/_global-error"], SCREENS, "/dev/session", "returnUrl")[0]?.url).toBe(
      null,
    );
  });
});

describe("formatLinks", () => {
  // ----- 正常系 -----
  it("名前の幅を揃えて 1 行ずつ並べる", () => {
    const formatted = formatLinks([
      { name: "a", url: "http://x/a", note: "" },
      { name: "long", url: "http://x/b", note: "" },
    ]);

    expect(formatted).toBe("a     http://x/a\nlong  http://x/b");
  });

  it("注記のある行だけ末尾へ添える", () => {
    expect(formatLinks([{ name: "a", url: "http://x/a", note: "admin が要る" }])).toBe(
      "a  http://x/a  (admin が要る)",
    );
  });

  it("URL を持たない行は開けないことが分かる形で出す", () => {
    expect(formatLinks([{ name: "a", url: null, note: "宣言が無い" }])).toBe("a  —  (宣言が無い)");
  });
});
