import { describe, expect, it } from "vitest";

import { DISABLED_RULES, disabledRuleIds } from "./a11y-rules";

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
    expect(DISABLED_RULES).toHaveLength(3);
  });

  it("色コントラストを無効にしない（実ブラウザで撮るために相乗りしている）", () => {
    expect(DISABLED_RULES.map((rule) => rule.id)).not.toContain("color-contrast");
  });
});

describe("disabledRuleIds", () => {
  // ----- 正常系 -----
  it("宣言から id だけを取り出す", () => {
    expect(disabledRuleIds([{ id: "region", reason: "理由", removeWhen: "条件" }])).toEqual([
      "region",
    ]);
  });

  // ----- 異常系 -----
  it("宣言が空なら空を返す", () => {
    expect(disabledRuleIds([])).toEqual([]);
  });
});
