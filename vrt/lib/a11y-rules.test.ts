import { describe, expect, it } from "vitest";

import {
  CONFORMANCE_TAGS,
  DEFAULT_OFF_RULES,
  DISABLED_RULES,
  disabledRuleIds,
  STORY_DISABLED_RULES,
} from "./a11y-rules";

describe("CONFORMANCE_TAGS", () => {
  // ----- 正常系 -----
  it("適合目標の水準を挙げる", () => {
    expect(CONFORMANCE_TAGS).toContain("wcag2aa");
  });

  it("目標より上の水準を含めない", () => {
    expect(CONFORMANCE_TAGS.filter((tag) => tag.endsWith("aaa"))).toEqual([]);
  });

  it("適合水準として意味を持たないタグを含めない", () => {
    expect(CONFORMANCE_TAGS.filter((tag) => !tag.startsWith("wcag"))).toEqual([]);
  });
});

describe("DEFAULT_OFF_RULES", () => {
  // ----- 正常系 -----
  it("打ち消したルールが axe へ渡る", () => {
    for (const rule of DEFAULT_OFF_RULES) {
      expect(disabledRuleIds()).toContain(rule.id);
    }
  });

  it("理由と撤去条件を持つ", () => {
    for (const rule of DEFAULT_OFF_RULES) {
      expect(rule.reason).not.toBe("");
      expect(rule.removeWhen).not.toBe("");
    }
  });
});

describe("DISABLED_RULES", () => {
  // ----- 正常系 -----
  it("すべての宣言が理由と撤去条件を持つ", () => {
    const incomplete = DISABLED_RULES.filter(
      (rule) => rule.reason.trim() === "" || rule.removeWhen.trim() === "",
    );

    expect(incomplete.map((rule) => rule.id)).toEqual([]);
  });

  it("同じルールを二重に宣言していない", () => {
    const ids = DISABLED_RULES.map((rule) => rule.id);

    expect(ids).toEqual([...new Set(ids)]);
  });

  // ----- 異常系 -----
  it("無効化が増え続けないよう、宣言の数を目に見える形に保つ", () => {
    // 増やすときはこの数を更新する。更新が要ること自体が、無効化を足した事実を差分へ出す。
    expect(DISABLED_RULES).toHaveLength(0);
  });

  it("色コントラストを無効にしない（実ブラウザで撮るために相乗りしている）", () => {
    expect(DISABLED_RULES.map((rule) => rule.id)).not.toContain("color-contrast");
  });
});

describe("STORY_DISABLED_RULES", () => {
  // ----- 正常系 -----
  it("すべての宣言が理由と撤去条件と対象 story を持つ", () => {
    const incomplete = STORY_DISABLED_RULES.filter(
      (rule) =>
        rule.reason.trim() === "" || rule.removeWhen.trim() === "" || rule.stories.length === 0,
    );

    expect(incomplete.map((rule) => rule.id)).toEqual([]);
  });

  it("同じ story で同じルールを二重に宣言していない", () => {
    const pairs = STORY_DISABLED_RULES.flatMap((rule) =>
      rule.stories.map((story) => `${story}:${rule.id}`),
    );

    expect(pairs).toEqual([...new Set(pairs)]);
  });

  // ----- 異常系 -----
  it("名指しの無効化が増え続けないよう、対象 story の数を目に見える形に保つ", () => {
    // 増やすときはこの数を更新する。更新が要ること自体が、無効化を足した事実を差分へ出す。
    // sample:replace-begin
    expect(STORY_DISABLED_RULES.flatMap((rule) => rule.stories)).toHaveLength(13);
    // sample:replace-with
    // = expect(STORY_DISABLED_RULES.flatMap((rule) => rule.stories)).toHaveLength(11);
    // sample:replace-end
  });
});

describe("disabledRuleIds", () => {
  // ----- 正常系 -----
  it("宣言から id だけを取り出す", () => {
    expect(
      disabledRuleIds(undefined, [{ id: "region", reason: "理由", removeWhen: "条件" }]),
    ).toEqual(["region"]);
  });

  it("名指しされた story では、その story の宣言も併せて外す", () => {
    const storyRules = [
      { id: "aria-hidden-focus", reason: "理由", removeWhen: "条件", stories: ["a--open"] },
    ];

    expect(disabledRuleIds("a--open", [], storyRules)).toEqual(["aria-hidden-focus"]);
  });

  it("名指しされていない story では、その宣言を外さない", () => {
    const storyRules = [
      { id: "aria-hidden-focus", reason: "理由", removeWhen: "条件", stories: ["a--open"] },
    ];

    expect(disabledRuleIds("b--open", [], storyRules)).toEqual([]);
  });

  it("全体と名指しで同じルールが重なっても一度しか渡さない", () => {
    const rules = [{ id: "region", reason: "理由", removeWhen: "条件" }];
    const storyRules = [{ id: "region", reason: "理由", removeWhen: "条件", stories: ["a--open"] }];

    expect(disabledRuleIds("a--open", rules, storyRules)).toEqual(["region"]);
  });

  // ----- 異常系 -----
  it("宣言が空なら空を返す", () => {
    expect(disabledRuleIds(undefined, [], [])).toEqual([]);
  });
});
