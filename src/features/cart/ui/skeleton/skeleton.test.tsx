// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { CartSkeleton } from "./skeleton";

describe("CartSkeleton", () => {
  it("実際に並ぶ明細と同じ数の枠を出す", () => {
    render(<CartSkeleton />);

    expect(screen.getAllByRole("listitem", { hidden: true })).toHaveLength(3);
  });

  it("1 画面ぶんの高さを確保し、中身が届いても footer を動かさない", () => {
    const { container } = render(<CartSkeleton />);

    expect(container.firstChild).toHaveClass("min-h-svh");
  });

  it("読み上げの対象にしない", () => {
    const { container } = render(<CartSkeleton />);

    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<CartSkeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
