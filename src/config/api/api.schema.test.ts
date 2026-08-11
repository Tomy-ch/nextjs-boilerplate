import { describe, expect, it } from "vitest";

import { apiBaseUrlValidator, apiModeValidator } from "./api.schema";

describe("apiBaseUrlValidator", () => {
  // ----- 正常系 -----
  it("http と https の API base URL を受け入れる", () => {
    expect(apiBaseUrlValidator().safeParse("http://api.example.test").success).toBe(true);
    expect(apiBaseUrlValidator().safeParse("https://api.example.test/v1").success).toBe(true);
  });

  // ----- 異常系 -----
  it("http(s) 以外の API base URL を拒否する", () => {
    expect(apiBaseUrlValidator().safeParse("ftp://api.example.test").success).toBe(false);
  });
});

describe("apiModeValidator", () => {
  // ----- 正常系 -----
  it("live と mock を API mode として受け入れる", () => {
    expect(apiModeValidator().safeParse("live").success).toBe(true);
    expect(apiModeValidator().safeParse("mock").success).toBe(true);
  });

  // ----- 異常系 -----
  it("live と mock 以外の API mode を拒否する", () => {
    expect(apiModeValidator().safeParse("development").success).toBe(false);
  });
});
