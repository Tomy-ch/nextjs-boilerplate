import { describe, expect, it } from "vitest";

import type { Change } from "../lib/numstat";
import { countChangedLines, isCounted } from "./volume";

/** 変更 1 件。 */
function change(path: string, changedLines = 1): Change {
  return { path, changedLines };
}

describe("isCounted", () => {
  // ----- 正常系 -----
  it("描画とロジックを数える", () => {
    expect(isCounted("src/features/cart/cart-view.tsx")).toBe(true);
  });

  it("配色と寸法の宣言を数える", () => {
    expect(isCounted("tokens/color.json")).toBe(true);
  });

  it("story の写り方を決める設定を数える", () => {
    expect(isCounted(".storybook/preview.tsx")).toBe(true);
  });

  it("撮影と axe の対象そのものである story を数える", () => {
    expect(isCounted("src/components/ui/button.stories.tsx")).toBe(true);
  });

  it("検査の手順そのものである spec を数える", () => {
    expect(isCounted("e2e/journeys/checkout.spec.ts")).toBe(true);
  });

  it("画面の中身になる契約駆動モックを数える", () => {
    expect(isCounted("mocks/handlers.ts")).toBe(true);
  });

  it("撮影の手順そのものである spec を数える", () => {
    expect(isCounted("vrt/stories.spec.ts")).toBe(true);
  });

  // ----- 異常系 -----
  it("単体テストは数えない", () => {
    expect(isCounted("src/features/cart/cart-view.test.tsx")).toBe(false);
    expect(isCounted("src/features/cart/total.test.ts")).toBe(false);
  });

  it("散文は数えない", () => {
    expect(isCounted("src/features/cart/README.md")).toBe(false);
  });

  it("挙げていないパスは数えない", () => {
    expect(isCounted("docs/adr/0091-test-verification-methods.md")).toBe(false);
    expect(isCounted("package.json")).toBe(false);
  });
});

describe("countChangedLines", () => {
  // ----- 正常系 -----
  it("数える対象だけを合計する", () => {
    expect(
      countChangedLines([
        change("src/app/page.tsx", 30),
        change("tokens/color.json", 12),
        change("docs/adr/0091-test-verification-methods.md", 400),
        change("src/app/page.test.tsx", 200),
      ]),
    ).toBe(42);
  });

  it("変更が 1 つも無ければ 0 を返す", () => {
    expect(countChangedLines([])).toBe(0);
  });

  // ----- 異常系 -----
  it("数える対象が無ければ 0 を返す", () => {
    expect(countChangedLines([change("README.md", 500)])).toBe(0);
  });
});
