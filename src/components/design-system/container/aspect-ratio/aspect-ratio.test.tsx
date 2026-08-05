// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AspectRatio } from "./aspect-ratio";

describe("AspectRatio", () => {
  it("指定した比率を CSS の aspect-ratio として与える", () => {
    const { container } = render(<AspectRatio ratio={16 / 9}>内容</AspectRatio>);

    const box = container.querySelector("[data-slot='aspect-ratio']");

    expect(box).toHaveStyle({ aspectRatio: String(16 / 9) });
  });

  it("比率を省略すると正方形になる", () => {
    const { container } = render(<AspectRatio>内容</AspectRatio>);

    expect(container.querySelector("[data-slot='aspect-ratio']")).toHaveStyle({ aspectRatio: "1" });
  });

  it("内容に押し広げられないよう溢れを切る", () => {
    const { container } = render(<AspectRatio ratio={16 / 9}>内容</AspectRatio>);

    expect(container.querySelector("[data-slot='aspect-ratio']")).toHaveClass("overflow-hidden");
  });

  it("client runtime を必要としない Server Component として描画する", () => {
    render(<AspectRatio ratio={16 / 9}>内容</AspectRatio>);

    expect(screen.getByText("内容")).toBeInTheDocument();
  });

  it("className と style を呼び出し元が拡張できる", () => {
    const { container } = render(
      <AspectRatio className="rounded-md" ratio={2} style={{ maxWidth: "20rem" }}>
        内容
      </AspectRatio>,
    );

    const box = container.querySelector("[data-slot='aspect-ratio']");

    expect(box).toHaveClass("rounded-md", "overflow-hidden");
    expect(box).toHaveStyle({ aspectRatio: "2", maxWidth: "20rem" });
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<AspectRatio ratio={16 / 9}>内容</AspectRatio>);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
