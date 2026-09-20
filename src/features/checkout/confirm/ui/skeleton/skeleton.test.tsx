// @vitest-environment jsdom

import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PROFILE } from "../../../checkout.fixture";
import { ShippingCard } from "../shipping-card/shipping-card";
import { CheckoutConfirmSkeleton } from "./skeleton";

/** 待機表示の 2 つの段。左が内容、右が集計。 */
function columnsOf(container: HTMLElement): readonly Element[] {
  return [...(container.firstElementChild?.children ?? [])];
}

/**
 * 項目として並んでいる行を数える。
 *
 * @param container - 数える対象を描いた要素
 * @returns 行の数。要素が無ければ 0
 */
function itemCountOf(container: Element | undefined): number {
  return container?.querySelectorAll('[data-slot="key-value-item"]').length ?? 0;
}

describe("CheckoutConfirmSkeleton", () => {
  it("内容と集計を左右 2 つの段に分けて出す", () => {
    const [content, summary] = columnsOf(render(<CheckoutConfirmSkeleton />).container);

    expect(content?.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(summary?.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("届け先の枠の数を、出来上がりと同じにする", () => {
    const [content] = columnsOf(render(<CheckoutConfirmSkeleton />).container);
    const card = render(<ShippingCard profile={PROFILE} />).container;

    expect(itemCountOf(content)).toBe(itemCountOf(card));
  });

  it("読み上げの対象にしない", () => {
    const { container } = render(<CheckoutConfirmSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(within(container).queryAllByRole("generic")).toHaveLength(0);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<CheckoutConfirmSkeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
