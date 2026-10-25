// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PLACEHOLDER_ROWS, WalletSkeleton } from "./skeleton";

describe("WalletSkeleton", () => {
  it("受け取り欄の 2 枚の後に、宣言した数の行の枠を並べる", () => {
    const { container } = render(<WalletSkeleton />);
    const blocks = [...(container.firstElementChild?.children ?? [])];

    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(2);
    expect(blocks[1]?.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(PLACEHOLDER_ROWS);
  });

  it("読み上げへ何も伝えない", () => {
    const { container } = render(<WalletSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.textContent).toBe("");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<WalletSkeleton />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
