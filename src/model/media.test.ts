import { describe, expect, it } from "vitest";
import { mediaUrl } from "./media";

const ORIGIN = "http://gobp-local.web.garage.localhost:3902";

describe("mediaUrl", () => {
  // ----- 正常系 -----
  it("配信元とオブジェクトキーを URL にする", () => {
    expect(mediaUrl(ORIGIN, "items/abc.png")).toBe(`${ORIGIN}/items/abc.png`);
  });

  it("配信元の末尾のスラッシュを重ねない", () => {
    expect(mediaUrl(`${ORIGIN}/`, "items/abc.png")).toBe(`${ORIGIN}/items/abc.png`);
  });

  it("キー先頭のスラッシュを取り除く", () => {
    expect(mediaUrl(ORIGIN, "/items/abc.png")).toBe(`${ORIGIN}/items/abc.png`);
  });

  it("配信元がサブパスを持っても経路を保つ", () => {
    expect(mediaUrl("https://cdn.example.test/media", "items/abc.png")).toBe(
      "https://cdn.example.test/media/items/abc.png",
    );
  });

  it("配信元の綴りが正規化される形でも同じ URL にする", () => {
    expect(mediaUrl("https://Media.Example.test:443", "items/abc.png")).toBe(
      "https://media.example.test/items/abc.png",
    );
  });
  // ----- 異常系 -----
  it("キーが無ければ URL を作らない", () => {
    expect(mediaUrl(ORIGIN, null)).toBeNull();
  });

  it("空のキーを URL にしない", () => {
    expect(mediaUrl(ORIGIN, "")).toBeNull();
  });

  it("別の配信元を指すキーを捨てる", () => {
    expect(mediaUrl(ORIGIN, "https://evil.example/x.png")).toBeNull();
  });

  it("中身を直接埋めたキーを捨てる", () => {
    expect(mediaUrl(ORIGIN, "data:image/svg+xml;base64,PHN2Zy8+")).toBeNull();
  });

  it("スクリプトを指すキーを捨てる", () => {
    expect(mediaUrl(ORIGIN, "javascript:alert(1)")).toBeNull();
  });

  it("配信元のサブパスより上を指すキーを捨てる", () => {
    expect(mediaUrl("https://cdn.example.test/media", "../../secret.png")).toBeNull();
  });

  it("URL として解釈できないキーを捨てる", () => {
    expect(mediaUrl(ORIGIN, "http://[")).toBeNull();
  });
});
