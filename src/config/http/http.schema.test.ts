import { describe, expect, it } from "vitest";

import { maxUploadBytesValidator, maxUrlBytesValidator } from "./http.schema";

describe("maxUrlBytesValidator", () => {
  // ----- 正常系 -----
  it("環境変数の文字列をバイト数として受け入れる", () => {
    expect(maxUrlBytesValidator().parse("8000")).toBe(8000);
  });

  // ----- 異常系 -----
  it("0 以下のバイト数を拒否する", () => {
    expect(maxUrlBytesValidator().safeParse("0").success).toBe(false);
    expect(maxUrlBytesValidator().safeParse("-1").success).toBe(false);
  });

  it("整数でないバイト数を拒否する", () => {
    expect(maxUrlBytesValidator().safeParse("8000.5").success).toBe(false);
    expect(maxUrlBytesValidator().safeParse("8k").success).toBe(false);
  });
});

describe("maxUploadBytesValidator", () => {
  // ----- 正常系 -----
  it("環境変数の文字列をバイト数として受け入れる", () => {
    expect(maxUploadBytesValidator().parse("4194304")).toBe(4194304);
  });

  // ----- 異常系 -----
  it("0 以下のバイト数を拒否する", () => {
    expect(maxUploadBytesValidator().safeParse("0").success).toBe(false);
    expect(maxUploadBytesValidator().safeParse("-1").success).toBe(false);
  });

  it("整数でないバイト数を拒否する", () => {
    expect(maxUploadBytesValidator().safeParse("4194304.5").success).toBe(false);
    expect(maxUploadBytesValidator().safeParse("4MiB").success).toBe(false);
  });
});
