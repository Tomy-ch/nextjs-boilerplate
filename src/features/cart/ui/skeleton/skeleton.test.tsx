// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { CartSkeleton } from "./skeleton";

describe("CartSkeleton", () => {
  it("明細 3 行ぶんの枠（サムネイル・商品名・単価・操作）と、集計の枠を出す", () => {
    const { container } = render(<CartSkeleton />);

    expect(container.querySelectorAll("[data-slot=skeleton]")).toHaveLength(3 * 4 + 2);
  });

  it("出来上がりと同じ段組みで待たせる", () => {
    const { container } = render(<CartSkeleton />);

    expect(container.firstElementChild).toHaveClass("lg:flex-row");
  });

  it("待機表示そのものを読み上げから外す", () => {
    const { container } = render(<CartSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<CartSkeleton />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
