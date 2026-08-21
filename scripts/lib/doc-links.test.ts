import { describe, expect, it } from "vitest";

import { findBrokenDocLinks, formatBrokenDocLinks } from "./doc-links";

const ROOT = process.cwd();

describe("findBrokenDocLinks", () => {
  // ----- 正常系 -----
  it("実在する文書を指すリンクは拾わない", () => {
    const source = "/** ([0090](../../docs/adr/0090-testing-strategy.md)) */";

    expect(findBrokenDocLinks("scripts/lib/x.ts", source, ROOT)).toEqual([]);
  });

  it("文書を指さないものは見ない", () => {
    const source = '/** [公式](https://example.test/a.md) と ["./x"](x) */';

    expect(findBrokenDocLinks("scripts/lib/x.ts", source, ROOT)).toEqual([]);
  });

  // ----- 異常系 -----
  it("段数が足りない相対パスを、行番号とともに返す", () => {
    // リンクは組み立てて置く。書き下すと、このゲート自身がテスト用の壊れたリンクを拾う。
    const href = `..${"/docs/adr/0090-testing-strategy.md"}`;
    const source = `\n/** ([0090](${href})) */`;

    expect(findBrokenDocLinks("scripts/lib/x.ts", source, ROOT)).toEqual([
      { file: "scripts/lib/x.ts", href, line: 2 },
    ]);
  });

  it("同じ行に複数あればすべて返す", () => {
    const source = `/** [a](..${"/nope-a.md"}) [b](..${"/nope-b.md"}) */`;

    expect(findBrokenDocLinks("scripts/lib/x.ts", source, ROOT)).toHaveLength(2);
  });
});

describe("formatBrokenDocLinks", () => {
  // ----- 正常系 -----
  it("そのまま直せるよう、場所と書かれていたパスを並べる", () => {
    const broken = [{ file: "src/a.ts", href: "../docs/x.md", line: 3 }];

    expect(formatBrokenDocLinks(broken, ROOT)).toBe("src/a.ts:3: ../docs/x.md");
  });

  it("何も無ければ空文字を返す", () => {
    expect(formatBrokenDocLinks([], ROOT)).toBe("");
  });
});
