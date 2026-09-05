import { describe, expect, it } from "vitest";

import {
  type Diagnosis,
  estimateShift,
  formatDiagnosis,
  readDiagnosis,
  type ShiftedElement,
} from "./diagnosis";

const VIEWPORT_HEIGHT = 823;

const FOOTER: ShiftedElement = {
  score: 0.0875,
  selector: "body.min-h-full > footer.border-t",
  finalTop: 1701,
  height: 113,
};

type Audits = NonNullable<Parameters<typeof readDiagnosis>[1]["audits"]>;

function lhrOf(audits: Audits): Parameters<typeof readDiagnosis>[1] {
  return { audits, configSettings: { screenEmulation: { height: VIEWPORT_HEIGHT } } };
}

describe("estimateShift", () => {
  // ----- 正常系 -----
  it("寄与した CLS から、動く前の位置と押し下げの量を解く", () => {
    expect(estimateShift(FOOTER, VIEWPORT_HEIGHT)).toEqual({ before: 760, distance: 941 });
  });

  it("要素の全体が見えていた場合も解ける", () => {
    const element = { ...FOOTER, score: 0.1031, finalTop: 1328 };

    expect(estimateShift(element, VIEWPORT_HEIGHT)).toEqual({ before: 710, distance: 618 });
  });

  // ----- 異常系 -----
  it("確定後も viewport の中にある要素は解かない", () => {
    expect(estimateShift({ ...FOOTER, finalTop: 100 }, VIEWPORT_HEIGHT)).toBeUndefined();
  });

  it("viewport の高さが取れなければ解かない", () => {
    expect(estimateShift(FOOTER, 0)).toBeUndefined();
  });

  it("寄与した CLS を再現できなければ解かない", () => {
    expect(estimateShift({ ...FOOTER, score: 0.9 }, VIEWPORT_HEIGHT)).toBeUndefined();
  });
});

describe("readDiagnosis", () => {
  // ----- 正常系 -----
  it("動いた要素を、確定後の位置とともに拾う", () => {
    const diagnosis = readDiagnosis(
      "reports",
      lhrOf({
        "layout-shifts": {
          details: {
            items: [
              {
                score: 0.0875,
                node: { selector: "footer", boundingRect: { top: 1701, height: 113 } },
              },
            ],
          },
        },
      }),
    );

    expect(diagnosis.shifted).toEqual([
      { score: 0.0875, selector: "footer", finalTop: 1701, height: 113 },
    ]);
    expect(diagnosis.viewportHeight).toBe(VIEWPORT_HEIGHT);
  });

  it("起動時の script を、解析と実行に分けて拾う", () => {
    const diagnosis = readDiagnosis(
      "reports",
      lhrOf({
        "bootup-time": { details: { items: [{ url: "/a.js", total: 284, scripting: 254 }] } },
      }),
    );

    expect(diagnosis.bootup).toEqual([{ url: "/a.js", total: 284, scripting: 254 }]);
  });

  it("最大の描画になった要素を拾う", () => {
    const diagnosis = readDiagnosis(
      "reports",
      lhrOf({
        "largest-contentful-paint-element": {
          details: { items: [{ items: [{ node: { selector: "h1" } }] }] },
        },
      }),
    );

    expect(diagnosis.largestPaintElement).toBe("h1");
  });

  // ----- 異常系 -----
  it("監査そのものが無ければ、空として扱う", () => {
    const diagnosis = readDiagnosis("reports", lhrOf({}));

    expect(diagnosis.shifted).toEqual([]);
    expect(diagnosis.bootup).toEqual([]);
    expect(diagnosis.largestPaintElement).toBeUndefined();
  });

  it("位置を持たない要素は拾わない", () => {
    const diagnosis = readDiagnosis(
      "reports",
      lhrOf({ "layout-shifts": { details: { items: [{ score: 0.1, node: {} }] } } }),
    );

    expect(diagnosis.shifted).toEqual([]);
  });

  it("selector を持たない要素は、要素不明として拾う", () => {
    const diagnosis = readDiagnosis(
      "reports",
      lhrOf({
        "layout-shifts": {
          details: { items: [{ score: 0.1, node: { boundingRect: { top: 900, height: 50 } } }] },
        },
      }),
    );

    expect(diagnosis.shifted).toEqual([
      { score: 0.1, selector: "(要素不明)", finalTop: 900, height: 50 },
    ]);
  });

  it("取得元を持たない script は拾わない", () => {
    const diagnosis = readDiagnosis(
      "reports",
      lhrOf({ "bootup-time": { details: { items: [{ total: 10 }] } } }),
    );

    expect(diagnosis.bootup).toEqual([]);
  });

  it("実行時間の内訳を持たない script は、実行 0 として拾う", () => {
    const diagnosis = readDiagnosis(
      "reports",
      lhrOf({ "bootup-time": { details: { items: [{ url: "/a.js", total: 284 }] } } }),
    );

    expect(diagnosis.bootup).toEqual([{ url: "/a.js", total: 284, scripting: 0 }]);
  });

  it("viewport の宣言が無ければ 0 として扱う", () => {
    expect(readDiagnosis("reports", { audits: {} }).viewportHeight).toBe(0);
  });
});

describe("formatDiagnosis", () => {
  const base: Diagnosis = {
    screen: "reports",
    viewportHeight: VIEWPORT_HEIGHT,
    shifted: [],
    bootup: [],
    largestPaintElement: undefined,
  };

  // ----- 正常系 -----
  it("動いた要素に、押し下げの量を添える", () => {
    const text = formatDiagnosis({ ...base, shifted: [FOOTER] });

    expect(text).toContain("body.min-h-full > footer.border-t");
    expect(text).toContain("約 941 px 押し下げ");
  });

  it("解けない動きは、量を添えずに挙げる", () => {
    const text = formatDiagnosis({ ...base, shifted: [{ ...FOOTER, finalTop: 100 }] });

    expect(text).toContain("0.0875");
    expect(text).not.toContain("押し下げ");
  });

  it("script は重い順に、上位だけを挙げる", () => {
    const text = formatDiagnosis({
      ...base,
      bootup: [
        { url: "/small.js", total: 10, scripting: 5 },
        { url: "/big.js", total: 300, scripting: 280 },
        { url: "/mid.js", total: 100, scripting: 90 },
        { url: "/tiny.js", total: 1, scripting: 1 },
      ],
    });

    expect(text.indexOf("/big.js")).toBeLessThan(text.indexOf("/mid.js"));
    expect(text).not.toContain("/tiny.js");
  });

  it("最大の描画を出す", () => {
    expect(formatDiagnosis({ ...base, largestPaintElement: "h1" })).toContain("最大の描画: h1");
  });

  // ----- 異常系 -----
  it("動いた要素が無ければ、その旨を出す", () => {
    expect(formatDiagnosis(base)).toContain("画素は動いていません");
  });
});
