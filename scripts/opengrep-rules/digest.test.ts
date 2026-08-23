import { describe, expect, it } from "vitest";

import { ruleSetDigest } from "./digest";

describe("ruleSetDigest", () => {
  // ----- 正常系 -----
  it("同じ集合には同じ digest を返す", () => {
    const files = [
      { path: "javascript/a.yaml", content: "rules: []" },
      { path: "typescript/b.yaml", content: "rules: []" },
    ];

    expect(ruleSetDigest(files)).toBe(ruleSetDigest(files));
  });

  it("列挙順が違っても同じ digest を返す", () => {
    const a = { path: "javascript/a.yaml", content: "rules: []" };
    const b = { path: "typescript/b.yaml", content: "rules: []" };

    expect(ruleSetDigest([a, b])).toBe(ruleSetDigest([b, a]));
  });

  it("空の集合にも digest を返す", () => {
    expect(ruleSetDigest([])).toMatch(/^[0-9a-f]{64}$/);
  });

  it("小文字 16 進の 64 桁を返す", () => {
    expect(ruleSetDigest([{ path: "a.yaml", content: "x" }])).toMatch(/^[0-9a-f]{64}$/);
  });

  // ----- 異常系 -----
  it("中身が変われば digest が変わる", () => {
    const before = ruleSetDigest([{ path: "a.yaml", content: "rules: []" }]);
    const after = ruleSetDigest([{ path: "a.yaml", content: "rules: [x]" }]);

    expect(after).not.toBe(before);
  });

  it("中身が同じでも置き場が変われば digest が変わる", () => {
    const before = ruleSetDigest([{ path: "javascript/a.yaml", content: "rules: []" }]);
    const after = ruleSetDigest([{ path: "typescript/a.yaml", content: "rules: []" }]);

    expect(after).not.toBe(before);
  });

  it("区切りを跨いで同じ入力列を作れない", () => {
    const split = ruleSetDigest([
      { path: "a", content: "b" },
      { path: "c", content: "d" },
    ]);
    const joined = ruleSetDigest([{ path: "a\0b", content: "c\0d" }]);

    expect(joined).not.toBe(split);
  });
});
