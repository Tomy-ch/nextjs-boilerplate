// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PurchaseDetailSkeleton } from "./skeleton";

describe("PurchaseDetailSkeleton", () => {
  it("読み上げの対象にしない", () => {
    const { container } = render(<PurchaseDetailSkeleton />);

    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("実際に並ぶ明細と同じ数の行を出す", () => {
    render(<PurchaseDetailSkeleton />);

    expect(screen.getAllByRole("listitem", { hidden: true })).toHaveLength(3);
  });

  it("実物の段組みと同じ数の枠を出す", () => {
    const { container } = render(<PurchaseDetailSkeleton />);

    expect(container.querySelectorAll("[data-slot='skeleton']")).toHaveLength(16);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<PurchaseDetailSkeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
