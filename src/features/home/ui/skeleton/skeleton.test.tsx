// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { HomeSkeleton } from "./skeleton";

describe("HomeSkeleton", () => {
  // ----- 正常系 -----
  it("節の見出しは枠にせず、そのまま出す", () => {
    render(<HomeSkeleton />);

    expect(screen.getByText("新着商品")).toBeInTheDocument();
    expect(screen.getByText("売上ランキング")).toBeInTheDocument();
    expect(screen.getByText("カテゴリから探す")).toBeInTheDocument();
  });

  it("読み上げの対象から外す", () => {
    const { container } = render(<HomeSkeleton />);

    expect(container.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });

  it("a11y 違反が無い", async () => {
    const { container } = render(<HomeSkeleton />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
