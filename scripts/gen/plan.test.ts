import { describe, expect, it } from "vitest";

import type { LayerContract } from "./layer-contract";
import { type GenerationInput, isGenerationKind, planGeneration } from "./plan";

const contract: LayerContract = {
  forbidden: ["features", "business-logic"],
  testRequirement: "feature",
};

function inputOf(overrides: Partial<GenerationInput> = {}): GenerationInput {
  return {
    kind: "feature",
    name: "product-detail",
    importsAllowed: ["model", "components"],
    contract,
    ...overrides,
  };
}

describe("isGenerationKind", () => {
  // ----- 正常系 -----
  it("生成できる 3 種類を受け付ける", () => {
    expect(isGenerationKind("feature")).toBe(true);
    expect(isGenerationKind("component")).toBe(true);
    expect(isGenerationKind("adapter")).toBe(true);
  });

  // ----- 異常系 -----
  it("一覧に無い語を拒む", () => {
    expect(isGenerationKind("store")).toBe(false);
  });
});

describe("planGeneration", () => {
  // ----- 正常系 -----
  it("feature を features 配下へ README・実装・テストの 3 ファイルで計画する", () => {
    expect(planGeneration(inputOf()).map((file) => file.path)).toEqual([
      "src/features/product-detail/README.md",
      "src/features/product-detail/product-detail.tsx",
      "src/features/product-detail/product-detail.test.tsx",
    ]);
  });

  it("component を指定した区画へ置く", () => {
    const files = planGeneration(inputOf({ kind: "component", area: "design-system/status" }));

    expect(files.map((file) => file.path)).toEqual([
      "src/components/design-system/status/product-detail/README.md",
      "src/components/design-system/status/product-detail/product-detail.tsx",
      "src/components/design-system/status/product-detail/product-detail.test.tsx",
    ]);
  });

  it("component の区画を省くと patterns へ置く", () => {
    const files = planGeneration(inputOf({ kind: "component" }));

    expect(files[0].path).toBe("src/components/patterns/product-detail/README.md");
  });

  it("adapter を server 配下へ実装とテストの 2 ファイルで計画する", () => {
    expect(planGeneration(inputOf({ kind: "adapter" })).map((file) => file.path)).toEqual([
      "src/adapters/server/product-detail/product-detail.ts",
      "src/adapters/server/product-detail/product-detail.test.ts",
    ]);
  });

  it("README の frontmatter へ層の契約をそのまま引き継ぐ", () => {
    const readme = planGeneration(inputOf())[0].content;

    expect(readme).toContain("imports-allowed: [model, components]");
    expect(readme).toContain("forbidden: [features, business-logic]");
    expect(readme).toContain("test-requirement: feature");
  });

  it("実装とテストの describe に PascalCase の識別子を使う", () => {
    const files = planGeneration(inputOf());

    expect(files[1].content).toContain("export function ProductDetail(");
    expect(files[2].content).toContain('describe("ProductDetail"');
  });

  it("生成するテストへ観点の区切りを入れる", () => {
    expect(planGeneration(inputOf())[2].content).toContain("// ----- 正常系 -----");
  });

  it("adapter の実装へ server-only の宣言を入れる", () => {
    expect(planGeneration(inputOf({ kind: "adapter" }))[0].content).toContain(
      'import "server-only"',
    );
  });
});
