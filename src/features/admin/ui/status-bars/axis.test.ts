import { describe, expect, it } from "vitest";

import { axisPercent, barAxis } from "./axis";

describe("barAxis", () => {
  it("0 から始まる目盛りを返す", () => {
    expect(barAxis([7, 4, 3]).ticks[0]).toBe(0);
  });

  it("最大の件数を覆う切りのよい値を右端にする", () => {
    expect(barAxis([7, 4, 3]).max).toBe(8);
  });

  it("刻み幅は 1・2・5 から選ぶ", () => {
    expect(barAxis([7, 4, 3]).ticks).toEqual([0, 2, 4, 6, 8]);
  });

  it("1・2・5 では目盛りが多くなりすぎる件数は、1 桁上げて刻む", () => {
    expect(barAxis([22]).ticks).toEqual([0, 10, 20, 30]);
  });

  it("桁が上がっても同じ刻み方をする", () => {
    expect(barAxis([70, 40, 30]).ticks).toEqual([0, 20, 40, 60, 80]);
  });

  it("件数が刻み幅で割り切れるときは、最大の件数がそのまま右端になる", () => {
    expect(barAxis([4]).max).toBe(4);
  });

  it("小数を刻まない", () => {
    expect(barAxis([2]).ticks).toEqual([0, 1, 2]);
  });

  it("目盛りは 5 つを超えない", () => {
    expect(barAxis([9_999]).ticks.length).toBeLessThanOrEqual(5);
  });

  it("件数が無くても、目盛りを 2 つ返す", () => {
    expect(barAxis([]).ticks).toEqual([0, 1]);
  });

  it("件数がすべて 0 でも、右端は 0 にしない", () => {
    expect(barAxis([0, 0]).max).toBe(1);
  });
});

describe("axisPercent", () => {
  it("軸の右端を 100% にする", () => {
    expect(axisPercent(8, barAxis([7]))).toBe("100%");
  });

  it("右端の半分を 50% にする", () => {
    expect(axisPercent(4, barAxis([7]))).toBe("50%");
  });

  it("0 を 0% にする", () => {
    expect(axisPercent(0, barAxis([7]))).toBe("0%");
  });
});
