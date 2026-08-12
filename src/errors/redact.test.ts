import { describe, expect, it } from "vitest";

import { redactedValue, redactMessage } from "./redact";

describe("redactMessage", () => {
  // ----- 正常系 -----
  it("明示指定した秘匿値をすべて置き換える", () => {
    expect(
      redactMessage("token=secret-token password=secret-password", [
        "secret-token",
        "secret-password",
      ]),
    ).toBe(`token=${redactedValue} password=${redactedValue}`);
  });

  it("長い秘匿値を先に置き換えて部分値を漏らさない", () => {
    expect(redactMessage("token=abcdef", ["abc", "abcdef"])).toBe(`token=${redactedValue}`);
  });

  it("対象の秘匿値がないメッセージをそのまま返す", () => {
    expect(redactMessage("安全なメッセージ", ["secret"])).toBe("安全なメッセージ");
  });

  // ----- 異常系 -----
  it("空文字と重複した秘匿値ではメッセージを壊さない", () => {
    expect(redactMessage("token=secret", ["", "secret", "secret"])).toBe(`token=${redactedValue}`);
  });
});
