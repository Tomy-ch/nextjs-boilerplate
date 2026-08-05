// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";

function HoverCardFixture() {
  return (
    <HoverCard open>
      <HoverCardTrigger asChild>
        <a href="https://github.com/">GitHub</a>
      </HoverCardTrigger>
      <HoverCardContent aria-label="GitHub の補足情報">
        公開されているプロジェクト情報を確認できます。
      </HoverCardContent>
    </HoverCard>
  );
}

describe("HoverCard", () => {
  it("trigger と Portal に表示する補足内容を合成する", () => {
    render(<HoverCardFixture />);

    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/",
    );
    expect(screen.getByLabelText("GitHub の補足情報")).toHaveTextContent(
      "公開されているプロジェクト情報を確認できます。",
    );
  });

  it("a11y 自動検査に違反しない", async () => {
    // Portal で body 直下へ描くため baseElement を渡す。container では trigger しか入らず、
    // 検査対象が空になる。
    const { baseElement } = render(<HoverCardFixture />);

    expect(
      (
        await axe(baseElement, {
          rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
  });
});
