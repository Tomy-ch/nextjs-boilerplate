import { describe, expect, it } from "vitest";

import { failures } from "./failures";

const CLEAN = { malformed: [], missing: [] };

describe("failures", () => {
  // ----- 正常系 -----
  it("止める理由が無ければ空を返す", () => {
    expect(failures(CLEAN, [], [])).toEqual([]);
  });

  // ----- 異常系 -----
  it("想定の外にある形を位置ごとに挙げる", () => {
    expect(failures({ ...CLEAN, malformed: [".github/workflows/odd.yaml:3"] }, [], [])).toEqual([
      "❌ .github/workflows/odd.yaml:3: bullfrog の形が想定と違うため書き換えられません。",
    ]);
  });

  it("形の外にある位置が複数あれば、受け取った順に挙げる", () => {
    const malformed = [".github/workflows/b.yaml:9", ".github/workflows/a.yaml:2"];

    expect(failures({ ...CLEAN, malformed }, [], [])).toEqual([
      "❌ .github/workflows/b.yaml:9: bullfrog の形が想定と違うため書き換えられません。",
      "❌ .github/workflows/a.yaml:2: bullfrog の形が想定と違うため書き換えられません。",
    ]);
  });

  it("bullfrog の無い job を workflow/job で挙げる", () => {
    expect(failures({ ...CLEAN, missing: ["lint/lint"] }, [], [])).toEqual([
      "❌ lint/lint: bullfrog の step を持たない job です。",
    ]);
  });

  it("対応する workflow の無い宣言を挙げる", () => {
    expect(failures(CLEAN, ["vrt"], [])).toEqual([
      "❌ .github/egress.yaml: vrt に対応する workflow がありません。",
    ]);
  });

  it("対応する job の無い sudo の例外を挙げる", () => {
    expect(failures(CLEAN, [], ["vrt/capture"])).toEqual([
      "❌ .github/egress.yaml: sudo の vrt/capture に合う job がありません。",
    ]);
  });

  it("理由が重なれば、形・job・宣言・sudo の順にすべて挙げる", () => {
    const messages = failures({ malformed: ["a.yaml:1"], missing: ["a/b"] }, ["c"], ["d/e"]);

    expect(messages).toHaveLength(4);
    expect(messages[0]).toContain("a.yaml:1");
    expect(messages[1]).toContain("a/b");
    expect(messages[2]).toContain(": c に対応する workflow");
    expect(messages[3]).toContain("d/e");
  });
});
