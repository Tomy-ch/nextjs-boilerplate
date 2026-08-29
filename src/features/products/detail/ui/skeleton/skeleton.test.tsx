// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ProductDetailSkeleton } from "./skeleton";

describe("ProductDetailSkeleton", () => {
  it("読み上げの対象にしない", () => {
    const { container } = render(<ProductDetailSkeleton />);

    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("実物の段組みと同じ数の枠を出す", () => {
    const { container } = render(<ProductDetailSkeleton />);

    expect(container.querySelectorAll("[data-slot='skeleton']")).toHaveLength(9);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<ProductDetailSkeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
