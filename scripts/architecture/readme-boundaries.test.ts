import { describe, expect, it } from "vitest";

import {
  applyImportsAllowed,
  declaresBoundary,
  findBoundaryDrift,
  parseBoundaryFrontmatter,
  renderImportsAllowed,
} from "./readme-boundaries";

/**
 * 生成済みの README。`imports-allowed` は生成結果と一致している。
 *
 * @remarks
 * 整形を production の口へ委ねず、**リテラルで書く**（`scripts/lib/coverage-exclusion.test.ts` の
 * `recording` と同じ形）。委ねると整形が壊れたときに期待値も同じ形で壊れ、突き合わせが成立しない。
 */
function generated(dependencies: readonly string[], forbidden = "[fetch]"): string {
  return `---\nimports-allowed: [${dependencies.join(", ")}] # 生成物。\`pnpm gen:architecture\` で直す\nforbidden: ${forbidden}\n---\n\n# layer\n`;
}

describe("parseBoundaryFrontmatter", () => {
  // ----- 正常系 -----
  it("frontmatter から境界宣言を取り出す", () => {
    const source = [
      "---",
      "imports-allowed: [model, errors]",
      "forbidden: [fetch, config]",
      "test-requirement: component",
      "---",
      "",
      "# components",
    ].join("\n");

    expect(parseBoundaryFrontmatter(source)).toEqual({
      "imports-allowed": ["model", "errors"],
      forbidden: ["fetch", "config"],
    });
  });

  it("生成物の印が付いた行も値として読む", () => {
    expect(parseBoundaryFrontmatter(generated(["model", "errors"]))["imports-allowed"]).toEqual([
      "model",
      "errors",
    ]);
  });

  it("改行が CRLF の README も読む", () => {
    const source = "---\r\nimports-allowed: [errors]\r\nforbidden: [fetch]\r\n---\r\n\r\n# model";

    expect(parseBoundaryFrontmatter(source)).toEqual({
      "imports-allowed": ["errors"],
      forbidden: ["fetch"],
    });
  });
  // ----- 異常系 -----
  it("frontmatter が無い README を拒否する", () => {
    expect(() => parseBoundaryFrontmatter("# components\n")).toThrow("frontmatter");
  });

  it("境界のキーを欠く frontmatter を、欠けたキーを名指しして拒否する", () => {
    expect(() => parseBoundaryFrontmatter("---\ntest-requirement: unit\n---\n")).toThrow(
      /imports-allowed/,
    );
  });

  it("配列でない imports-allowed を、そのキーを名指しして拒否する", () => {
    expect(() =>
      parseBoundaryFrontmatter("---\nimports-allowed: model\nforbidden: []\n---\n"),
    ).toThrow(/imports-allowed/);
  });
});

describe("declaresBoundary", () => {
  // ----- 正常系 -----
  it("imports-allowed を持つ frontmatter を宣言として読む", () => {
    expect(declaresBoundary("---\nimports-allowed: []\nforbidden: []\n---\n")).toBe(true);
  });

  it("対の片割れだけを残した frontmatter も宣言として読む", () => {
    expect(declaresBoundary("---\nforbidden: [fetch]\n---\n")).toBe(true);
  });
  // ----- 異常系 -----
  it("frontmatter を持たない README を宣言として読まない", () => {
    expect(declaresBoundary("# ui scripts\n")).toBe(false);
  });

  it("ディレクトリに付くキーだけの frontmatter を宣言として読まない", () => {
    expect(declaresBoundary("---\ntest-requirement: unit\n---\n")).toBe(false);
  });
});

describe("renderImportsAllowed", () => {
  // ----- 正常系 -----
  it("依存を宣言の 1 行へ描き、生成物であることを行に残す", () => {
    expect(renderImportsAllowed(["model", "errors"])).toBe(
      "imports-allowed: [model, errors] # 生成物。`pnpm gen:architecture` で直す",
    );
  });

  it("依存が 1 つの要素も同じ形へ描く", () => {
    expect(renderImportsAllowed(["model"])).toBe(
      "imports-allowed: [model] # 生成物。`pnpm gen:architecture` で直す",
    );
  });

  it("何も import できない要素を空の並びへ描く", () => {
    expect(renderImportsAllowed([])).toBe(
      "imports-allowed: [] # 生成物。`pnpm gen:architecture` で直す",
    );
  });
});

describe("applyImportsAllowed", () => {
  // ----- 正常系 -----
  it("フロー形式の行を要素の依存へ揃える", () => {
    const source = "---\nimports-allowed: [model]\nforbidden: [fetch]\n---\n\n# layer\n";

    expect(applyImportsAllowed(source, ["model", "errors"])).toBe(generated(["model", "errors"]));
  });

  it("既に揃っている README の本文を変えない", () => {
    const source = generated(["errors"]);

    expect(applyImportsAllowed(source, ["errors"])).toBe(source);
  });
  // ----- 異常系 -----
  it("ブロック形式の宣言には当てず、人へ渡す", () => {
    const source = "---\nimports-allowed:\n  - model\n  - errors\nforbidden: []\n---\n";

    expect(applyImportsAllowed(source, ["model", "errors"])).toBeNull();
  });

  it("imports-allowed の行を持たない README へは挿し込まない", () => {
    expect(applyImportsAllowed("---\nforbidden: [fetch]\n---\n", ["model"])).toBeNull();
  });

  it("frontmatter を持たない README へは挿し込まない", () => {
    expect(applyImportsAllowed("# ui scripts\n", ["model"])).toBeNull();
  });
});

describe("findBoundaryDrift", () => {
  // ----- 正常系 -----
  it("生成結果と一致していれば差分を返さない", () => {
    const source = generated(["model", "errors"], "[fetch, config, capabilities]");

    expect(
      findBoundaryDrift(["model", "errors"], source, parseBoundaryFrontmatter(source)),
    ).toEqual([]);
  });

  it("何も import できない要素の空宣言を通す", () => {
    const source = generated([], "[http-vocabulary]");

    expect(findBoundaryDrift([], source, parseBoundaryFrontmatter(source))).toEqual([]);
  });

  it("層名でない禁止語彙を矛盾として扱わない", () => {
    const source = generated(["model", "errors"], "[fetch, business-state]");

    expect(
      findBoundaryDrift(["model", "errors"], source, parseBoundaryFrontmatter(source)),
    ).toEqual([]);
  });
  // ----- 異常系 -----
  it("並び順が生成結果と違う宣言を報告する", () => {
    const source = generated(["errors", "model"]);

    expect(
      findBoundaryDrift(["model", "errors"], source, parseBoundaryFrontmatter(source)),
    ).toEqual([expect.stringContaining("[model, errors]")]);
  });

  it("生成物の印を欠いた行を報告する", () => {
    const source = "---\nimports-allowed: [model, errors]\nforbidden: []\n---\n";

    expect(
      findBoundaryDrift(["model", "errors"], source, parseBoundaryFrontmatter(source)),
    ).toEqual([expect.stringContaining("[model, errors]")]);
  });

  it("要素の依存の欠落を報告する", () => {
    const source = generated(["model"]);

    expect(
      findBoundaryDrift(["model", "errors"], source, parseBoundaryFrontmatter(source)),
    ).toEqual([expect.stringContaining("[model, errors]")]);
  });

  it("ブロック形式の宣言を、生成できない形として報告する", () => {
    const source = "---\nimports-allowed:\n  - model\nforbidden: []\n---\n";

    expect(
      findBoundaryDrift(["model"], source, { "imports-allowed": ["model"], forbidden: [] }),
    ).toEqual([expect.stringContaining("フロー形式")]);
  });

  it("依存のずれと禁止語彙の矛盾を、両方まとめて報告する", () => {
    const source = generated(["model"], "[errors]");
    const drift = findBoundaryDrift(["model", "errors"], source, parseBoundaryFrontmatter(source));

    expect(drift).toEqual([
      expect.stringContaining("[model, errors]"),
      "errors を許可と禁止の両方に挙げています",
    ]);
  });

  it("許可と禁止の両方に挙がった層を報告する", () => {
    const source = generated(["model", "errors"], "[errors]");

    expect(
      findBoundaryDrift(["model", "errors"], source, parseBoundaryFrontmatter(source)),
    ).toEqual(["errors を許可と禁止の両方に挙げています"]);
  });
});
