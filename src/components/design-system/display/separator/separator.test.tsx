// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Separator } from "./separator";

describe("Separator", () => {
  it("既定で水平の意味論的な区切りを表示する", () => {
    render(<Separator />);
    expect(screen.getByRole("separator")).toHaveAttribute("data-orientation", "horizontal");
  });

  it("垂直方向を指定できる", () => {
    render(<Separator orientation="vertical" />);
    expect(document.querySelector("[data-slot='separator']")).toHaveAttribute(
      "data-orientation",
      "vertical",
    );
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Separator />);
    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
