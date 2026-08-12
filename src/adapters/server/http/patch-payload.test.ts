import { describe, expect, it } from "vitest";
import { normalizePatchPayload } from "./patch-payload";

type Entry = {
  name: string;
  description: string;
  imagePath: string;
};

describe("normalizePatchPayload", () => {
  // ----- 正常系 -----
  it("値のあるキーをそのまま残す", () => {
    expect(normalizePatchPayload<Entry>({ name: "名前" })).toEqual({ name: "名前" });
  });

  it("消す指示の null を残す", () => {
    expect(normalizePatchPayload<Entry>({ imagePath: null })).toEqual({ imagePath: null });
  });

  it("値と消す指示を同時に扱う", () => {
    expect(normalizePatchPayload<Entry>({ name: "名前", imagePath: null })).toEqual({
      name: "名前",
      imagePath: null,
    });
  });

  it("空のペイロードを空のまま返す", () => {
    expect(normalizePatchPayload<Entry>({})).toEqual({});
  });
  // ----- 異常系 -----
  it("undefined のキーを落とす", () => {
    expect(Object.keys(normalizePatchPayload<Entry>({ name: undefined }))).toEqual([]);
  });

  it("undefined を落としても他のキーは残す", () => {
    expect(normalizePatchPayload<Entry>({ name: undefined, imagePath: null })).toEqual({
      imagePath: null,
    });
  });

  it("undefined のキーと未指定を同じ結果にする", () => {
    expect(JSON.stringify(normalizePatchPayload<Entry>({ description: undefined }))).toBe(
      JSON.stringify(normalizePatchPayload<Entry>({})),
    );
  });
});
