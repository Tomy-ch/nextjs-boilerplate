// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

function ExampleCollapsible() {
  return (
    <Collapsible>
      <CollapsibleTrigger>補足を表示</CollapsibleTrigger>
      <CollapsibleContent>確認する補足内容です。</CollapsibleContent>
    </Collapsible>
  );
}

describe("Collapsible", () => {
  it("native details と summary で補助内容を開閉する", () => {
    render(<ExampleCollapsible />);

    const collapsible = screen.getByText("補足を表示").closest("details");
    if (collapsible === null) throw new Error("collapsible が見つかりません。");

    expect(collapsible).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("補足を表示"));
    expect(collapsible).toHaveAttribute("open");
  });

  it("初期状態で開ける", () => {
    render(
      <Collapsible open>
        <CollapsibleTrigger>詳細</CollapsibleTrigger>
        <CollapsibleContent>初期表示する内容です。</CollapsibleContent>
      </Collapsible>,
    );

    expect(screen.getByText("詳細").closest("details")).toHaveAttribute("open");
  });

  it("hover 時も背景色と文字色のコントラストを保つ", () => {
    render(<ExampleCollapsible />);

    expect(screen.getByText("補足を表示")).toHaveClass(
      "hover:bg-foreground",
      "hover:text-background",
    );
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<ExampleCollapsible />);
    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

describe("CollapsibleTrigger", () => {
  // ----- 正常系 -----
  it("開閉を切り替える summary として slot を持つ要素を描画する", () => {
    render(<ExampleCollapsible />);

    const trigger = screen.getByText("補足を表示");

    expect(trigger).toHaveAttribute("data-slot", "collapsible-trigger");
    expect(trigger.tagName).toBe("SUMMARY");
  });
});

describe("CollapsibleContent", () => {
  // ----- 正常系 -----
  it("内容として slot を持つ要素を描画する", () => {
    render(<ExampleCollapsible />);

    expect(screen.getByText("確認する補足内容です。")).toHaveAttribute(
      "data-slot",
      "collapsible-content",
    );
  });

  it("既定では details が閉じた状態で始まる", () => {
    const { container } = render(<ExampleCollapsible />);

    expect(container.querySelector("details")).not.toHaveAttribute("open");
  });
});
