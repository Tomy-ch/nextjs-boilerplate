import { describe, expect, it } from "vitest";

import { normalizeSarif } from "./normalize";

const KEPT = { ruleId: "kept" };
const SUPPRESSED = { ruleId: "suppressed", suppressions: [{ kind: "inSource" }] };

describe("normalizeSarif", () => {
  // ----- 正常系 -----
  it("suppressions を持つ所見だけを落とす", () => {
    const sarif = { runs: [{ results: [KEPT, SUPPRESSED] }] };

    expect(normalizeSarif(sarif)).toEqual({ runs: [{ results: [KEPT] }] });
  });

  it("実行が複数あればそれぞれから落とす", () => {
    const sarif = { runs: [{ results: [SUPPRESSED] }, { results: [KEPT, SUPPRESSED] }] };

    expect(normalizeSarif(sarif)).toEqual({ runs: [{ results: [] }, { results: [KEPT] }] });
  });

  it("suppressions が空の配列なら抑止されていないものとして残す", () => {
    const sarif = { runs: [{ results: [{ ruleId: "kept", suppressions: [] }] }] };

    expect(normalizeSarif(sarif)).toEqual(sarif);
  });

  it("results が null なら空の配列にする", () => {
    const sarif = { runs: [{ results: null }] };

    expect(normalizeSarif(sarif)).toEqual({ runs: [{ results: [] }] });
  });

  it("results が無ければ空の配列を置く", () => {
    const sarif = { runs: [{ tool: { driver: { name: "bearer" } } }] };

    expect(normalizeSarif(sarif)).toEqual({
      runs: [{ tool: { driver: { name: "bearer" } }, results: [] }],
    });
  });

  it("results 以外は実行の中身をそのまま運ぶ", () => {
    const sarif = {
      version: "2.1.0",
      runs: [{ tool: { driver: { name: "opengrep" } }, results: [] }],
    };

    expect(normalizeSarif(sarif)).toEqual(sarif);
  });

  // ----- 異常系 -----
  it("SARIF として読めない値はそのまま返す", () => {
    expect(normalizeSarif(null)).toBeNull();
    expect(normalizeSarif("sarif ではない")).toBe("sarif ではない");
  });

  it("runs が配列でなければそのまま返す", () => {
    const sarif = { runs: "配列ではない" };

    expect(normalizeSarif(sarif)).toEqual(sarif);
  });

  it("実行や所見が読めない形でもその要素を落とさない", () => {
    const sarif = {
      runs: ["実行ではない", { results: "配列ではない" }, { results: ["所見ではない"] }],
    };

    expect(normalizeSarif(sarif)).toEqual(sarif);
  });
});
