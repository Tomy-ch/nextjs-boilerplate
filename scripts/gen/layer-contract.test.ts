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

  it("行末に但し書きが付いていても読む", () => {
    const readme = README.replace(
      "forbidden: [features, business-logic]",
      "forbidden: [features] # 画面まるごとの story は例外",
    );

    expect(readLayerContract(readme)?.forbidden).toEqual(["features"]);
  });

  it("test-requirement の行末に但し書きが付いていても読む", () => {
    const readme = README.replace("test-requirement: feature", "test-requirement: feature # 暫定");

    expect(readLayerContract(readme)?.testRequirement).toBe("feature");
  });

  it("行末の但し書きに ] が現れても値だけを読む", () => {
    const readme = README.replace(
      "forbidden: [features, business-logic]",
      "forbidden: [features] # 詳細は 仕様書[1] を参照",
    );

    expect(readLayerContract(readme)?.forbidden).toEqual(["features"]);
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
