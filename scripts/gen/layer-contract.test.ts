import { describe, expect, it } from "vitest";

import { readLayerContract } from "./layer-contract";

const README = `---
imports-allowed: [model, components, adapters]
forbidden: [features, business-logic]
test-requirement: feature
---

# reports
`;

describe("readLayerContract", () => {
  // ----- 正常系 -----
  it("frontmatter から forbidden と test-requirement を読む", () => {
    expect(readLayerContract(README)).toEqual({
      forbidden: ["features", "business-logic"],
      testRequirement: "feature",
    });
  });

  it("forbidden が空配列でも空の一覧として読む", () => {
    const readme = README.replace("[features, business-logic]", "[]");

    expect(readLayerContract(readme)?.forbidden).toEqual([]);
  });

  it("要素の前後に空白があっても落として読む", () => {
    const readme = README.replace("[features, business-logic]", "[  features ,  fetch  ]");

    expect(readLayerContract(readme)?.forbidden).toEqual(["features", "fetch"]);
  });

  // ----- 異常系 -----
  it("frontmatter が無ければ null を返す", () => {
    expect(readLayerContract("# reports\n")).toBeNull();
  });

  it("forbidden の宣言が無ければ null を返す", () => {
    const readme = README.replace("forbidden: [features, business-logic]\n", "");

    expect(readLayerContract(readme)).toBeNull();
  });

  it("test-requirement の宣言が無ければ null を返す", () => {
    const readme = README.replace("test-requirement: feature\n", "");

    expect(readLayerContract(readme)).toBeNull();
  });
});
