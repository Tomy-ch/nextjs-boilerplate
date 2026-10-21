import { describe, expect, it } from "vitest";

import { spelledProperty } from "./property-key";

describe("spelledProperty", () => {
  // ----- 正常系 -----
  it("識別子で書いた鍵は、その名前を綴りとして返す", () => {
    expect(spelledProperty({ type: "Identifier", name: "cache" }, false)).toBe("cache");
  });

  it("引用符で書いた鍵は、引用符を外した綴りを返す", () => {
    expect(spelledProperty({ type: "Literal", value: "cache" }, false)).toBe("cache");
  });

  it("括弧で書いたリテラルの鍵も、綴りが確定しているものとして返す", () => {
    expect(spelledProperty({ type: "Literal", value: "cache" }, true)).toBe("cache");
  });

  // ----- 異常系 -----
  it("括弧で書いた識別子の鍵は、値が実行時に決まるので綴りを返さない", () => {
    expect(spelledProperty({ type: "Identifier", name: "key" }, true)).toBeUndefined();
  });

  it("文字列でないリテラルの鍵は綴りを返さない", () => {
    expect(spelledProperty({ type: "Literal", value: 1 }, false)).toBeUndefined();
  });

  it("式で組んだ鍵は綴りを返さない", () => {
    expect(spelledProperty({ type: "TemplateLiteral" }, true)).toBeUndefined();
  });
});
