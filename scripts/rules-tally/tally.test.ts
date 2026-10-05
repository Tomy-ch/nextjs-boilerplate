import { describe, expect, it } from "vitest";

import { collectRuleTally, renderRuleTally, replaceGeneratedBlock } from "./tally";

const DOCUMENT = [
  "# Implementation Rules",
  "",
  "Preamble. Outside any section, so not counted.",
  "",
  '<a id="layers"></a>',
  "",
  "## Layer Boundaries",
  "",
  "> Rationale: [ADR 0020](adr/0020.md); enforced via ESLint boundaries.",
  "",
  "Section intro. Before any rule, so not counted.",
  "",
  "- **A rule a machine watches.** States no verdict.",
  "- **Do not handle what another layer owns.** Prose — **not mechanizable**. A judgment of responsibility.",
  "",
  '<a id="forms"></a>',
  "",
  "## Forms",
  "",
  "- **Ask for confirmation.** Prose — **mechanizable**.",
  "  The body continues on the next line.",
  "- **Tags have two levels only.** Prose — **partly mechanizable**. The spelling is static.",
].join("\n");

describe("collectRuleTally", () => {
  // ----- 正常系 -----

  it("節と規約を数え、節頭が機械の手段を名乗った節だけを別に数える", () => {
    const tally = collectRuleTally(DOCUMENT);

    expect(tally.sections).toBe(2);
    expect(tally.rules).toBe(4);
    expect(tally.enforcedSections).toBe(1);
  });

  it("判定を述べた規約を、属する節の錨とともに拾う", () => {
    expect(collectRuleTally(DOCUMENT).judged).toEqual([
      {
        anchor: "layers",
        section: "Layer Boundaries",
        summary: "Do not handle what another layer owns.",
        verdict: "not mechanizable",
      },
      {
        anchor: "forms",
        section: "Forms",
        summary: "Ask for confirmation.",
        verdict: "mechanizable",
      },
      {
        anchor: "forms",
        section: "Forms",
        summary: "Tags have two levels only.",
        verdict: "partly mechanizable",
      },
    ]);
  });

  it("規約が複数行にまたがっても、続きの行の判定を拾う", () => {
    const tally = collectRuleTally(
      ['<a id="x"></a>', "## Section", "- **Rule.**", "  Prose — **mechanizable**."].join("\n"),
    );

    expect(tally.judged).toEqual([
      { anchor: "x", section: "Section", summary: "Rule.", verdict: "mechanizable" },
    ]);
  });

  it("数えられたときは violations が空になる", () => {
    expect(collectRuleTally(DOCUMENT).violations).toEqual([]);
  });

  // ----- 異常系 -----

  it("錨を持たない節を violations へ載せ、その節の規約の錨を空にする", () => {
    const tally = collectRuleTally(
      ["## No Anchor", "- **Rule.** Prose — **mechanizable**."].join("\n"),
    );

    expect(tally.violations).toEqual(["節が錨を持たない: 「No Anchor」"]);
    expect(tally.judged[0]?.anchor).toBe("");
  });

  it("錨が重複した節を violations へ載せる", () => {
    const tally = collectRuleTally(
      ['<a id="dup"></a>', "## First", '<a id="dup"></a>', "## Second"].join("\n"),
    );

    expect(tally.violations).toEqual(["錨が重複している: 「dup」"]);
  });

  it("3 語の外の判定を数えず、violations へ載せる", () => {
    const tally = collectRuleTally(
      ['<a id="x"></a>', "## Section", "- **Rule.** Prose — **not yet mechanizable**."].join("\n"),
    );

    expect(tally.judged).toEqual([]);
    expect(tally.violations).toEqual(["判定の綴りが 3 語の外: 「not yet mechanizable」（Rule.）"]);
  });

  it("規約の外に書かれた判定を、数えずに violations へ載せる", () => {
    const tally = collectRuleTally(
      ['<a id="x"></a>', "## Section", "Intro. Prose — **mechanizable**.", "- **Rule.**"].join(
        "\n",
      ),
    );

    expect(tally.judged).toEqual([]);
    expect(tally.violations).toEqual(["判定が規約の外にある: 「mechanizable」（Section）"]);
  });

  it("要旨がその行で閉じていない箇条書きを、規約に数えずに violations へ載せる", () => {
    const tally = collectRuleTally(
      ['<a id="x"></a>', "## Section", "- **Rule", "  continued.**"].join("\n"),
    );

    expect(tally.rules).toBe(0);
    expect(tally.violations).toEqual(["規約の要旨がその行で閉じていない: 「- **Rule」"]);
  });

  it("節へ対応しない錨を violations へ載せる", () => {
    const tally = collectRuleTally(['<a id="a"></a>', '<a id="b"></a>', "## Section"].join("\n"));

    expect(tally.violations).toEqual(["錨が節へ対応していない: 「a」"]);
  });

  it("見出しが来ないまま文書が終わった錨も violations へ載せる", () => {
    const tally = collectRuleTally(['<a id="x"></a>', "Body only."].join("\n"));

    expect(tally.sections).toBe(0);
    expect(tally.violations).toEqual(["錨が節へ対応していない: 「x」"]);
  });

  it("節頭の根拠が 2 つある節を、二重に数えずに violations へ載せる", () => {
    const tally = collectRuleTally(
      [
        '<a id="x"></a>',
        "## Section",
        "> Rationale: [ADR 0020](adr/0020.md); enforced via a.",
        "- **Rule.**",
        "> Rationale: [ADR 0021](adr/0021.md); enforced via b.",
      ].join("\n"),
    );

    expect(tally.enforcedSections).toBe(1);
    expect(tally.violations).toEqual(["節頭の根拠が 2 つある: 「Section」"]);
  });

  it("`enforced via` を持たない根拠は、節頭の手段に数えない", () => {
    const tally = collectRuleTally(
      [
        '<a id="x"></a>',
        "## Section",
        "> Rationale: [ADR 0020](adr/0020.md); review watches it.",
      ].join("\n"),
    );

    expect(tally.enforcedSections).toBe(0);
    expect(tally.violations).toEqual([]);
  });

  it("1 つの規約が判定を 2 つ述べたら、どちらも数えずに violations へ載せる", () => {
    const tally = collectRuleTally(
      [
        '<a id="x"></a>',
        "## Section",
        "- **Rule.** Prose — **mechanizable**. Prose — **not mechanizable**.",
      ].join("\n"),
    );

    expect(tally.judged).toEqual([]);
    expect(tally.violations).toEqual(["1 つの規約が判定を 2 つ述べている: 「Rule.」"]);
  });

  it("コードフェンスの中の見出しと錨を、節として数えない", () => {
    const tally = collectRuleTally(
      [
        '<a id="x"></a>',
        "## Section",
        "```md",
        '<a id="fake"></a>',
        "## A heading written as an example",
        "```",
        "- **Rule.** Prose — **mechanizable**.",
      ].join("\n"),
    );

    expect(tally.sections).toBe(1);
    expect(tally.judged).toEqual([
      { anchor: "x", section: "Section", summary: "Rule.", verdict: "mechanizable" },
    ]);
    expect(tally.violations).toEqual([]);
  });
});

describe("renderRuleTally", () => {
  // ----- 正常系 -----

  it("印・件数の表・仕事が残っている一覧を、canonical へ貼る英語でこの並びに組む", () => {
    expect(renderRuleTally(collectRuleTally(DOCUMENT), "en")).toBe(
      [
        "<!-- generated: rules-tally -->",
        "",
        "**2 sections, 4 rules.**",
        "Of these, 1 sections name a mechanical means in their header, and 3 rules state their own verdict.",
        "",
        "| Verdict | Count |",
        "| --- | --- |",
        "| not mechanizable | 1 |",
        "| partly mechanizable | 1 |",
        "| mechanizable | 1 |",
        "",
        "### 2 rules with work remaining",
        "",
        "| Section | Rule | Verdict |",
        "| --- | --- | --- |",
        "| [Forms](rules.md#forms) | Ask for confirmation. | mechanizable |",
        "| [Forms](rules.md#forms) | Tags have two levels only. | partly mechanizable |",
        "",
        "<!-- /generated: rules-tally -->",
      ].join("\n"),
    );
  });

  it("同じ集計を、ミラーへ貼る日本語で組み、リンクをミラーの実装規約へ向ける", () => {
    expect(renderRuleTally(collectRuleTally(DOCUMENT), "ja")).toBe(
      [
        "<!-- generated: rules-tally -->",
        "",
        "**セクションが 2、規約が 4 件。**",
        "うち 1 セクションがセクション冒頭で機械の手段を名乗り、3 件の規約が自分で判定を述べる。",
        "",
        "| 判定 | 件数 |",
        "| --- | --- |",
        "| 寄せられない | 1 |",
        "| 一部寄せられる | 1 |",
        "| 寄せられる | 1 |",
        "",
        "### 仕事が残っている 2 件",
        "",
        "| セクション | 規約 | 判定 |",
        "| --- | --- | --- |",
        "| [Forms](rules.ja.md#forms) | Ask for confirmation. | 寄せられる |",
        "| [Forms](rules.ja.md#forms) | Tags have two levels only. | 一部寄せられる |",
        "",
        "<!-- /generated: rules-tally -->",
      ].join("\n"),
    );
  });

  it("規約の文言に現れたパイプを逃がし、表の列を割らせない", () => {
    const tally = collectRuleTally(
      ['<a id="x"></a>', "## Section", "- **Use `a|b`.** Prose — **mechanizable**."].join("\n"),
    );

    expect(renderRuleTally(tally, "en")).toContain(
      "| [Section](rules.md#x) | Use `a\\|b`. | mechanizable |",
    );
  });

  // ----- 異常系 -----

  it("数えられなかったものが在るときは、件数を出さずに落ちる", () => {
    const tally = collectRuleTally("## No Anchor");

    expect(() => renderRuleTally(tally, "en")).toThrow("節が錨を持たない: 「No Anchor」");
  });
});

describe("replaceGeneratedBlock", () => {
  // ----- 正常系 -----

  it("印に挟まれた範囲だけを差し替える", () => {
    const document = [
      "# 台帳",
      "前書き。",
      "<!-- generated: rules-tally -->",
      "古い集計。",
      "<!-- /generated: rules-tally -->",
      "後書き。",
    ].join("\n");

    expect(replaceGeneratedBlock(document, "新しい集計。")).toBe(
      ["# 台帳", "前書き。", "新しい集計。", "後書き。"].join("\n"),
    );
  });

  // ----- 異常系 -----

  it("印を持たない文書は、黙って素通りさせずに落とす", () => {
    expect(() => replaceGeneratedBlock("# 台帳", "新しい集計。")).toThrow(
      "貼り付け先が rules-tally の印を持ちません。",
    );
  });
});
