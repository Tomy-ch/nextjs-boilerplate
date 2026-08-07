import { describe, expect, it, vi } from "vitest";

const { getMediaConfig } = vi.hoisted(() => ({
  getMediaConfig: vi.fn(() => ({ origin: "https://media.example.test" })),
}));

vi.mock("@/config/media/media.server", () => ({ getMediaConfig }));

import { resolveMediaUrl } from "./media-url";

describe("正常系", () => {
  describe("resolveMediaUrl", () => {
    it("設定された配信元でオブジェクトキーを解決する", () => {
      expect(resolveMediaUrl("products/abc.png")).toBe(
        "https://media.example.test/products/abc.png",
      );
    });
  });
});

describe("異常系", () => {
  describe("resolveMediaUrl", () => {
    it("キーが無ければ URL を作らない", () => {
      expect(resolveMediaUrl(null)).toBeNull();
    });
  });
});
