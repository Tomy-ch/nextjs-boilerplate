import { describe, expect, it } from "vitest";

import { apiBaseUrlValidator, apiModeValidator } from "./api.schema";

describe("api schema", () => {
  it("http と https の API base URL を受け入れる", () => {
    expect(apiBaseUrlValidator().safeParse("http://api.example.test").success).toBe(true);
    expect(apiBaseUrlValidator().safeParse("https://api.example.test/v1").success).toBe(true);
  });

  it("http(s) 以外の API base URL を拒否する", () => {
    expect(apiBaseUrlValidator().safeParse("ftp://api.example.test").success).toBe(false);
  });

  it("live と mock だけを API mode として受け入れる", () => {
    expect(apiModeValidator().safeParse("live").success).toBe(true);
    expect(apiModeValidator().safeParse("mock").success).toBe(true);
    expect(apiModeValidator().safeParse("development").success).toBe(false);
  });
});
