// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { CartSkeleton } from "./skeleton";

/** 明細 1 行ぶんの枠をまとめている器。 */
function rowsOf(container: HTMLElement) {
  return container.querySelectorAll('[class*="@container/line"]');
}

describe("CartSkeleton", () => {
  it("明細 3 行ぶんの枠と、集計の枠を出す", () => {
    const { container } = render(<CartSkeleton />);
    const rows = rowsOf(container);

    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.querySelectorAll("[data-slot=skeleton]")).toHaveLength(4);
    }
    expect(container.querySelectorAll("[data-slot=skeleton]")).toHaveLength(3 * 4 + 2);
  });

  it("明細の行頭にサムネイルと同じ寸法の枠を置く", () => {
    const { container } = render(<CartSkeleton />);

    expect(rowsOf(container)[0]?.firstElementChild).toHaveClass(
      "w-12",
      "@sm/line:w-16",
      "aspect-square",
    );
  });

  it("出来上がりと同じ段組みで待たせる", () => {
    const { container } = render(<CartSkeleton />);

    expect(container.firstElementChild).toHaveClass("lg:flex-row");
  });

  it("待機表示そのものを読み上げから外す", () => {
    const { container } = render(<CartSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<CartSkeleton />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
