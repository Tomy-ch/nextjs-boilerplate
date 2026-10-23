// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductListSkeleton } from "./skeleton";

describe("ProductListSkeleton", () => {
  it("並ぶものと同じ段組みで枠を出す", () => {
    const { container } = render(<ProductListSkeleton />);

    expect(container.querySelectorAll("li")).toHaveLength(4);
  });

  it("待機中の枠を支援技術へ読ませない", () => {
    const { container } = render(<ProductListSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryAllByRole("list")).toHaveLength(0);
  });
});
