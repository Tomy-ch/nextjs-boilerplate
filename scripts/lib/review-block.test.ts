import { describe, expect, it } from "vitest";

import { composeReviewBlock } from "./review-block";

/** 画面を 1 つ開く、いちばん短い節。 */
const BASE = {
  kind: "screen",
  ids: "home",
  headRef: "release/v0.6.0",
  heading: "### 手元で見る",
  lead: "落ちた画面を開きます。",
} as const;

describe("composeReviewBlock", () => {
  // ----- 正常系 -----
  it("見出し・導入・コマンド・後始末をこの順に空行で区切って並べる", () => {
    expect(composeReviewBlock(BASE)).toBe(
      "### 手元で見る\n\n落ちた画面を開きます。\n\n```bash\nmake e2e-review BRANCH='release/v0.6.0' E2E_ONLY='home'\n```\n\n作業ツリーは Ctrl-C では消えません。溜まったら `make review-clean` で片付けてください。",
    );
  });

  it("story は story 側の入口を指す", () => {
    expect(composeReviewBlock({ ...BASE, kind: "story", ids: "overlay-command--default" })).toContain(
      "make vrt-review BRANCH='release/v0.6.0' VRT_ONLY='overlay-command--default'",
    );
  });

  it("実行を渡せば、成果物を引く先を添える", () => {
    expect(composeReviewBlock({ ...BASE, runId: "33339223610" })).toContain("RUN='33339223610'");
  });

  // ----- 異常系 -----
  it("対象が 1 つも無ければ、節ごと出さない", () => {
    expect(composeReviewBlock({ ...BASE, ids: "" })).toBe("");
  });

  it("差し込む値が文字集合を外れていれば、案内ごと出さない", () => {
    expect(composeReviewBlock({ ...BASE, ids: "home;id" })).toBe("");
  });

  it("表に無い種類を渡されたら、その綴りを挙げて断る", () => {
    expect(() => composeReviewBlock({ ...BASE, kind: "journey" })).toThrow(
      "--kind は story か screen です: journey",
    );
  });
});
