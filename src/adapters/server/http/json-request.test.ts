import { describe, expect, it } from "vitest";

import { ErrorKind } from "@/errors/error-kind";

import { readJsonBody } from "./json-request";

const MAX_BYTES = 1024;

function requestWith(body: string, headers: Readonly<Record<string, string>>): Request {
  return new Request("http://localhost/api/anything", { method: "POST", headers, body });
}

describe("readJsonBody", () => {
  // ----- 正常系 -----
  it("上限に収まる JSON を読んで返す", async () => {
    const request = requestWith('{"kind":"web-vital"}', { "content-type": "application/json" });

    await expect(readJsonBody(request, MAX_BYTES)).resolves.toEqual({
      ok: true,
      value: { kind: "web-vital" },
    });
  });

  it("引数の付いた content-type も JSON として受ける", async () => {
    const request = requestWith("{}", { "content-type": "Application/JSON; charset=utf-8" });

    await expect(readJsonBody(request, MAX_BYTES)).resolves.toEqual({ ok: true, value: {} });
  });

  // ----- 異常系 -----
  it("JSON を名乗らない本体を落とす", async () => {
    const request = requestWith("kind=web-vital", { "content-type": "text/plain" });

    await expect(readJsonBody(request, MAX_BYTES)).resolves.toEqual({
      ok: false,
      kind: ErrorKind.UNSUPPORTED_MEDIA_TYPE,
    });
  });

  it("型を名乗らない要求を落とす", async () => {
    const request = new Request("http://localhost/api/anything", { method: "POST", body: "{}" });

    await expect(readJsonBody(request, MAX_BYTES)).resolves.toEqual({
      ok: false,
      kind: ErrorKind.UNSUPPORTED_MEDIA_TYPE,
    });
  });

  it("宣言された長さが上限を超える要求を、本体を読まずに落とす", async () => {
    const request = requestWith("{}", {
      "content-type": "application/json",
      "content-length": `${MAX_BYTES + 1}`,
    });

    await expect(readJsonBody(request, MAX_BYTES)).resolves.toEqual({
      ok: false,
      kind: ErrorKind.PAYLOAD_TOO_LARGE,
    });
  });

  it("長さを偽った本体を、読んだうえで落とす", async () => {
    const request = requestWith(`"${"あ".repeat(MAX_BYTES)}"`, {
      "content-type": "application/json",
    });

    await expect(readJsonBody(request, MAX_BYTES)).resolves.toEqual({
      ok: false,
      kind: ErrorKind.PAYLOAD_TOO_LARGE,
    });
  });

  it("JSON として読めない本体を落とす", async () => {
    const request = requestWith("{", { "content-type": "application/json" });

    await expect(readJsonBody(request, MAX_BYTES)).resolves.toEqual({
      ok: false,
      kind: ErrorKind.INVALID_ARGUMENT,
    });
  });
});
