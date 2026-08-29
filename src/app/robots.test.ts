import { beforeEach, describe, expect, it, vi } from "vitest";

const site = vi.hoisted(() => ({ publicOrigin: "https://www.example.test", isIndexable: true }));

vi.mock("@/config/site/site.server", () => ({ getSiteConfig: () => site }));
vi.mock("@/model/authz", () => ({ PROTECTED_PREFIXES: ["/account", "/admin"] }));

import robots from "./robots";

describe("robots", () => {
  beforeEach(() => {
    site.publicOrigin = "https://www.example.test";
    site.isIndexable = true;
  });

  // ----- 正常系 -----
  it("索引させる環境では巡回を許し、サイトマップの場所を知らせる", () => {
    const result = robots();

    expect(result.rules).toMatchObject({ userAgent: "*", allow: "/" });
    expect(result.sitemap).toBe("https://www.example.test/sitemap.xml");
  });

  it("保護している経路の宣言をそのまま巡回の拒否へ写す", () => {
    expect(robots().rules).toMatchObject({ disallow: ["/account", "/admin"] });
  });

  it("索引させない環境では全経路を断り、サイトマップを知らせない", () => {
    site.isIndexable = false;

    const result = robots();

    expect(result.rules).toEqual({ userAgent: "*", disallow: "/" });
    expect(result.sitemap).toBeUndefined();
  });
});
