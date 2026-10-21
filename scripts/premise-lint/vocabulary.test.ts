import { describe, expect, it } from "vitest";

import { PREMISE_SHAPES, UNCHECKED_SHAPES } from "./vocabulary";

describe("PREMISE_SHAPES", () => {
  // ----- 正常系 -----
  it("形ごとに、なぜ前提なのかを持つ", () => {
    for (const shape of PREMISE_SHAPES) {
      expect(shape.why).not.toBe("");
      expect(shape.phrases.length).toBeGreaterThan(0);
    }
  });

  it("英語の綴りを、日本語の綴りの 1 対 1 の対訳として持つ", () => {
    const pairs = Object.fromEntries(
      PREMISE_SHAPES.flatMap((shape) => shape.pairs.map((pair) => [pair.ja, pair.en])),
    );

    expect(pairs).toEqual({
      同梱のサンプル: ["bundled sample"],
      同梱されたサンプル: ["bundled sample"],
      サンプルを同梱: [
        "bundles the sample",
        "bundles a sample",
        "bundle the sample",
        "bundle a sample",
      ],
      サンプルが同梱: ["sample is bundled"],
      サンプル破棄まで: ["until the sample purge"],
      破棄するまでは: ["until it is purged"],
      未整備: ["not yet in place"],
      整備中: ["under construction"],
      これから整備: ["yet to be set up"],
      順次同梱: ["bundled incrementally"],
      順次追加: ["added incrementally"],
      後続のリリース: ["a later release"],
      今後追加: ["to be added"],
      仮置き: ["placed provisionally", "provisionally placed"],
      設置面が無い: ["no installation surface"],
      設置面が存在しない: ["installation surface does not exist"],
      設置面が実在: ["installation surface exists"],
      設置面が現れ: ["installation surface appears"],
      本体に現れたとき: ["when it appears in the core"],
      本体に現れるまで: ["until it appears in the core"],
      実例を本体は持たない: ["the core has no instance"],
      作った側: ["the creating side"],
      配る側: ["the distributing side"],
      テンプレートから作った: ["created from the template"],
      テンプレートから作られた: ["made from the template"],
      ボイラープレート: [],
      "本 boilerplate": ["this boilerplate"],
      "この boilerplate": ["this boilerplate"],
      "boilerplate 本体": ["the boilerplate itself"],
      " boilerplate が": [],
      " boilerplate は": [],
      "boilerplate 限定": [],
      "docs/plan": [],
      BACKLOG: [],
      "v1 実装計画": ["v1 implementation plan"],
      "triage #": [],
    });
  });

  it("走査する綴りは、日本語と英語の対訳を重複なしに並べたもの", () => {
    for (const shape of PREMISE_SHAPES) {
      const expected = new Set(shape.pairs.flatMap((pair) => [pair.ja, ...pair.en]));

      expect(shape.phrases).toEqual([...expected]);
    }
  });

  // ----- 異常系 -----
  it("同じ綴りを 2 つの形に持たない", () => {
    const all = PREMISE_SHAPES.flatMap((shape) => shape.phrases);

    expect(new Set(all).size).toBe(all.length);
  });

  it("判断の要る言い回しを綴りにしない", () => {
    const all = PREMISE_SHAPES.flatMap((shape) => shape.phrases);

    for (const loose of [
      "現時点",
      "まだ",
      "いまは",
      "暫定",
      "not yet",
      "placeholder",
      "provisional",
      "boilerplate",
    ]) {
      expect(all).not.toContain(loose);
    }
  });
});

describe("UNCHECKED_SHAPES", () => {
  // ----- 正常系 -----
  it("検査していない形を、空にしない", () => {
    expect(UNCHECKED_SHAPES.length).toBeGreaterThan(0);
  });
});
