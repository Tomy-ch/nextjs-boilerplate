import { describe, expect, it } from "vitest";

import { collectAnchors, hasAnchor, toAnchor } from "./markdown-anchor";

describe("toAnchor", () => {
  // ----- 正常系 -----
  it("小文字にし、空白をハイフンにする", () => {
    expect(toAnchor("Storybook の表示規約")).toBe("storybook-の表示規約");
  });

  it("記号を落とす", () => {
    expect(toAnchor("`cn()` の使い方")).toBe("cn-の使い方");
  });

  it("インラインリンクは表示文字だけを残す", () => {
    expect(toAnchor("[0021](../adr/0021.md) の分担")).toBe("0021-の分担");
  });

  it("HTML タグを落とす", () => {
    expect(toAnchor("<em>強調</em>した見出し")).toBe("強調した見出し");
  });

  // ----- 異常系 -----
  it("記号だけの見出しは空文字になる", () => {
    expect(toAnchor("!!!")).toBe("");
  });
});

describe("collectAnchors", () => {
  // ----- 正常系 -----
  it("見出しの段を問わず集める", () => {
    expect(collectAnchors("# 表題\n\n### 小見出し\n")).toEqual(new Set(["表題", "小見出し"]));
  });

  it("同じ見出しの 2 つ目以降に連番を付ける", () => {
    expect(collectAnchors("## 置き場\n\n## 置き場\n\n## 置き場\n")).toEqual(
      new Set(["置き場", "置き場-1", "置き場-2"]),
    );
  });

  it("末尾の閉じハッシュは見出しの一部として数えない", () => {
    expect(collectAnchors("## 表題 ##\n")).toEqual(new Set(["表題"]));
  });

  it("文書が自分で綴りを決めた錨を、見出しと並べて集める", () => {
    expect(collectAnchors('<a id="layers"></a>\n\n## 層境界と依存\n')).toEqual(
      new Set(["layers", "層境界と依存"]),
    );
  });

  it("錨の綴りを小文字へ揃える", () => {
    expect(collectAnchors('<a id="Layers"></a>\n')).toEqual(new Set(["layers"]));
  });

  it("同じ行に錨が 2 つあっても両方集める", () => {
    expect(collectAnchors('<a id="a"></a><a id="b"></a>\n')).toEqual(new Set(["a", "b"]));
  });

  // ----- 異常系 -----
  it("コードフェンスの中の `#` は見出しではない", () => {
    expect(collectAnchors("# 表題\n\n```md\n## 例の節\n```\n")).toEqual(new Set(["表題"]));
  });

  it("コードフェンスの中の錨は、例示であって錨ではない", () => {
    expect(collectAnchors('# 表題\n\n```md\n<a id="例の錨"></a>\n```\n')).toEqual(
      new Set(["表題"]),
    );
  });

  it("`id` を持たない `a` は錨にならない", () => {
    expect(collectAnchors('<a name="layers"></a>\n')).toEqual(new Set());
  });

  it("先頭に BOM があっても 1 行目の見出しを拾う", () => {
    expect(collectAnchors("\uFEFF# 表題\n")).toEqual(new Set(["表題"]));
  });

  it("見出しでない行は数えない", () => {
    expect(collectAnchors("本文\n#見出しに見えるが空白が無い\n")).toEqual(new Set());
  });
});

describe("hasAnchor", () => {
  // ----- 正常系 -----
  it("持っている見出しを引く", () => {
    expect(hasAnchor("## 置き場\n", "置き場")).toBe(true);
  });

  it("URL エンコードされた綴りも解く", () => {
    expect(hasAnchor("## 置き場\n", encodeURIComponent("置き場"))).toBe(true);
  });

  // ----- 異常系 -----
  it("持っていない見出しは false", () => {
    expect(hasAnchor("## 置き場\n", "無い節")).toBe(false);
  });

  it("解けないエスケープでも例外にせず、判定を返す", () => {
    // 1 本の書き損じで走査そのものが止まると、同じ実行の他の指摘が一つも出なくなる。
    expect(hasAnchor("## 置き場\n", "%")).toBe(false);
    expect(hasAnchor("## 置き場\n", "%zz")).toBe(false);
  });
});
