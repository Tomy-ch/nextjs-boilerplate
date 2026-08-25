import axe from "axe-core";
import { describe, expect, it } from "vitest";

import {
  CONFORMANCE_TAGS,
  DEFAULT_OFF_RULES,
  DISABLED_RULES,
  type DisabledRule,
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

  // ----- 異常系 -----
  it("タグ指定で新たに有効化されるものを、過不足なく挙げる", () => {
    // 宣言の自己整合ではなく axe 本体と突き合わせる。足りなければ「目標に無い水準」が全 story へ
    // 課され、多ければ打ち消す必要の無いものを黙らせている。
    //
    // 既定で無効かどうかは axe の公開 API が出さないので内部の目録を読む。読めなくなったら
    // 落とす —— 黙って通すと、この突合が効いていないことに誰も気づけない。
    const disabledByDefault = defaultDisabledRuleIds();
    const tags = new Set<string>(CONFORMANCE_TAGS);
    const newlyEnabled = axe
      .getRules()
      .filter((rule) => rule.tags.some((tag) => tags.has(tag)))
      .map((rule) => rule.ruleId)
      .filter((id) => disabledByDefault.has(id));

    expect([...DEFAULT_OFF_RULES.map((rule) => rule.id)].sort()).toEqual([...newlyEnabled].sort());
  });
});

/** axe が既定で無効にしているルールの id。 */
function defaultDisabledRuleIds(): Set<string> {
  const audit = (axe as unknown as { _audit?: { rules?: { id: string; enabled?: boolean }[] } })
    ._audit;

  if (audit?.rules === undefined) {
    throw new Error("axe の内部目録を読めません。突合の前提が変わっています");
  }

  return new Set(audit.rules.filter((rule) => rule.enabled === false).map((rule) => rule.id));
}

describe("DISABLED_RULES", () => {
  // ----- 正常系 -----
  it("すべての宣言が理由と撤去条件を持つ", () => {
    expect(incompleteIdsOf(DISABLED_RULES)).toEqual([]);
  });

  it("同じルールを二重に宣言していない", () => {
    const ids = DISABLED_RULES.map((rule) => rule.id);

    expect(ids).toEqual([...new Set(ids)]);
  });

  // ----- 異常系 -----
  it("無効化が増え続けないよう、宣言の数を目に見える形に保つ", () => {
    // 増やすときはこの数を更新する。更新が要ること自体が、無効化を足した事実を差分へ出す。
    // いまは空で、landmark と h1 の 3 件は画面単位の検査（`e2e/lib/a11y-rules.ts`）が持つ。
    expect(DISABLED_RULES).toHaveLength(0);
  });

  it("色コントラストを無効にしない（実ブラウザで撮るために相乗りしている）", () => {
    // 宣言が空の間は上の件数から導かれるが、戻ってきたときに独立して効く。
    expect(DISABLED_RULES.map((rule) => rule.id)).not.toContain("color-contrast");
  });

  it("理由・撤去条件が欠けた宣言を見つけられる", () => {
    // 宣言が空の間、上の完全性検査は中身を見ずに通る。**述語そのものが働くこと**をここで確かめる。
    expect(
      incompleteIdsOf([
        { id: "reason", reason: " ", removeWhen: "条件" },
        { id: "when", reason: "理由", removeWhen: " " },
        { id: "ok", reason: "理由", removeWhen: "条件" },
      ]),
    ).toEqual(["reason", "when"]);
  });
});

/** 理由・撤去条件のどちらかが欠けている宣言の id。 */
function incompleteIdsOf(rules: readonly DisabledRule[]): string[] {
  return rules
    .filter((rule) => rule.reason.trim() === "" || rule.removeWhen.trim() === "")
    .map((rule) => rule.id);
}

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
  it("既定の宣言から、実際の story id で無効化する id を引ける", () => {
    // 引数を渡すテストは既定値を通らない。実運用の呼び方（story id だけを渡す）をここで通す。
    const [named] = STORY_DISABLED_RULES;

    expect(disabledRuleIds(named?.stories[0])).toContain(named?.id);
  });

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
