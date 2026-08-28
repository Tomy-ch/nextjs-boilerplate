import { describe, expect, it } from "vitest";

import { createAppError } from "@/errors/app-error";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";

import { toCaughtErrorResponse, toErrorResponse } from "./error-response";

describe("toErrorResponse", () => {
  // ----- 正常系 -----
  it("分類に対応する status を返す", async () => {
    const response = toErrorResponse(ErrorKind.PAYLOAD_TOO_LARGE);

    expect(response.status).toBe(413);
  });

  it("分類の既定の文言を本体に載せる", async () => {
    const response = toErrorResponse(ErrorKind.INVALID_ARGUMENT);

    await expect(response.json()).resolves.toEqual({
      message: getDefaultErrorMeta(ErrorKind.INVALID_ARGUMENT).message,
    });
  });

  it("分類ごとに違う文言を載せる", async () => {
    const invalid = await toErrorResponse(ErrorKind.INVALID_ARGUMENT).json();
    const notFound = await toErrorResponse(ErrorKind.NOT_FOUND).json();

    expect(invalid).not.toEqual(notFound);
  });
});

describe("toCaughtErrorResponse", () => {
  // ----- 正常系 -----
  it("分類の付いた失敗を、その分類の status で返す", () => {
    const response = toCaughtErrorResponse(createAppError(ErrorKind.NOT_FOUND));

    expect(response.status).toBe(404);
  });

  // ----- 異常系 -----
  it("分類の付いていない失敗を internal へ矯正する", () => {
    expect(toCaughtErrorResponse(new Error("想定していない失敗")).status).toBe(500);
    expect(toCaughtErrorResponse("文字列が投げられた").status).toBe(500);
  });
});
