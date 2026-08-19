// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PurchaseHistorySkeleton } from "./skeleton";

describe("PurchaseHistorySkeleton", () => {
  it("実際に並ぶ行と同じ数の枠を出す", () => {
    render(<PurchaseHistorySkeleton />);

    expect(screen.getAllByRole("listitem", { hidden: true })).toHaveLength(5);
  });

  it("読み上げの対象にしない", () => {
    const { container } = render(<PurchaseHistorySkeleton />);

    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<PurchaseHistorySkeleton />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
