import { describe, expect, it } from "vitest";

import { findPremises, survivingText } from "./scan";

describe("survivingText", () => {
  // ----- 正常系 -----
  it("サンプルの区画を落とす", () => {
    const text = [
      "残る行",
      "<!-- sample:begin -->",
      "同梱のサンプルが加えるもの",
      "<!-- sample:end -->",
    ].join("\n");

    expect(survivingText(text)).not.toContain("同梱のサンプル");
    expect(survivingText(text)).toContain("残る行");
  });

  // boilerplate-only:begin
  // 剥がしの後の `MARKERS` は sample だけになる。この検査ごと消えるのが正しい姿なので、
  // 入力のマーカーではなく、この it を丸ごと囲んでいる。
  it("boilerplate 限定の区画も落とす", () => {
    const text = [
      "残る行",
      "<!-- boilerplate-only:begin -->",
      "順次同梱する",
      "<!-- boilerplate-only:end -->",
    ].join("\n");

    expect(survivingText(text)).not.toContain("順次同梱");
  });
  // boilerplate-only:end

  it("差し替えマーカーの退避側を、剥がした後の本文として読む", () => {
    const text = [
      "<!-- sample:replace-begin -->",
      "同梱のサンプルの説明",
      "<!-- sample:replace-with -->",
      "<!-- = 抽象的な説明 -->",
      "<!-- sample:replace-end -->",
    ].join("\n");

    expect(survivingText(text)).toContain("抽象的な説明");
    expect(survivingText(text)).not.toContain("同梱のサンプル");
  });

  // ----- 異常系 -----
  it("対応の取れないマーカーは、囲われていない扱いで読む", () => {
    const text = ["<!-- sample:begin -->", "同梱のサンプル"].join("\n");

    expect(survivingText(text)).toContain("同梱のサンプル");
  });
});

describe("findPremises", () => {
  // ----- 正常系 -----
  it("前提の綴りを、形と理由つきで挙げる", () => {
    const found = findPremises("後続のリリースで順次同梱する", "docs/adr/x.md");

    expect(found.map((premise) => premise.phrase)).toEqual(["順次同梱", "後続のリリース"]);
    expect(found[0]?.shape).toBe("整備が途中であること");
    expect(found[0]?.file).toBe("docs/adr/x.md");
    expect(found[0]?.text).toBe("後続のリリースで順次同梱する");
  });

  it("文頭で大文字になった英語の対訳も、綴りの大小を問わず挙げる", () => {
    const found = findPremises("This boilerplate ships a sample.", "docs/adr/x.md");

    expect(found.map((premise) => premise.phrase)).toEqual(["this boilerplate"]);
    expect(found[0]?.text).toBe("This boilerplate ships a sample.");
  });

  it("英語の対訳に語の末尾が続いても（複数形）、前提として挙げる", () => {
    const found = findPremises("It removes the bundled samples.", "docs/adr/x.md");

    expect(found.map((premise) => premise.phrase)).toEqual(["bundled sample"]);
  });

  it("語の途中に埋まった出現の後ろに、語の頭からの出現があれば挙げる", () => {
    const found = findPremises("An unbundled sample beside a bundled sample.", "docs/adr/x.md");

    expect(found.map((premise) => premise.phrase)).toEqual(["bundled sample"]);
  });

  // ----- 異常系 -----
  it("英語の対訳が別の語の途中に埋まっているだけなら挙げない", () => {
    expect(findPremises("It ships an unbundled sample.", "docs/adr/x.md")).toEqual([]);
  });

  it("日本語の側に並ぶ ASCII の綴りは、大小が違えば挙げない", () => {
    expect(findPremises("a backlog nobody reads", "docs/adr/x.md")).toEqual([]);
  });

  it("マーカーで囲われた前提を挙げない", () => {
    const text = [
      "<!-- sample:begin -->",
      "同梱のサンプルが加えるもの",
      "<!-- sample:end -->",
    ].join("\n");

    expect(findPremises(text, "src/features/README.md")).toEqual([]);
  });

  it("前提が無ければ空にする", () => {
    expect(findPremises("決定として書かれた本文", "docs/adr/x.md")).toEqual([]);
  });
});
