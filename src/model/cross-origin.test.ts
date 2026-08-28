import { describe, expect, it } from "vitest";

import { corsHeadersFor, isStateChanging, judgeOrigin, preflightHeadersFor } from "./cross-origin";

const ALLOWED = ["https://partner.example.test"];

describe("judgeOrigin", () => {
  // ----- 正常系 -----
  it("Origin を持たない要求は自分自身からのものとして扱う", () => {
    expect(judgeOrigin({ origin: null, host: "app.example.test" }, ALLOWED)).toStrictEqual({
      kind: "same-origin",
    });
  });

  it("Origin の host が自分の host と一致すれば自分自身からのものとして扱う", () => {
    expect(
      judgeOrigin({ origin: "https://app.example.test", host: "app.example.test" }, ALLOWED),
    ).toStrictEqual({ kind: "same-origin" });
  });

  it("scheme が違っても host が一致すれば自分自身として扱う", () => {
    expect(
      judgeOrigin({ origin: "https://app.example.test", host: "app.example.test" }, []),
    ).toStrictEqual({ kind: "same-origin" });
    expect(
      judgeOrigin({ origin: "http://localhost:3000", host: "localhost:3000" }, []),
    ).toStrictEqual({ kind: "same-origin" });
  });

  it("宣言で許した別 origin は allowed として origin を返す", () => {
    expect(
      judgeOrigin({ origin: "https://partner.example.test", host: "app.example.test" }, ALLOWED),
    ).toStrictEqual({ kind: "allowed", origin: "https://partner.example.test" });
  });

  // ----- 異常系 -----
  it("宣言に無い別 origin は untrusted", () => {
    expect(
      judgeOrigin({ origin: "https://evil.example.test", host: "app.example.test" }, ALLOWED),
    ).toStrictEqual({ kind: "untrusted" });
  });

  it("port が違えば別の origin として扱う", () => {
    expect(
      judgeOrigin(
        { origin: "https://partner.example.test:8443", host: "app.example.test" },
        ALLOWED,
      ),
    ).toStrictEqual({ kind: "untrusted" });
  });

  it("Origin が null 文字列なら untrusted", () => {
    expect(judgeOrigin({ origin: "null", host: "app.example.test" }, ALLOWED)).toStrictEqual({
      kind: "untrusted",
    });
  });

  it("自分の host が分からなければ、別 origin の判定に倒す", () => {
    expect(judgeOrigin({ origin: "https://app.example.test", host: null }, [])).toStrictEqual({
      kind: "untrusted",
    });
  });
});

describe("isStateChanging", () => {
  // ----- 正常系 -----
  it("POST / PUT / PATCH / DELETE は状態を変えうる", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(isStateChanging(method)).toBe(true);
    }
  });

  it("小文字のメソッドも同じに扱う", () => {
    expect(isStateChanging("post")).toBe(true);
    expect(isStateChanging("get")).toBe(false);
  });

  // ----- 異常系 -----
  it("GET / HEAD / OPTIONS は状態を変えない", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      expect(isStateChanging(method)).toBe(false);
    }
  });
});

describe("corsHeadersFor", () => {
  // ----- 正常系 -----
  it("origin をそのまま返し、credentials を許し、Vary を添える", () => {
    expect(corsHeadersFor("https://partner.example.test")).toStrictEqual({
      "Access-Control-Allow-Origin": "https://partner.example.test",
      "Access-Control-Allow-Credentials": "true",
      Vary: "Origin",
    });
  });
});

describe("preflightHeadersFor", () => {
  // ----- 正常系 -----
  it("求められたメソッドとヘッダをそのまま許す", () => {
    expect(
      preflightHeadersFor("https://partner.example.test", "PUT", "content-type, x-request-id"),
    ).toStrictEqual({
      "Access-Control-Allow-Origin": "https://partner.example.test",
      "Access-Control-Allow-Credentials": "true",
      Vary: "Origin",
      "Access-Control-Allow-Methods": "PUT",
      "Access-Control-Allow-Headers": "content-type, x-request-id",
      "Access-Control-Max-Age": "600",
    });
  });

  // ----- 異常系 -----
  it("メソッドもヘッダも求められなければ GET だけを許し、ヘッダの行を載せない", () => {
    const headers = preflightHeadersFor("https://partner.example.test", null, null);

    expect(headers["Access-Control-Allow-Methods"]).toBe("GET");
    expect(headers).not.toHaveProperty("Access-Control-Allow-Headers");
  });
});
