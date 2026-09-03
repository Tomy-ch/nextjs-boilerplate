import { describe, expect, it } from "vitest";

import { classifyFailure, composeNotes } from "./comment";

/** 種別が 1 つも立っていない状態。 */
const NONE = { undeclared: false, unretakable: false, pixels: false } as const;

/** 手元で開く節へ差し込む値。 */
const REVIEW = { screenNames: "home,cart", headRef: "release/v0.6.0", runId: "1" } as const;

describe("classifyFailure", () => {
  // ----- 正常系 -----
  it("宣言の無い画面が現れたことを立てる", () => {
    expect(classifyFailure("画面の宣言がありません: help").undeclared).toBe(true);
  });

  it("ジャーニーの失敗を、撮り直しでは直らないものとして立てる", () => {
    expect(classifyFailure("✘ 1 [chromium] › e2e/journeys/browse.spec.ts:1:1").unretakable).toBe(
      true,
    );
  });

  it("停止中の扱いの失敗も同じ種別へ入れる", () => {
    expect(
      classifyFailure("✘ 2 [chromium] › e2e/maintenance/stopped.spec.ts:41:5").unretakable,
    ).toBe(true);
  });

  it("公開面の失敗も同じ種別へ入れる", () => {
    expect(
      classifyFailure("✘ 3 [chromium] › e2e/metadata/public-surface.spec.ts:25:5").unretakable,
    ).toBe(true);
  });

  it("画素の比較の失敗を立てる", () => {
    expect(classifyFailure("expect(page).toHaveScreenshot(expected) failed").pixels).toBe(true);
  });

  it("基準画像が 1 枚も無いことも画素の種別へ入れる", () => {
    expect(classifyFailure("A snapshot doesn't exist at ...").pixels).toBe(true);
  });

  it("置き場との対応が崩れたことを指すログも画素の種別へ入れる", () => {
    expect(
      classifyFailure("✘ 1 [mobile] › @screen-baselines 撮影対象と 1 対 1 で対応する").pixels,
    ).toBe(true);
  });

  it("複数の落ち方を同時に立てる", () => {
    expect(
      classifyFailure("画面の宣言がありません\n✘ e2e/journeys/a.spec.ts\ntoHaveScreenshot"),
    ).toEqual({ undeclared: true, unretakable: true, pixels: true });
  });

  // ----- 異常系 -----
  it("画素の比較が落ちた巡回を、ジャーニーの失敗として数えない", () => {
    expect(
      classifyFailure("✘ 1 [mobile] › e2e/visual/screens.spec.ts:39:7 › home").unretakable,
    ).toBe(false);
  });

  it("置き場の名前が印より前にあるだけなら、立てない", () => {
    expect(classifyFailure("e2e/journeys/browse.spec.ts ✘ 1 失敗の一覧").unretakable).toBe(false);
  });

  it("目印が 1 つも無ければ、どの種別も立てない", () => {
    expect(classifyFailure("Error: connect ECONNREFUSED")).toEqual(NONE);
  });
});

describe("composeNotes", () => {
  // ----- 正常系 -----
  it("成果物の案内は種別によらず先頭に置く", () => {
    expect(composeNotes({ kinds: NONE, ...REVIEW })).toMatch(/^`e2e-diff` artifact に/);
  });

  it("宣言漏れには、撮り直しで直らないことを添える", () => {
    const notes = composeNotes({ kinds: { ...NONE, undeclared: true }, ...REVIEW });

    expect(notes).toContain("### 画面の宣言が足りていません");
    expect(notes).not.toContain("### 種別を判定できませんでした");
  });

  it("撮り直しで直らない失敗には、3 つの置き場を名指しする", () => {
    const notes = composeNotes({ kinds: { ...NONE, unretakable: true }, ...REVIEW });

    expect(notes).toContain("`e2e/maintenance/`");
    expect(notes).toContain("`e2e/metadata/`");
    expect(notes).not.toContain("### 種別を判定できませんでした");
  });

  it("画素のずれには、撮り直しの案内と手元で開くコマンドを添える", () => {
    const notes = composeNotes({ kinds: { ...NONE, pixels: true }, ...REVIEW });

    expect(notes).toContain("### 画面の見た目が基準画像と違います");
    expect(notes).toContain("make e2e-review BRANCH='release/v0.6.0' RUN='1' E2E_ONLY='home,cart'");
    expect(notes).not.toContain("### 種別を判定できませんでした");
  });

  // ----- 異常系 -----
  it("画面の名前が取れなければ、手元で開く節を出さない", () => {
    expect(
      composeNotes({ kinds: { ...NONE, pixels: true }, ...REVIEW, screenNames: "" }),
    ).not.toContain("#### 手元で見る");
  });

  it("差し込む値が文字集合を外れていれば、手元で開く節を出さない", () => {
    expect(
      composeNotes({ kinds: { ...NONE, pixels: true }, ...REVIEW, headRef: "feat/$(id)" }),
    ).not.toContain("#### 手元で見る");
  });

  it("種別が 1 つも立たなければ、判定できなかったことを書く", () => {
    expect(composeNotes({ kinds: NONE, ...REVIEW })).toContain("### 種別を判定できませんでした");
  });
});
