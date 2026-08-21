import { describe, expect, it } from "vitest";

import { contrastRatio } from "./contrast";

const WHITE = "rgb(255, 255, 255)";
const BLACK = "rgb(0, 0, 0)";

describe("contrastRatio", () => {
  // ----- 正常系 -----
  it("白と黒の比は 21 になる", () => {
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 10);
  });

  it("引数の順序を入れ替えても同じ比を返す", () => {
    expect(contrastRatio(BLACK, WHITE)).toBe(contrastRatio(WHITE, BLACK));
  });

  it("同じ色どうしの比は 1 になる", () => {
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 10);
  });

  it("白地の #767676 は、WCAG の AA 境界どおり 4.54 になる", () => {
    expect(contrastRatio("rgb(118, 118, 118)", WHITE)).toBeCloseTo(4.54, 2);
  });

  it("ガンマ補正の要らない暗さでは、線形の側の式で比を出す", () => {
    expect(contrastRatio("rgb(10, 10, 10)", BLACK)).toBeCloseTo(1.0607, 4);
  });

  it("透明度が付いていても、色として読める 3 つで比を出す", () => {
    expect(contrastRatio("rgba(255, 255, 255, 0.5)", BLACK)).toBe(contrastRatio(WHITE, BLACK));
  });

  // ----- 異常系 -----
  it("数値を 1 つも持たない表記は読み取れない", () => {
    expect(contrastRatio("color-mix(in oklab, var(--a), var(--b))", BLACK)).toBeNull();
  });

  it("数値が 3 つに満たない表記は読み取れない", () => {
    expect(contrastRatio("rgb(10, 20)", BLACK)).toBeNull();
  });

  it("数値として読めない並びは読み取れない", () => {
    expect(contrastRatio("rgb(1.2.3, 0, 0)", BLACK)).toBeNull();
  });

  it("片方だけが読み取れない場合も null を返す", () => {
    expect(contrastRatio(WHITE, "")).toBeNull();
  });
});
