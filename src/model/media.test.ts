import { describe, expect, it } from "vitest";
import { mediaUrl } from "./media";

const ORIGIN = "http://gobp-local.web.garage.localhost:3902";

describe("mediaUrl", () => {
  // ----- 正常系 -----
  it("配信元とオブジェクトキーを URL にする", () => {
    expect(mediaUrl(ORIGIN, "products/abc.png")).toBe(`${ORIGIN}/products/abc.png`);
  });

  it("配信元の末尾のスラッシュを重ねない", () => {
    expect(mediaUrl(`${ORIGIN}/`, "products/abc.png")).toBe(`${ORIGIN}/products/abc.png`);
  });

  it("キー先頭のスラッシュを取り除く", () => {
    expect(mediaUrl(ORIGIN, "/products/abc.png")).toBe(`${ORIGIN}/products/abc.png`);
  });

  it("配信元がサブパスを持っても経路を保つ", () => {
    expect(mediaUrl("https://cdn.example.test/media", "products/abc.png")).toBe(
      "https://cdn.example.test/media/products/abc.png",
    );
  });
  // ----- 異常系 -----
  it("キーが無ければ URL を作らない", () => {
    expect(mediaUrl(ORIGIN, null)).toBeNull();
  });

  it("空のキーを URL にしない", () => {
    expect(mediaUrl(ORIGIN, "")).toBeNull();
  });
});
