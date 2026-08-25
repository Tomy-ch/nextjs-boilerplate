import { describe, expect, it } from "vitest";

import type { Quantity, Verdict } from "./budget";
import { renderReport } from "./report";

const KB = 1024;

/** 量 1 つ。base を省くと、動いていない量になる。 */
function quantity(current: number, base = current, overGrowth?: number): Quantity {
  return { current, base, overGrowth };
}

/** base を持たない量。この PR で増えた route が持つ形。 */
function newQuantity(current: number): Quantity {
  return { current, base: undefined, overGrowth: undefined };
}

function verdict(overrides: Partial<Verdict> = {}): Verdict {
  return {
    route: "/",
    initialJs: quantity(90 * KB, 85 * KB),
    sharedJs: quantity(60 * KB, 60 * KB),
    deferredJs: quantity(0),
    totalJs: quantity(90 * KB, 85 * KB),
    css: quantity(20 * KB),
    limit: 100 * KB,
    overLimit: undefined,
    ...overrides,
  };
}

const SURVEY = { sharedJs: quantity(60 * KB), deferredChunkCount: 3 };

describe("renderReport", () => {
  // ----- 正常系 -----
  it("初期 JS の大きい route から並べる", () => {
    const table = renderReport(
      [
        verdict({ route: "/small", initialJs: quantity(10 * KB) }),
        verdict({ route: "/large", initialJs: quantity(200 * KB) }),
      ],
      SURVEY,
    );

    expect(table.indexOf("/large")).toBeLessThan(table.indexOf("/small"));
  });

  it("収まっている route を ✅ で示し、増分を括弧に添える", () => {
    expect(renderReport([verdict()], SURVEY)).toContain(
      "| `/` | 90.0 KB (+5.0) | 0.0 KB | 90.0 KB (+5.0) | 20.0 KB | 100.0 KB | ✅ |",
    );
  });

  it("丸めて 0 になる増減は括弧を出さない", () => {
    expect(
      renderReport([verdict({ initialJs: quantity(90 * KB - 1, 90 * KB) })], SURVEY),
    ).toContain("| 90.0 KB |");
  });

  it("減った route の増分を負で出す", () => {
    expect(renderReport([verdict({ initialJs: quantity(80 * KB, 85 * KB) })], SURVEY)).toContain(
      "(-5.0)",
    );
  });

  it("上限を持たない route を判定せず — で示す", () => {
    expect(renderReport([verdict({ limit: undefined })], SURVEY)).toContain("| — | — |");
  });

  it("base に無い route は、動いていない route と見分けが付く形で出す", () => {
    // この PR で増えた route は、どの量にも base を持たない。base と同値にすると、丸めて 0 に
    // なる隣のケースと同じ経路を通り、`base === undefined` の分岐を消しても落ちなくなる。
    const report = renderReport(
      [
        verdict({
          initialJs: newQuantity(90 * KB),
          sharedJs: newQuantity(60 * KB),
          deferredJs: newQuantity(0),
          totalJs: newQuantity(90 * KB),
          css: newQuantity(20 * KB),
        }),
      ],
      SURVEY,
    );

    expect(report).toContain(
      "| `/` | 90.0 KB (新規) | 0.0 KB (新規) | 90.0 KB (新規) | 20.0 KB (新規) |",
    );
  });

  it("遅延として引けた件数を添える", () => {
    expect(renderReport([verdict()], SURVEY)).toContain("遅延として引けた chunk: 3 件");
  });

  it("共有 chunk を 1 度だけ出す", () => {
    const report = renderReport([verdict({ route: "/a" }), verdict({ route: "/b" })], SURVEY);

    expect(report.match(/共有 chunk: /g)).toHaveLength(1);
  });

  it("共有が増えたとき、同じ増分が各 route へ乗ることを言う", () => {
    const report = renderReport([verdict()], {
      ...SURVEY,
      sharedJs: quantity(68 * KB, 60 * KB),
    });

    expect(report).toContain("68.0 KB (+8.0)。同じ増分が下の表の各 route へ乗っています");
  });

  // ----- 異常系 -----
  it("上限の超過を量つきで示す", () => {
    expect(renderReport([verdict({ overLimit: 3 * KB })], SURVEY)).toContain("❌ 上限 +3.0 KB");
  });

  it("初期の増分の超過を量つきで示す", () => {
    expect(
      renderReport([verdict({ initialJs: quantity(95 * KB, 80 * KB, 2 * KB) })], SURVEY),
    ).toContain("❌ 初期の増分 +2.0 KB");
  });

  it("合計の増分の超過を量つきで示す", () => {
    expect(
      renderReport([verdict({ totalJs: quantity(120 * KB, 85 * KB, 4 * KB) })], SURVEY),
    ).toContain("❌ 合計の増分 +4.0 KB");
  });

  it("CSS の増分の超過を量つきで示す", () => {
    expect(renderReport([verdict({ css: quantity(30 * KB, 20 * KB, 6 * KB) })], SURVEY)).toContain(
      "❌ CSS の増分 +6.0 KB",
    );
  });

  it("複数の超過を 1 行にまとめる", () => {
    expect(
      renderReport(
        [verdict({ overLimit: 3 * KB, initialJs: quantity(95 * KB, 80 * KB, 2 * KB) })],
        SURVEY,
      ),
    ).toContain("❌ 上限 +3.0 KB / 初期の増分 +2.0 KB");
  });

  it("落ちた route にだけ、固有と共有の内訳を添える", () => {
    // 共有が動いていない一方で固有が動いた例。原因が共有側か route 側かを、この 1 行が分ける。
    const report = renderReport(
      [verdict({ route: "/over", overLimit: 3 * KB }), verdict({ route: "/fine" })],
      SURVEY,
    );

    expect(report).toContain(
      "- `/over` の初期 JS の内訳: この route だけが読む 30.0 KB (+5.0) / 共有 60.0 KB",
    );
    expect(report).not.toContain("`/fine` の初期 JS の内訳");
  });

  it("合計 JS の増分だけで超過した route には内訳を添えない", () => {
    // 内訳が答えるのは「初期 JS のどこが動いたか」なので、初期が動いていない超過には出さない。
    const report = renderReport(
      [verdict({ route: "/total", totalJs: quantity(120 * KB, 85 * KB, 4 * KB) })],
      SURVEY,
    );

    expect(report).toContain("❌ 合計の増分");
    expect(report).not.toContain("`/total` の初期 JS の内訳");
  });

  it("CSS の増分だけで超過した route には内訳を添えない", () => {
    const report = renderReport(
      [verdict({ route: "/css", css: quantity(30 * KB, 20 * KB, 6 * KB) })],
      SURVEY,
    );

    expect(report).toContain("❌ CSS の増分");
    expect(report).not.toContain("`/css` の初期 JS の内訳");
  });

  it("base を持たない落ちた route でも内訳を出す", () => {
    const report = renderReport(
      [
        verdict({
          route: "/new",
          overLimit: 3 * KB,
          initialJs: newQuantity(90 * KB),
          sharedJs: newQuantity(60 * KB),
        }),
      ],
      SURVEY,
    );

    expect(report).toContain(
      "- `/new` の初期 JS の内訳: この route だけが読む 30.0 KB (新規) / 共有 60.0 KB (新規)",
    );
  });
});
