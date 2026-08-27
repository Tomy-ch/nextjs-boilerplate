// @vitest-environment jsdom

import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AdminSummarySkeleton } from "./skeleton";

/** 数値カードの枚数。`summary-cards.ts` が返す並びと揃える。 */
const CARD_COUNT = 4;

/** 待機表示の 2 つの区画。上がカードの枠、下が内訳の帯。 */
function blocksOf(container: HTMLElement): readonly Element[] {
  return [...(container.firstElementChild?.children ?? [])];
}

describe("AdminSummarySkeleton", () => {
  it("カードの枠と内訳の帯を、この順で出す", () => {
    const [cards, band] = blocksOf(render(<AdminSummarySkeleton />).container);

    expect(cards?.children).toHaveLength(CARD_COUNT);
    expect(band?.children).toHaveLength(2);
  });

  it("出す枠はすべて待機表示である", () => {
    const [cards] = blocksOf(render(<AdminSummarySkeleton />).container);

    expect(
      [...(cards?.children ?? [])].every((card) => card.getAttribute("data-slot") === "skeleton"),
    ).toBe(true);
  });

  it("読み上げからは外れている", () => {
    const { container } = render(<AdminSummarySkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(within(container).queryAllByRole("generic")).toHaveLength(0);
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<AdminSummarySkeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
