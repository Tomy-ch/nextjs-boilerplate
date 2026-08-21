// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AdminProductStockSkeleton } from "./skeleton";

describe("AdminProductStockSkeleton", () => {
  it("現在の在庫・向き・量・送信の 4 つぶんの枠を出す", () => {
    const { container } = render(<AdminProductStockSkeleton />);

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(4);
  });

  it("待機の枠を支援技術へ読ませない", () => {
    const { container } = render(<AdminProductStockSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<AdminProductStockSkeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
