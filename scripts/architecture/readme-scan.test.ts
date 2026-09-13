import { describe, expect, it } from "vitest";

import {
  classifyReadmes,
  decideOutcome,
  formatDrift,
  planImportsAllowedWrites,
  scanAction,
} from "./readme-scan";

/**
 * 境界を宣言した README を、生成後の姿で組む。
 *
 * @remarks
 * 整形を production の口へ委ねず、**リテラルで書く**（`scripts/lib/coverage-exclusion.test.ts` の
 * `recording` と同じ形）。委ねると整形が壊れたときに期待値も同じ形で壊れ、突き合わせが成立しない。
 */
function declaring(importsAllowed: string, forbidden = "[fetch]"): string {
  return `---\nimports-allowed: ${importsAllowed} # 生成物。\`pnpm gen:architecture\` で直す\nforbidden: ${forbidden}\n---\n\n# layer\n`;
}

/** 境界を宣言しない README。 */
const SILENT = "---\ntest-requirement: unit\n---\n\n# module\n";

describe("scanAction", () => {
  // ----- 正常系 -----
  it("ディレクトリを辿る", () => {
    expect(scanAction({ name: "server", isDirectory: true, isSymbolicLink: false })).toBe(
      "recurse",
    );
  });

  it("README.md を集める", () => {
    expect(scanAction({ name: "README.md", isDirectory: false, isSymbolicLink: false })).toBe(
      "collect",
    );
  });

  // ----- 異常系 -----
  it("README.md でないファイルを見送る", () => {
    expect(scanAction({ name: "index.ts", isDirectory: false, isSymbolicLink: false })).toBe(
      "skip",
    );
  });

  it("README.md という名前のシンボリックリンクを集めない", () => {
    expect(scanAction({ name: "README.md", isDirectory: false, isSymbolicLink: true })).toBe(
      "skip",
    );
  });

  it("ディレクトリを指すシンボリックリンクを辿らない", () => {
    expect(scanAction({ name: "server", isDirectory: true, isSymbolicLink: true })).toBe("skip");
  });
});

describe("classifyReadmes", () => {
  // ----- 正常系 -----
  it("要素の根で宣言している README を、その要素の依存とともに拾う", () => {
    const { declared, failures } = classifyReadmes([
      { path: "src/components/README.md", source: declaring("[model, errors]") },
    ]);

    expect(failures).toEqual([]);
    expect(declared).toHaveLength(1);
    expect(declared[0]?.site).toEqual({ type: "components", dependencies: ["model", "errors"] });
  });

  it("要素の根でなく宣言も持たない README を、どちらにも入れない", () => {
    expect(
      classifyReadmes([{ path: "src/adapters/server/http/README.md", source: SILENT }]),
    ).toEqual({ declared: [], failures: [] });
  });

  // ----- 異常系 -----
  it("要素の根でないのに宣言している README を失敗に挙げる", () => {
    const { declared, failures } = classifyReadmes([
      { path: "src/app/api/README.md", source: declaring("[model]") },
    ]);

    expect(declared).toEqual([]);
    expect(failures).toEqual([
      expect.stringContaining("要素の根ではないので境界を宣言できません"),
    ]);
  });

  it("要素の根なのに宣言していない README を失敗に挙げる", () => {
    const { failures } = classifyReadmes([{ path: "src/errors/README.md", source: SILENT }]);

    expect(failures).toEqual([expect.stringContaining("要素 errors の根なので")]);
  });

  it("frontmatter が読めない README を失敗に挙げ、宣言としては拾わない", () => {
    const { declared, failures } = classifyReadmes([
      { path: "src/errors/README.md", source: "---\nimports-allowed: model\nforbidden: []\n---\n" },
    ]);

    expect(declared).toEqual([]);
    expect(failures).toHaveLength(1);
  });
});

describe("formatDrift", () => {
  // ----- 正常系 -----
  it("宣言が要素の依存と一致していれば何も挙げない", () => {
    const { declared } = classifyReadmes([
      { path: "src/components/README.md", source: declaring("[model, errors]") },
    ]);

    expect(formatDrift(declared)).toEqual([]);
  });

  // ----- 異常系 -----
  it("食い違いに README のパスを前置して挙げる", () => {
    const { declared } = classifyReadmes([
      { path: "src/components/README.md", source: declaring("[model]") },
    ]);

    expect(formatDrift(declared)).toEqual([
      expect.stringContaining("src/components/README.md: imports-allowed"),
    ]);
  });
});

describe("planImportsAllowedWrites", () => {
  // ----- 正常系 -----
  it("要素の依存とずれている README の本文を組む", () => {
    const { declared } = classifyReadmes([
      { path: "src/components/README.md", source: declaring("[model]") },
    ]);

    expect(planImportsAllowedWrites(declared)).toEqual([
      { path: "src/components/README.md", content: declaring("[model, errors]") },
    ]);
  });

  it("既に揃っている README を組まない", () => {
    const { declared } = classifyReadmes([
      { path: "src/components/README.md", source: declaring("[model, errors]") },
    ]);

    expect(planImportsAllowedWrites(declared)).toEqual([]);
  });

  // ----- 異常系 -----
  it("フロー形式の行を持たない README を組まない", () => {
    const { declared } = classifyReadmes([
      {
        path: "src/components/README.md",
        source: "---\nimports-allowed:\n  - model\nforbidden: [fetch]\n---\n",
      },
    ]);

    expect(planImportsAllowedWrites(declared)).toEqual([]);
  });
});

describe("decideOutcome", () => {
  // ----- 正常系 -----
  it("宣言が揃っていれば通す", () => {
    const sources = [{ path: "src/components/README.md", source: declaring("[model, errors]") }];

    expect(decideOutcome(sources, [], "check")).toEqual({ kind: "passed" });
  });

  it("write ではずれている分の書き込みを組む", () => {
    const sources = [{ path: "src/components/README.md", source: declaring("[model]") }];

    expect(decideOutcome(sources, [], "write")).toEqual({
      kind: "written",
      writes: [{ path: "src/components/README.md", content: declaring("[model, errors]") }],
    });
  });

  // ----- 異常系 -----
  it("カーネル README の欠落を失敗として返す", () => {
    expect(decideOutcome([], ["src/errors/README.md がありません"], "check")).toEqual({
      kind: "failed",
      messages: ["src/errors/README.md がありません"],
    });
  });

  it("check では食い違いを失敗として返す", () => {
    const sources = [{ path: "src/components/README.md", source: declaring("[model]") }];

    expect(decideOutcome(sources, [], "check").kind).toBe("failed");
  });

  it("write では、生成が直せない食い違いを 0 件成功にせず失敗として返す", () => {
    const sources = [
      {
        path: "src/components/README.md",
        source: "---\nimports-allowed:\n  - model\nforbidden: [fetch]\n---\n",
      },
    ];

    expect(decideOutcome(sources, [], "write")).toEqual({
      kind: "failed",
      messages: [expect.stringContaining("フロー形式")],
    });
  });

  it("置き場の誤りがあるとき、write でも書き込みを 1 件も返さない", () => {
    const sources = [
      // 書き換えれば揃う README。これだけなら write は 1 件を組む
      { path: "src/components/README.md", source: declaring("[model]") },
      // 置き場の誤り。これがあるあいだは上も書かせない
      { path: "src/app/api/README.md", source: declaring("[model]") },
    ];

    expect(decideOutcome(sources, [], "write")).toEqual({
      kind: "failed",
      messages: [expect.stringContaining("src/app/api/README.md")],
    });
  });
});
