// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { CheckoutConfirmSkeleton } from "./skeleton";

describe("CheckoutConfirmSkeleton", () => {
  it("出来上がりと同じ段組みで枠だけを出す", () => {
    const { container } = render(<CheckoutConfirmSkeleton />);

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("読み上げの対象にしない", () => {
    const { container } = render(<CheckoutConfirmSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<CheckoutConfirmSkeleton />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
