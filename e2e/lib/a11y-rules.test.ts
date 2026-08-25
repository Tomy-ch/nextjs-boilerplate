import { describe, expect, it } from "vitest";

import { DEFAULT_OFF_RULES } from "../../vrt/lib/a11y-rules";
import {
  CONFORMANCE_TAGS,
  SCREEN_DISABLED_RULES,
  SCREEN_ONLY_RULES,
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
});

describe("SCREEN_DISABLED_RULES", () => {
  // ----- 正常系 -----
  it("すべての宣言が理由と撤去条件と対象の画面を持つ", () => {
    const incomplete = SCREEN_DISABLED_RULES.filter(
      (rule) =>
        rule.reason.trim() === "" || rule.removeWhen.trim() === "" || rule.screens.length === 0,
    );

    expect(incomplete.map((rule) => rule.id)).toEqual([]);
  });

  // ----- 異常系 -----
  it("名指しの無効化が増え続けないよう、対象の数を目に見える形に保つ", () => {
    // 増やすときはこの数を更新する。更新が要ること自体が、無効化を足した事実を差分へ出す。
    expect(SCREEN_DISABLED_RULES.flatMap((rule) => rule.screens)).toHaveLength(0);
  });
});

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
