// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductListSkeleton } from "./product-list-skeleton";

describe("ProductListSkeleton", () => {
  // ----- 正常系 -----
  it("並ぶものと同じ段組みで枠を出す", () => {
    const { container } = render(<ProductListSkeleton />);

    expect(container.querySelectorAll("li")).toHaveLength(6);
  });

  it("待機中の枠を支援技術へ読ませない", () => {
    render(<ProductListSkeleton />);

    expect(screen.getByRole("list", { hidden: true })).toHaveAttribute("aria-hidden", "true");
  });
});
