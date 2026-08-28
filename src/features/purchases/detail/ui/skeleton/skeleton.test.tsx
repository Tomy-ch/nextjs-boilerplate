// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PurchaseDetailSkeleton } from "./skeleton";

describe("PurchaseDetailSkeleton", () => {
  it("読み上げの対象にしない", () => {
    const { container } = render(<PurchaseDetailSkeleton />);

    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("実物の段組みと同じ枠を出す", () => {
    const { container } = render(<PurchaseDetailSkeleton />);

    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<PurchaseDetailSkeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
