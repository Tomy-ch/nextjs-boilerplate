import type { LayerContract } from "./layer-contract";
import { toPascalCase } from "./naming";

/**
 * 生成する雛形の計画を、書き出す前に 1 つの値として組み立てる。
 *
 * @remarks
 * 計画を先に確定させてから書くのは、途中で導出に失敗したときにファイルを half-written で
 * 残さないためです（IM-27 の halt / hand-off）。ここは純粋関数で、ファイルシステムに触りません。
 */

/** 生成できる雛形の種類。 */
export const GENERATION_KINDS = ["feature", "component", "adapter"] as const;

export type GenerationKind = (typeof GENERATION_KINDS)[number];

/** 書き出す 1 ファイル。 */
export type GeneratedFile = {
  /** リポジトリルート相対のパス。 */
  readonly path: string;
  readonly content: string;
};

/** 計画の入力。 */
export type GenerationInput = {
  readonly kind: GenerationKind;
  /** kebab-case の名前。 */
  readonly name: string;
  /** 生成先の層が `architecture.ts` で import を許されている層。 */
  readonly importsAllowed: readonly string[];
  /** 生成先の層 README が宣言する契約。 */
  readonly contract: LayerContract;
  /** `component` のときだけ使う配置区画（`design-system/status` など）。 */
  readonly area?: string;
};

/** 引数が生成できる種類かを判定する。 */
export function isGenerationKind(value: string): value is GenerationKind {
  return (GENERATION_KINDS as readonly string[]).includes(value);
}

/** 層 README の frontmatter を組み立てる。 */
function frontmatter(input: GenerationInput): string {
  return [
    "---",
    `imports-allowed: [${input.importsAllowed.join(", ")}]`,
    `forbidden: [${input.contract.forbidden.join(", ")}]`,
    `test-requirement: ${input.contract.testRequirement}`,
    "---",
  ].join("\n");
}

/** 生成物の README。層の必須節をすべて持つ。 */
function readme(input: GenerationInput): string {
  return `${frontmatter(input)}

# ${input.name}

<!-- TODO: この ${input.kind} が何のために在るかを 1 文で書いてください。 -->

## 受け入れるもの

<!-- TODO: ここが引き受ける関心を列挙してください。 -->

## 受け入れないもの

- ${input.contract.forbidden.join(" / ")}

## 構成

<!-- TODO: 公開する要素と、その責務を列挙してください。 -->

## 運用

- import してよい層は \`${input.importsAllowed.join(" / ")}\` です（\`architecture.ts\` が正）。
- テスト責務は \`${input.contract.testRequirement}\` です（[0090](../../../docs/adr/0090-testing-strategy.md)）。
`;
}

/** React component の雛形。1 つの export に 1 つの describe が対応する形で出す。 */
function componentSource(symbol: string, label: string): string {
  return `type ${symbol}Props = {
  /** 見出しに表示する文言。 */
  readonly title: string;
};

/**
 * ${label}。
 *
 * @remarks
 * TODO: 受け入れる関心と、受け入れない関心を README と揃えてから実装してください。
 */
export function ${symbol}({ title }: ${symbol}Props) {
  return (
    <section aria-label={title}>
      <h2>{title}</h2>
    </section>
  );
}
`;
}

/** component の雛形に対応するテスト。骨格だけを出し、観点の詰めは scaffold-test へ渡す。 */
function componentTest(symbol: string, importPath: string): string {
  return `// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ${symbol} } from "${importPath}";

describe("${symbol}", () => {
  // ----- 正常系 -----
  it("渡した文言を見出しと領域名に表示する", () => {
    render(<${symbol} title="見出し" />);

    expect(screen.getByRole("region", { name: "見出し" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "見出し" })).toBeVisible();
  });

  it("アクセシビリティ違反を持たない", async () => {
    const { container } = render(<${symbol} title="見出し" />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
`;
}

/** adapter の雛形。外部接続の境界に置く 1 関数と、その正規化の口。 */
function adapterSource(symbol: string): string {
  return `import "server-only";

/**
 * TODO: 呼び出す契約と、返す正規化済みの型を書いてください。
 *
 * @remarks
 * 生成型（\`src/adapters/gen/\`）を上位層へ渡さないこと。この関数の戻り値は正規化済みの型に
 * 限り、生の status とエラーは errors カーネルの分類へ 1 度だけ写します。
 */
export function ${symbol}(input: { readonly keyword: string }): string {
  return input.keyword.trim();
}
`;
}

/** adapter の雛形に対応するテスト。 */
function adapterTest(symbol: string, importPath: string): string {
  return `import { describe, expect, it } from "vitest";

import { ${symbol} } from "${importPath}";

describe("${symbol}", () => {
  // ----- 正常系 -----
  it("前後の空白を落とした検索語を返す", () => {
    expect(${symbol}({ keyword: "  商品  " })).toBe("商品");
  });
});
`;
}

/**
 * 入力から、書き出すファイル一式を組み立てる。
 *
 * @remarks
 * 返す順序は書き出す順序です。README を先頭に置くのは、途中で失敗しても「何を作ろうとしたか」が
 * 残るようにするためです。
 */
export function planGeneration(input: GenerationInput): readonly GeneratedFile[] {
  const symbol = toPascalCase(input.name);

  if (input.kind === "adapter") {
    const directory = `src/adapters/server/${input.name}`;

    return [
      { path: `${directory}/${input.name}.ts`, content: adapterSource(symbol) },
      {
        path: `${directory}/${input.name}.test.ts`,
        content: adapterTest(symbol, `./${input.name}`),
      },
    ];
  }

  const directory =
    input.kind === "feature"
      ? `src/features/${input.name}`
      : `src/components/${input.area ?? "patterns"}/${input.name}`;

  return [
    { path: `${directory}/README.md`, content: readme(input) },
    {
      path: `${directory}/${input.name}.tsx`,
      content: componentSource(
        symbol,
        input.kind === "feature" ? `${input.name} の画面スライス` : `${input.name} の表示部品`,
      ),
    },
    {
      path: `${directory}/${input.name}.test.tsx`,
      content: componentTest(symbol, `./${input.name}`),
    },
  ];
}
