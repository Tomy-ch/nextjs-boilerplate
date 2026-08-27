// @vitest-environment jsdom

import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AdminProductListSkeleton } from "./skeleton";

describe("AdminProductListSkeleton", () => {
  it("表の形が伝わる数の枠を出す", () => {
    const { container } = render(<AdminProductListSkeleton />);

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(7);
  });

  it("待機の枠を支援技術へ読ませない", () => {
    const { container } = render(<AdminProductListSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(within(container).queryAllByRole("generic")).toHaveLength(0);
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<AdminProductListSkeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
