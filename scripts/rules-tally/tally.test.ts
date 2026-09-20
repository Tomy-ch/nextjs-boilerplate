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

  it("規約の外に書かれた判定を、数えずに violations へ載せる", () => {
    const tally = collectRuleTally(
      ['<a id="x"></a>', "## 節", "導入。散文 —— **寄せられる**。", "- **規約。**"].join("\n"),
    );

    expect(tally.judged).toEqual([]);
    expect(tally.violations).toEqual(["判定が規約の外にある: 「寄せられる」（節）"]);
  });

  it("要旨がその行で閉じていない箇条書きを、規約に数えずに violations へ載せる", () => {
    const tally = collectRuleTally(
      ['<a id="x"></a>', "## 節", "- **規約", "  続き。**"].join("\n"),
    );

    expect(tally.rules).toBe(0);
    expect(tally.violations).toEqual(["規約の要旨がその行で閉じていない: 「- **規約」"]);
  });

  it("節へ対応しない錨を violations へ載せる", () => {
    const tally = collectRuleTally(['<a id="a"></a>', '<a id="b"></a>', "## 節"].join("\n"));

    expect(tally.violations).toEqual(["錨が節へ対応していない: 「a」"]);
  });

  it("見出しが来ないまま文書が終わった錨も violations へ載せる", () => {
    const tally = collectRuleTally(['<a id="x"></a>', "本文だけ"].join("\n"));

    expect(tally.sections).toBe(0);
    expect(tally.violations).toEqual(["錨が節へ対応していない: 「x」"]);
  });

  it("節頭の根拠が 2 つある節を、二重に数えずに violations へ載せる", () => {
    const tally = collectRuleTally(
      [
        '<a id="x"></a>',
        "## 節",
        "> Rationale: [ADR 0020](adr/0020.md); enforced via a。",
        "- **規約。**",
        "> Rationale: [ADR 0021](adr/0021.md); enforced via b。",
      ].join("\n"),
    );

    expect(tally.enforcedSections).toBe(1);
    expect(tally.violations).toEqual(["節頭の根拠が 2 つある: 「節」"]);
  });

  it("`enforced via` を持たない根拠は、節頭の手段に数えない", () => {
    const tally = collectRuleTally(
      ['<a id="x"></a>', "## 節", "> Rationale: [ADR 0020](adr/0020.md); review が見る。"].join(
        "\n",
      ),
    );

    expect(tally.enforcedSections).toBe(0);
    expect(tally.violations).toEqual([]);
  });

  it("1 つの規約が判定を 2 つ述べたら、どちらも数えずに violations へ載せる", () => {
    const tally = collectRuleTally(
      [
        '<a id="x"></a>',
        "## 節",
        "- **規約。** 散文 —— **寄せられる**。散文 —— **寄せられない**。",
      ].join("\n"),
    );

    expect(tally.judged).toEqual([]);
    expect(tally.violations).toEqual(["1 つの規約が判定を 2 つ述べている: 「規約。」"]);
  });

  it("コードフェンスの中の見出しと錨を、節として数えない", () => {
    const tally = collectRuleTally(
      [
        '<a id="x"></a>',
        "## 節",
        "```md",
        '<a id="fake"></a>',
        "## 例として書いた見出し",
        "```",
        "- **規約。** 散文 —— **寄せられる**。",
      ].join("\n"),
    );

    expect(tally.sections).toBe(1);
    expect(tally.judged).toEqual([
      { anchor: "x", section: "節", summary: "規約。", verdict: "寄せられる" },
    ]);
    expect(tally.violations).toEqual([]);
  });
});

describe("renderRuleTally", () => {
  // ----- 正常系 -----

  it("印・件数の表・仕事が残っている一覧を、この並びで組む", () => {
    expect(renderRuleTally(collectRuleTally(DOCUMENT))).toBe(
      [
        "<!-- generated: rules-tally -->",
        "",
        "**節が 2、規約が 4 件。**",
        "うち 1 節が節頭で機械の手段を名乗り、3 件の規約が自分で判定を述べる。",
        "",
        "| 判定 | 件数 |",
        "| --- | --- |",
        "| 寄せられない | 1 |",
        "| 一部寄せられる | 1 |",
        "| 寄せられる | 1 |",
        "",
        "### 仕事が残っている 2 件",
        "",
        "| 節 | 規約 | 判定 |",
        "| --- | --- | --- |",
        "| [フォームと送信](rules.md#forms) | 確認を挟む。 | 寄せられる |",
        "| [フォームと送信](rules.md#forms) | タグは 2 段だけ。 | 一部寄せられる |",
        "",
        "<!-- /generated: rules-tally -->",
      ].join("\n"),
    );
  });

  it("規約の文言に現れたパイプを逃がし、表の列を割らせない", () => {
    const tally = collectRuleTally(
      ['<a id="x"></a>', "## 節", "- **`a|b` を使う。** 散文 —— **寄せられる**。"].join("\n"),
    );

    expect(renderRuleTally(tally)).toContain(
      "| [節](rules.md#x) | `a\\|b` を使う。 | 寄せられる |",
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
