import axe from "axe-core";
import { describe, expect, it } from "vitest";

import { DEFAULT_OFF_RULES } from "../../vrt/lib/a11y-rules";
import {
  CONFORMANCE_TAGS,
  SCREEN_DISABLED_RULES,
  SCREEN_ONLY_RULES,
  type ScreenDisabledRule,
  screenDisabledRuleIds,
} from "./a11y-rules";

describe("CONFORMANCE_TAGS", () => {
  // ----- 正常系 -----
  it("story 側と同じ適合目標を使う", () => {
    expect(CONFORMANCE_TAGS).toContain("wcag2aa");
  });
});

describe("SCREEN_ONLY_RULES", () => {
  // ----- 正常系 -----
  it("story から外しているルールを、こちらでは無効化しない", () => {
    const disabled = screenDisabledRuleIds();

    expect(SCREEN_ONLY_RULES.filter((rule) => disabled.includes(rule))).toEqual([]);
  });

  it("axe に実在するルールだけを挙げる", () => {
    const known = new Set(axe.getRules().map((rule) => rule.ruleId));

    expect(SCREEN_ONLY_RULES.filter((rule) => !known.has(rule))).toEqual([]);
  });

  // ----- 異常系 -----
  it("適合目標のタグでは走らないものだけを挙げる", () => {
    // タグで走るものをここへ入れると、同じ違反が 2 度並ぶ。逆に、タグで走らないものをここから
    // 落とすと、**有効にしたつもりで一度も評価されない**状態が黙って戻る。後者が実際に起きた。
    const tags = new Set<string>(CONFORMANCE_TAGS);
    const reachedByTags = axe
      .getRules()
      .filter((rule) => rule.tags.some((tag) => tags.has(tag)))
      .map((rule) => rule.ruleId);

    expect(SCREEN_ONLY_RULES.filter((rule) => reachedByTags.includes(rule))).toEqual([]);
  });
});

describe("SCREEN_DISABLED_RULES", () => {
  // ----- 正常系 -----
  it("すべての宣言が理由と撤去条件と対象の画面を持つ", () => {
    expect(incompleteIdsOf(SCREEN_DISABLED_RULES)).toEqual([]);
  });

  it("同じ画面で同じルールを二重に宣言していない", () => {
    expect(screenRulePairsOf(SCREEN_DISABLED_RULES)).toEqual([
      ...new Set(screenRulePairsOf(SCREEN_DISABLED_RULES)),
    ]);
  });

  // ----- 異常系 -----
  it("名指しの無効化が増え続けないよう、対象の数を目に見える形に保つ", () => {
    // 増やすときはこの数を更新する。更新が要ること自体が、無効化を足した事実を差分へ出す。
    expect(SCREEN_DISABLED_RULES.flatMap((rule) => rule.screens)).toHaveLength(0);
  });

  it("理由・撤去条件・対象の画面が欠けた宣言を見つけられる", () => {
    // 宣言が空の間、上の 2 つは中身を見ずに通る。**述語そのものが働くこと**をここで確かめる。
    expect(
      incompleteIdsOf([
        { id: "reason", reason: " ", removeWhen: "条件", screens: ["a"] },
        { id: "when", reason: "理由", removeWhen: " ", screens: ["a"] },
        { id: "screens", reason: "理由", removeWhen: "条件", screens: [] },
        { id: "ok", reason: "理由", removeWhen: "条件", screens: ["a"] },
      ]),
    ).toEqual(["reason", "when", "screens"]);
  });

  it("同じ画面へ同じルールを二重に宣言したことを見つけられる", () => {
    const pairs = screenRulePairsOf([
      { id: "region", reason: "理由", removeWhen: "条件", screens: ["a", "b"] },
      { id: "region", reason: "理由", removeWhen: "条件", screens: ["a"] },
    ]);

    expect(pairs).not.toEqual([...new Set(pairs)]);
  });
});

/** 理由・撤去条件・対象の画面のどれかが欠けている宣言の id。 */
function incompleteIdsOf(rules: readonly ScreenDisabledRule[]): string[] {
  return rules
    .filter(
      (rule) =>
        rule.reason.trim() === "" || rule.removeWhen.trim() === "" || rule.screens.length === 0,
    )
    .map((rule) => rule.id);
}

/** 画面とルールの組。二重宣言はここで重複として現れる。 */
function screenRulePairsOf(rules: readonly ScreenDisabledRule[]): string[] {
  return rules.flatMap((rule) => rule.screens.map((screen) => `${screen}:${rule.id}`));
}

describe("screenDisabledRuleIds", () => {
  // ----- 正常系 -----
  it("タグ指定の副作用で有効化されるものを打ち消す", () => {
    for (const rule of DEFAULT_OFF_RULES) {
      expect(screenDisabledRuleIds()).toContain(rule.id);
    }
  });

  it("名指しされた画面では、その画面の宣言も併せて外す", () => {
    const screenRules = [{ id: "region", reason: "理由", removeWhen: "条件", screens: ["mypage"] }];

    expect(screenDisabledRuleIds("mypage", [], screenRules)).toEqual(["region"]);
  });

  it("名指しされていない画面では、その宣言を外さない", () => {
    const screenRules = [{ id: "region", reason: "理由", removeWhen: "条件", screens: ["mypage"] }];

    expect(screenDisabledRuleIds("cart", [], screenRules)).toEqual([]);
  });

  it("画面を渡さなければ、名指しの宣言は効かない", () => {
    const screenRules = [{ id: "region", reason: "理由", removeWhen: "条件", screens: ["mypage"] }];

    expect(screenDisabledRuleIds(undefined, [], screenRules)).toEqual([]);
  });

  it("重複した id を畳む", () => {
    const rules = [
      { id: "region", reason: "理由", removeWhen: "条件" },
      { id: "region", reason: "理由", removeWhen: "条件" },
    ];

    expect(screenDisabledRuleIds(undefined, rules, [])).toEqual(["region"]);
  });
});
