import { describe, expect, it, vi } from "vitest";

const { getMediaConfig } = vi.hoisted(() => ({
  getMediaConfig: vi.fn(() => ({ origin: "https://media.example.test" })),
}));

vi.mock("@/config/media/media.server", () => ({ getMediaConfig }));

import { resolveMediaUrl } from "./media-url";

describe("resolveMediaUrl", () => {
  // ----- 正常系 -----
  it("設定された配信元でオブジェクトキーを解決する", () => {
    expect(resolveMediaUrl("items/abc.png")).toBe("https://media.example.test/items/abc.png");
  });
  // ----- 異常系 -----
  it("キーが無ければ URL を作らない", () => {
    expect(resolveMediaUrl(null)).toBeNull();
  });
});
