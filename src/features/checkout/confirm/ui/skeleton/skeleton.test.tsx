// @vitest-environment jsdom

import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { CheckoutConfirmSkeleton } from "./skeleton";

/** 待機表示の 2 つの段。左が内容、右が集計。 */
function columnsOf(container: HTMLElement): readonly Element[] {
  return [...(container.firstElementChild?.children ?? [])];
}

describe("CheckoutConfirmSkeleton", () => {
  it("内容と集計を左右 2 つの段に分けて出す", () => {
    const [content, summary] = columnsOf(render(<CheckoutConfirmSkeleton />).container);

    expect(content?.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(summary?.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
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
