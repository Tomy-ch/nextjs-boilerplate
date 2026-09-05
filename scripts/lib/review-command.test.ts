import { describe, expect, it } from "vitest";

import { composeReviewCommand, REVIEW_KIND } from "./review-command";

describe("composeReviewCommand", () => {
  // ----- 正常系 -----
  it("story は vrt-review へ VRT_ONLY で渡す", () => {
    expect(
      composeReviewCommand({
        kind: REVIEW_KIND.story,
        ids: "form-datepickerclient--default",
        headRef: "feature/419-consent-gate",
        runId: "33327441359",
      }),
    ).toBe(
      "make vrt-review BRANCH='feature/419-consent-gate' RUN='33327441359' VRT_ONLY='form-datepickerclient--default'",
    );
  });

  it("画面は e2e-review へ E2E_ONLY で渡す", () => {
    expect(
      composeReviewCommand({
        kind: REVIEW_KIND.screen,
        ids: "home,settings",
        headRef: "release/v0.6.0",
        runId: "1",
      }),
    ).toBe("make e2e-review BRANCH='release/v0.6.0' RUN='1' E2E_ONLY='home,settings'");
  });

  it("実行を渡さない面では RUN を置かない", () => {
    expect(
      composeReviewCommand({ kind: REVIEW_KIND.screen, ids: "home", headRef: "develop" }),
    ).toBe("make e2e-review BRANCH='develop' E2E_ONLY='home'");
  });

  // ----- 異常系 -----
  it("対象が 1 つも無ければ組み立てない", () => {
    expect(
      composeReviewCommand({ kind: REVIEW_KIND.story, ids: "", headRef: "develop" }),
    ).toBeNull();
  });

  it("id が文字集合を外れていれば組み立てない", () => {
    expect(
      composeReviewCommand({ kind: REVIEW_KIND.screen, ids: "home;id", headRef: "develop" }),
    ).toBeNull();
  });

  it("ブランチ名が文字集合を外れていれば組み立てない", () => {
    expect(
      composeReviewCommand({ kind: REVIEW_KIND.screen, ids: "home", headRef: "feat/$(id)" }),
    ).toBeNull();
  });

  it("実行の id が文字集合を外れていれば組み立てない", () => {
    expect(
      composeReviewCommand({
        kind: REVIEW_KIND.screen,
        ids: "home",
        headRef: "develop",
        runId: "1;id",
      }),
    ).toBeNull();
  });
});
