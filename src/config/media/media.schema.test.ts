import { describe, expect, it } from "vitest";

import { mediaOriginValidator } from "./media.schema";

describe("mediaOriginValidator", () => {
  // ----- 正常系 -----
  it("http と https の media origin を受け入れる", () => {
    expect(mediaOriginValidator().safeParse("http://media.example.test").success).toBe(true);
    expect(mediaOriginValidator().safeParse("https://media.example.test").success).toBe(true);
  });

  // ----- 異常系 -----
  it("http(s) 以外の media origin を拒否する", () => {
    expect(mediaOriginValidator().safeParse("ftp://media.example.test").success).toBe(false);
  });
});
