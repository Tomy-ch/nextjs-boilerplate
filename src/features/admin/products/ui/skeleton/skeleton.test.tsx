// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AdminProductListSkeleton } from "./skeleton";

describe("AdminProductListSkeleton", () => {
  it("見出しと既定の行数ぶんの枠を出す", () => {
    const { container } = render(<AdminProductListSkeleton />);

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(7);
  });

  it("待機の枠を支援技術へ読ませない", () => {
    const { container } = render(<AdminProductListSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<AdminProductListSkeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
