// @vitest-environment jsdom

import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AdminProductDiscontinueSkeleton } from "./skeleton";

describe("AdminProductDiscontinueSkeleton", () => {
  it("見積もりの枠と、その下に続く領域の枠を出す", () => {
    const { container } = render(<AdminProductDiscontinueSkeleton />);

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
  });

  it("待機の枠を支援技術へ読ませない", () => {
    const { container } = render(<AdminProductDiscontinueSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(within(container).queryAllByRole("generic")).toHaveLength(0);
  });

  it("どの立ち位置になるかを約束する文言や操作を出さない", () => {
    const { container } = render(<AdminProductDiscontinueSkeleton />);

    expect(container.textContent).toBe("");
    expect(within(container).queryByRole("button")).not.toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<AdminProductDiscontinueSkeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
