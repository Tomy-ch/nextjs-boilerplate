// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("装飾的な loading placeholder を表示する", () => {
    render(<Skeleton data-testid="skeleton" className="h-4 w-24" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(skeleton).toHaveAttribute("data-slot", "skeleton");
    expect(skeleton).toHaveClass("bg-muted");
    expect(skeleton).toHaveClass("motion-reduce:animate-none");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Skeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
