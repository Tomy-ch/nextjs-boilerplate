import { describe, expect, it } from "vitest";

import { mediaOriginValidator } from "./media.schema";

describe("media schema", () => {
  it("http と https の media origin を受け入れる", () => {
    expect(mediaOriginValidator().safeParse("http://media.example.test").success).toBe(true);
    expect(mediaOriginValidator().safeParse("https://media.example.test").success).toBe(true);
  });

  it("http(s) 以外の media origin を拒否する", () => {
    expect(mediaOriginValidator().safeParse("ftp://media.example.test").success).toBe(false);
  });
});
