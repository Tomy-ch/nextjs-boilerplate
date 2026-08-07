import { describe, expect, it } from "vitest";
import { decodeContentsResponse } from "./contents-response";

const spec = "openapi: 3.0.3\n";

function response(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: "file",
    encoding: "base64",
    content: Buffer.from(spec, "utf8").toString("base64"),
    sha: "aa62bff3e087b544494f012d5009702492e40d79",
    size: Buffer.byteLength(spec, "utf8"),
    ...overrides,
  };
}

describe("decodeContentsResponse", () => {
  // ----- 正常系 -----
  it("base64 の本文を契約へ復号する", () => {
    expect(decodeContentsResponse(response()).spec).toBe(spec);
  });

  it("blob SHA をそのまま取り出す", () => {
    expect(decodeContentsResponse(response()).sha).toBe("aa62bff3e087b544494f012d5009702492e40d79");
  });
  // ----- 異常系 -----
  it("Contents API の形をしていない応答を拒否する", () => {
    expect(() => decodeContentsResponse({ message: "Not Found" })).toThrow();
  });

  it("ディレクトリを指す応答を拒否する", () => {
    expect(() => decodeContentsResponse(response({ type: "dir" }))).toThrow(
      "取得先がファイルではありません",
    );
  });

  it("1MB 超で本文が落ちた応答を拒否する", () => {
    expect(() => decodeContentsResponse(response({ encoding: "none", content: "" }))).toThrow(
      "1MB",
    );
  });

  it("本文を持たない応答を拒否する", () => {
    expect(() => decodeContentsResponse(response({ content: undefined }))).toThrow("本文が空です");
  });

  it("空文字列の本文を拒否する", () => {
    expect(() => decodeContentsResponse(response({ content: "" }))).toThrow("本文が空です");
  });

  it("base64 以外の encoding を拒否する", () => {
    expect(() => decodeContentsResponse(response({ encoding: "utf-8" }))).toThrow(
      "想定しない encoding です",
    );
  });

  it("申告サイズと復号結果が食い違う応答を拒否する", () => {
    expect(() => decodeContentsResponse(response({ size: 1 }))).toThrow(
      "復号後のサイズが一致しません",
    );
  });
});
