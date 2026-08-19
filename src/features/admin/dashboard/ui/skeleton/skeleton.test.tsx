// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AdminDashboardSkeleton } from "./skeleton";

/** 数値カードの枚数。`summary-cards.ts` が返す並びと揃える。 */
const CARD_COUNT = 4;

describe("AdminDashboardSkeleton", () => {
  it("カードの枚数分の枠を出す", () => {
    const { container } = render(<AdminDashboardSkeleton />);

    expect(container.querySelectorAll('[data-slot="skeleton"].h-28').length).toBe(CARD_COUNT);
  });

  it("読み上げからは外れている", () => {
    const { container } = render(<AdminDashboardSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<AdminDashboardSkeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
