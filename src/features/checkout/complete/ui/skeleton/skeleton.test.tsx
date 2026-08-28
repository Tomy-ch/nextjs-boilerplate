// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { CheckoutCompleteSkeleton } from "./skeleton";

describe("CheckoutCompleteSkeleton", () => {
  it("読み上げの対象にしない", () => {
    const { container } = render(<CheckoutCompleteSkeleton />);

    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("実物の段組みと同じ枠を出す", () => {
    const { container } = render(<CheckoutCompleteSkeleton />);

    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<CheckoutCompleteSkeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
