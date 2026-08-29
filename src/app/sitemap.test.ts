import { beforeEach, describe, expect, it, vi } from "vitest";

const { connection } = vi.hoisted(() => ({ connection: vi.fn(async () => undefined) }));
const { cacheLife } = vi.hoisted(() => ({ cacheLife: vi.fn() }));
const { getPublicProductIds } = vi.hoisted(() => ({ getPublicProductIds: vi.fn() })); // sample:line

vi.mock("next/server", () => ({ connection }));
vi.mock("next/cache", () => ({ cacheLife }));
vi.mock("@/config/site/site.server", () => ({
  getSiteConfig: () => ({ publicOrigin: "https://www.example.test", isIndexable: true }),
}));
vi.mock("@/adapters/server/api/public-products", () => ({ getPublicProductIds })); // sample:line

import { PROTECTED_PREFIXES } from "@/model/authz"; // sample:line

import sitemap from "./sitemap";

// sample:begin
/** 契約の上限いっぱいの 1 ページ。cursor は尽きない。 */
function endlessPage() {
  return { items: Array.from({ length: 200 }, (_, index) => `id-${index}`), nextCursor: "next" };
}
// sample:end

describe("sitemap", () => {
  beforeEach(() => {
    connection.mockClear();
    cacheLife.mockClear();
    getPublicProductIds.mockReset(); // sample:line
    getPublicProductIds.mockResolvedValue({ items: [], nextCursor: null }); // sample:line
  });

  // ----- 正常系 -----
  it("connection() を待ってから組み立てる", async () => {
    await sitemap();

    expect(connection).toHaveBeenCalledOnce();
  });

  it("誰でも開ける画面を、外から見た origin の絶対 URL で挙げる", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain("https://www.example.test/");
    expect(urls.every((url) => url.startsWith("https://www.example.test/"))).toBe(true);
  });

  it("更新日時や優先度のような根拠の無い値を付けない", async () => {
    for (const entry of await sitemap()) {
      expect(entry).toEqual({ url: entry.url });
    }
  });

  // sample:begin
  it("商品を cursor の末尾まで辿って挙げる", async () => {
    getPublicProductIds
      .mockResolvedValueOnce({ items: ["p1", "p2"], nextCursor: "c1" })
      .mockResolvedValueOnce({ items: ["p3"], nextCursor: null });

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls.filter((url) => url.includes("/products/"))).toEqual([
      "https://www.example.test/products/p1",
      "https://www.example.test/products/p2",
      "https://www.example.test/products/p3",
    ]);
    expect(getPublicProductIds).toHaveBeenNthCalledWith(1, undefined);
    expect(getPublicProductIds).toHaveBeenNthCalledWith(2, "c1");
  });

  it("商品が上限を超えて続いても、辿るのも挙げるのも上限で打ち切る", async () => {
    getPublicProductIds.mockImplementation(async () => endlessPage());

    const entries = await sitemap();

    expect(getPublicProductIds).toHaveBeenCalledTimes(250);
    expect(entries).toHaveLength(50_000);
  });

  it("辿った一覧の保持期間に hours を指定する", async () => {
    await sitemap();

    expect(cacheLife).toHaveBeenCalledWith("hours");
  });

  it("保護している経路は挙げない", async () => {
    const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);

    for (const prefix of PROTECTED_PREFIXES) {
      expect(paths.some((path) => path === prefix || path.startsWith(`${prefix}/`))).toBe(false);
    }
  });

  // ----- 異常系 -----
  it("一覧の取得が失敗しても、backend に依らない経路は挙げる", async () => {
    getPublicProductIds.mockRejectedValue(new Error("unavailable"));

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain("https://www.example.test/");
    expect(urls.some((url) => url.includes("/products/"))).toBe(false);
  });
  // sample:end
});
