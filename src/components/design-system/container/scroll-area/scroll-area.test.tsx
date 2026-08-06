// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { useId } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ScrollArea } from "./scroll-area";

function HeadingLabelledFixture() {
  const headingId = useId();

  return (
    <>
      <h2 id={headingId}>明細</h2>
      <ScrollArea aria-labelledby={headingId}>内容</ScrollArea>
    </>
  );
}

describe("ScrollArea", () => {
  it("keyboard で到達できる region として公開する", () => {
    render(<ScrollArea aria-label="明細">内容</ScrollArea>);

    const region = screen.getByRole("region", { name: "明細" });

    expect(region).toHaveAttribute("data-slot", "scroll-area");
    expect(region).toHaveAttribute("tabindex", "0");
  });

  it("見出しの id を aria-labelledby でアクセシブルな名前にできる", () => {
    render(<HeadingLabelledFixture />);

    expect(screen.getByRole("region")).toHaveAccessibleName("明細");
  });

  it("内容が focus 可能な要素だけのときは tabIndex を外せる", () => {
    render(
      <ScrollArea aria-label="絞り込み条件" tabIndex={-1}>
        <button type="button">条件を追加</button>
      </ScrollArea>,
    );

    expect(screen.getByRole("region")).toHaveAttribute("tabindex", "-1");
  });

  it("既定では縦方向だけスクロールする", () => {
    render(<ScrollArea aria-label="明細">内容</ScrollArea>);

    expect(screen.getByRole("region")).toHaveClass("overflow-y-auto");
  });

  it("orientation で横方向・両方向へ切り替える", () => {
    const { rerender } = render(
      <ScrollArea aria-label="明細" orientation="horizontal">
        内容
      </ScrollArea>,
    );

    expect(screen.getByRole("region")).toHaveClass("overflow-x-auto");

    rerender(
      <ScrollArea aria-label="明細" orientation="both">
        内容
      </ScrollArea>,
    );

    expect(screen.getByRole("region")).toHaveClass("overflow-auto");
  });

  it("スクロールを親へ連鎖させない", () => {
    render(<ScrollArea aria-label="明細">内容</ScrollArea>);

    expect(screen.getByRole("region")).toHaveClass("overscroll-contain");
  });

  it("className で領域の大きさを与えられる", () => {
    render(
      <ScrollArea aria-label="明細" className="max-h-56">
        内容
      </ScrollArea>,
    );

    expect(screen.getByRole("region")).toHaveClass("max-h-56");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<HeadingLabelledFixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
