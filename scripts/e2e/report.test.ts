import { describe, expect, it } from "vitest";

import { SCREEN_BASELINE_TAG } from "../../e2e/lib/screen-baselines";
import { collectFailedScreens, formatScreenNames, hasScreenBaselineFailure } from "./report";

const VISUAL = "e2e/visual/screens.spec.ts";

/** 1 件分のテスト結果を組み立てる。tag は spec が持つため、ここには入れない。 */
function test(options: { status?: string; band?: string }): unknown {
  return {
    projectName: options.band ?? "desktop",
    status: options.status ?? "unexpected",
  };
}

/** spec を並べたレポートを組み立てる。 */
function reportOf(specs: unknown[]): string {
  return JSON.stringify({ suites: [{ specs }] });
}

describe("collectFailedScreens", () => {
  // ----- 正常系 -----
  it("落ちた画面を名前と帯で取り出す", () => {
    const json = reportOf([
      { file: VISUAL, title: "admin-analytics", tests: [test({ band: "mobile" })] },
    ]);

    expect(collectFailedScreens(json)).toEqual([{ name: "admin-analytics", band: "mobile" }]);
  });

  it("通った帯を落ちた帯と混ぜない", () => {
    const json = reportOf([
      {
        file: VISUAL,
        title: "about",
        tests: [test({ band: "mobile", status: "expected" }), test({ band: "desktop" })],
      },
    ]);

    expect(collectFailedScreens(json)).toEqual([{ name: "about", band: "desktop" }]);
  });

  it("名前と帯の順に並べる", () => {
    const json = reportOf([
      { file: VISUAL, title: "b", tests: [test({})] },
      { file: VISUAL, title: "a", tests: [test({ band: "tablet" })] },
      { file: VISUAL, title: "a", tests: [test({ band: "mobile" })] },
    ]);

    expect(collectFailedScreens(json).map((failure) => `${failure.name}/${failure.band}`)).toEqual([
      "a/mobile",
      "a/tablet",
      "b/desktop",
    ]);
  });

  it("ジャーニーの失敗は画面として拾わない", () => {
    const json = reportOf([
      { file: "e2e/journeys/purchase.spec.ts", title: "購入", tests: [test({})] },
      { file: VISUAL, title: "about", tests: [test({})] },
    ]);

    expect(collectFailedScreens(json)).toEqual([{ name: "about", band: "desktop" }]);
  });

  it("1 対 1 の対応を見る spec は画面として拾わない", () => {
    const json = reportOf([
      { file: VISUAL, title: "対応", tags: ["screen-baselines"], tests: [test({})] },
      { file: VISUAL, title: "about", tests: [test({})] },
    ]);

    expect(collectFailedScreens(json)).toEqual([{ name: "about", band: "desktop" }]);
  });

  it("文字列でない tag を持つ spec も、名前で突き合わせて画面として拾う", () => {
    const json = reportOf([{ file: VISUAL, title: "about", tags: [123], tests: [test({})] }]);

    expect(collectFailedScreens(json)).toEqual([{ name: "about", band: "desktop" }]);
  });

  it("見出しと project 名を持たない結果も件数として残す", () => {
    const json = reportOf([{ file: VISUAL, tests: [{ status: "unexpected" }] }]);

    expect(collectFailedScreens(json)).toEqual([{ name: "", band: "" }]);
  });

  it("在り処を文字列で持たない spec は突き合わせの対象に入らない", () => {
    const json = reportOf([
      { file: VISUAL, title: "about", tests: [test({})] },
      { title: "在り処なし", tests: [test({})] },
      { file: 123, title: "在り処が文字列でない", tests: [test({})] },
    ]);

    expect(collectFailedScreens(json)).toEqual([{ name: "about", band: "desktop" }]);
  });

  // ----- 異常系 -----
  it("画面を比べている spec が無いレポートを弾く", () => {
    const json = reportOf([{ file: "e2e/journeys/purchase.spec.ts", tests: [test({})] }]);

    expect(() => collectFailedScreens(json)).toThrow(VISUAL.replace("e2e/", ""));
  });
});

describe("formatScreenNames", () => {
  // ----- 正常系 -----
  it("帯違いを 1 件に畳んで並べる", () => {
    expect(
      formatScreenNames([
        { name: "b", band: "desktop" },
        { name: "a", band: "mobile" },
        { name: "a", band: "desktop" },
      ]),
    ).toBe("a,b");
  });

  it("1 件も落ちていなければ空を返す", () => {
    expect(formatScreenNames([])).toBe("");
  });
});

describe("hasScreenBaselineFailure", () => {
  // ----- 正常系 -----
  it("対応の検査が落ちていれば真を返す", () => {
    const json = reportOf([
      { file: VISUAL, tags: [SCREEN_BASELINE_TAG], title: "対応", tests: [test({})] },
    ]);

    expect(hasScreenBaselineFailure(json)).toBe(true);
  });

  it("対応の検査が通っていれば偽を返す", () => {
    const json = reportOf([
      {
        file: VISUAL,
        tags: [SCREEN_BASELINE_TAG],
        title: "対応",
        tests: [test({ status: "expected" })],
      },
    ]);

    expect(hasScreenBaselineFailure(json)).toBe(false);
  });

  it("画面の失敗を対応の失敗と混同しない", () => {
    const json = reportOf([
      { file: VISUAL, title: "about", tests: [test({})] },
      {
        file: VISUAL,
        tags: [SCREEN_BASELINE_TAG],
        title: "対応",
        tests: [test({ status: "expected" })],
      },
    ]);

    expect(hasScreenBaselineFailure(json)).toBe(false);
  });

  // ----- 異常系 -----
  it("対応の検査を含まないレポートを弾く", () => {
    const json = reportOf([{ file: VISUAL, title: "about", tests: [test({})] }]);

    expect(() => hasScreenBaselineFailure(json)).toThrow(SCREEN_BASELINE_TAG);
  });
});
