import { describe, expect, it } from "vitest";

import { composeRetakeOutcome, type RetakeOutcomeInput } from "./outcome";

/** 直接 push で 1 枚だけ撮り直した、いちばん短い結果。 */
const BASE: RetakeOutcomeInput = {
  sha: "54e03c13",
  count: "1",
  ids: "home",
  pointerPrUrl: "",
  screensPending: false,
  headRef: "release/v0.6.0",
  stories: "",
  screens: "home",
  images: "screen/desktop/home.png",
  unpaired: "",
  before: "8f48ba61",
  after: "555a067f",
  storeRepository: "owner/baseline-images",
};

/** 上限を超える枚数を並べる。 */
function manyImages(count: number): string {
  return Array.from({ length: count }, (_, index) => `screen/desktop/s${index}.png`).join(",");
}

describe("composeRetakeOutcome", () => {
  // ----- 正常系 -----
  it("撮り直した枚数と対象を先頭に置く", () => {
    expect(composeRetakeOutcome(BASE)).toMatch(/^🎞️ 基準画像を 1 枚撮り直しました \(54e03c13\)。/);
  });

  it("動いた画像を、前後へのリンクの表で並べる", () => {
    expect(composeRetakeOutcome(BASE)).toContain(
      "| `screen/desktop/home.png` | [前](https://github.com/owner/baseline-images/blob/8f48ba61/screen/desktop/home.png) | [後](https://github.com/owner/baseline-images/blob/555a067f/screen/desktop/home.png) |",
    );
  });

  it("前が無い画像は、リンクではなくそのことを書く", () => {
    expect(
      composeRetakeOutcome({ ...BASE, unpaired: "screen/desktop/home.png" }),
    ).toContain("| `screen/desktop/home.png` | 前が無い |");
  });

  it("上限を超えたら、切ったことと動いた総数を書く", () => {
    const outcome = composeRetakeOutcome({ ...BASE, images: manyImages(25) });

    expect(outcome).toContain("動いた 25 枚のうち 20 枚だけを並べています。");
    expect(outcome).not.toContain("s20.png");
  });

  it("上限ちょうどなら、切ったことを書かない", () => {
    expect(composeRetakeOutcome({ ...BASE, images: manyImages(20) })).not.toContain(
      "枚だけを並べています",
    );
  });

  it("動いた種類のぶんだけ、手元で開くコマンドを並べる", () => {
    const outcome = composeRetakeOutcome({ ...BASE, stories: "overlay-command--default" });

    expect(outcome).toContain(
      "make vrt-review BRANCH='release/v0.6.0' VRT_ONLY='overlay-command--default'",
    );
    expect(outcome).toContain("make e2e-review BRANCH='release/v0.6.0' E2E_ONLY='home'");
  });

  it("ポインタを PR で入れる場合は、その PR を承認先として指す", () => {
    const outcome = composeRetakeOutcome({ ...BASE, pointerPrUrl: "https://example.test/pull/1" });

    expect(outcome).toContain("**ポインタは PR で入れます**: https://example.test/pull/1");
    expect(outcome).toContain("**上のポインタ PR に**");
  });

  it("画面の判定が届いていなければ、撮っていないことを書く", () => {
    expect(composeRetakeOutcome({ ...BASE, screensPending: true })).toContain(
      "画面は E2E がまだ判定していないため撮り直していません。",
    );
  });

  // ----- 異常系 -----
  it("動いた画像が無ければ、表を出さない", () => {
    expect(composeRetakeOutcome({ ...BASE, images: "" })).not.toContain("### 動いた画像");
  });

  it("画像の位置が文字集合を外れていれば、表ごと出さない", () => {
    expect(composeRetakeOutcome({ ...BASE, images: "screen/`id`.png" })).not.toContain(
      "### 動いた画像",
    );
  });

  it("どちらの種類も撮っていなければ、手元で開く節を出さない", () => {
    expect(composeRetakeOutcome({ ...BASE, screens: "", stories: "" })).not.toContain(
      "### 手元で見る",
    );
  });

  it("ブランチ名が文字集合を外れていれば、手元で開く節を出さない", () => {
    expect(composeRetakeOutcome({ ...BASE, headRef: "feat/$(id)" })).not.toContain("### 手元で見る");
  });
});
