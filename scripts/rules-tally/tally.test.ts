import { describe, expect, it } from "vitest";

import { collectRuleTally, renderRuleTally, replaceGeneratedBlock } from "./tally";

const DOCUMENT = [
  "# 実装規約",
  "",
  "前書き。節の外に居るので数えない。",
  "",
  '<a id="layers"></a>',
  "",
  "## 層境界と依存",
  "",
  "> Rationale: [ADR 0020](adr/0020.md); enforced via ESLint boundaries。",
  "",
  "節の導入。規約の前に居るので数えない。",
  "",
  "- **機械が見ている規約。** 判定を述べない。",
  "- **他の層が握る問題を手当てしない。** 散文 —— **寄せられない**。責務の判断そのもの。",
  "",
  '<a id="forms"></a>',
  "",
  "## フォームと送信",
  "",
  "- **確認を挟む。** 散文 —— **寄せられる**。",
  "  続きの行にも本文がある。",
  "- **タグは 2 段だけ。** 散文 —— **一部寄せられる**。綴りは静的に決まる。",
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
        section: "層境界と依存",
        summary: "他の層が握る問題を手当てしない。",
        verdict: "寄せられない",
      },
      {
        anchor: "forms",
        section: "フォームと送信",
        summary: "確認を挟む。",
        verdict: "寄せられる",
      },
      {
        anchor: "forms",
        section: "フォームと送信",
        summary: "タグは 2 段だけ。",
        verdict: "一部寄せられる",
      },
    ]);
  });

  it("規約が複数行にまたがっても、続きの行の判定を拾う", () => {
    const tally = collectRuleTally(
      ['<a id="x"></a>', "## 節", "- **規約。**", "  散文 —— **寄せられる**。"].join("\n"),
    );

    expect(tally.judged).toEqual([
      { anchor: "x", section: "節", summary: "規約。", verdict: "寄せられる" },
    ]);
  });

  it("数えられたときは violations が空になる", () => {
    expect(collectRuleTally(DOCUMENT).violations).toEqual([]);
  });

  // ----- 異常系 -----

  it("錨を持たない節を violations へ載せ、その節の規約の錨を空にする", () => {
    const tally = collectRuleTally(
      ["## 錨なし", "- **規約。** 散文 —— **寄せられる**。"].join("\n"),
    );

    expect(tally.violations).toEqual(["節が錨を持たない: 「錨なし」"]);
    expect(tally.judged[0]?.anchor).toBe("");
  });

  it("錨が重複した節を violations へ載せる", () => {
    const tally = collectRuleTally(
      ['<a id="dup"></a>', "## 一つ目", '<a id="dup"></a>', "## 二つ目"].join("\n"),
    );

    expect(tally.violations).toEqual(["錨が重複している: 「dup」"]);
  });

  it("3 語の外の判定を数えず、violations へ載せる", () => {
    const tally = collectRuleTally(
      ['<a id="x"></a>', "## 節", "- **規約。** 散文 —— **寄せられていない**。"].join("\n"),
    );

    expect(tally.judged).toEqual([]);
    expect(tally.violations).toEqual(["判定の綴りが 3 語の外: 「寄せられていない」（規約。）"]);
  });
});

describe("renderRuleTally", () => {
  // ----- 正常系 -----

  it("件数の表と、仕事が残っている規約の一覧を組む", () => {
    const block = renderRuleTally(collectRuleTally(DOCUMENT));

    expect(block).toContain("**節が 2、規約が 4 件。**");
    expect(block).toContain("| 寄せられない | 1 |");
    expect(block).toContain("| 一部寄せられる | 1 |");
    expect(block).toContain("### 仕事が残っている 2 件");
    expect(block).toContain("| [フォームと送信](rules.md#forms) | 確認を挟む。 | 寄せられる |");
  });

  it("寄せられない規約は、仕事が残っている一覧に載せない", () => {
    expect(renderRuleTally(collectRuleTally(DOCUMENT))).not.toContain(
      "| [層境界と依存](rules.md#layers) |",
    );
  });

  // ----- 異常系 -----

  it("数えられなかったものが在るときは、件数を出さずに落ちる", () => {
    const tally = collectRuleTally("## 錨なし");

    expect(() => renderRuleTally(tally)).toThrow("節が錨を持たない: 「錨なし」");
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
