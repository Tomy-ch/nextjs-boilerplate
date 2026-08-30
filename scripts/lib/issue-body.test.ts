import { describe, expect, it } from "vitest";

import { composeIssueBody } from "./issue-body";

describe("composeIssueBody", () => {
  // ----- 正常系 -----
  it("見出し・証拠・実行の URL・案内をこの順に空行で区切って並べる", () => {
    expect(
      composeIssueBody({
        heading: "落ちた内容:",
        evidence: { kind: "tool-output", text: "1 failed" },
        runUrl: "https://example.test/runs/1",
        note: "trace を開いてください。",
      }),
    ).toBe("落ちた内容:\n\n    1 failed\n\n実行: https://example.test/runs/1\n\ntrace を開いてください。\n");
  });

  it("道具の出力は空行も含めて字下げする", () => {
    expect(
      composeIssueBody({
        heading: "違反の詳細:",
        evidence: { kind: "tool-output", text: "color-contrast\n\nregion" },
        note: "rule を切らないでください。",
      }),
    ).toContain("    color-contrast\n    \n    region");
  });

  it("このリポジトリが組んだ証拠は字下げせず、markdown として描かせる", () => {
    expect(
      composeIssueBody({
        evidence: { kind: "authored", text: "| 画面 | LCP |\n| --- | --- |" },
        note: "予算を緩めないでください。",
      }),
    ).toBe("| 画面 | LCP |\n| --- | --- |\n\n予算を緩めないでください。\n");
  });

  it("見出しを持たない面では、証拠から始める", () => {
    expect(
      composeIssueBody({
        evidence: { kind: "authored", text: "表" },
        runUrl: "https://example.test/runs/2",
        note: "案内",
      }),
    ).toBe("表\n\n実行: https://example.test/runs/2\n\n案内\n");
  });

  it("実行を指さない面では、URL の行を置かない", () => {
    expect(
      composeIssueBody({
        evidence: { kind: "authored", text: "置き場の大きさ" },
        note: "make baseline-prune を実行してください。",
      }),
    ).toBe("置き場の大きさ\n\nmake baseline-prune を実行してください。\n");
  });
});
