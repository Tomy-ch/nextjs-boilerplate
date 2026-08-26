// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("このリポジトリが何であるかを 1 文で出す", () => {
    render(<SiteFooter />);

    expect(
      screen.getByText("Next.js / React のプレゼンテーション層 boilerplate です。"),
    ).toBeVisible();
  });

  it("リポジトリへの導線を並べる", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("navigation", { name: "リポジトリ" })).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<SiteFooter />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
