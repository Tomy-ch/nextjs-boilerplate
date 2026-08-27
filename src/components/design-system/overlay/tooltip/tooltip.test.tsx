// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

function TooltipFixture({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <TooltipProvider>
      <Tooltip defaultOpen={defaultOpen}>
        <TooltipTrigger>為替の参考額</TooltipTrigger>
        <TooltipContent>表示時点の参考レートで換算した概算です。</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

describe("Tooltip", () => {
  it("開くまで内容を表示しない", () => {
    render(<TooltipFixture />);

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("閉じている間は trigger に説明を関連付けない", () => {
    render(<TooltipFixture />);

    const trigger = screen.getByRole("button", { name: "為替の参考額" });

    expect(trigger).not.toHaveAttribute("aria-describedby");
    expect(trigger).toHaveAttribute("data-slot", "tooltip-trigger");
  });

  it("keyboard focus で Portal の内容を表示し、trigger の説明にする", async () => {
    render(<TooltipFixture />);

    const trigger = screen.getByRole("button", { name: "為替の参考額" });

    await userEvent.tab();

    const content = screen.getByRole("tooltip");

    expect(content).toHaveAttribute("data-slot", "tooltip-content");
    expect(trigger).toHaveAccessibleDescription("表示時点の参考レートで換算した概算です。");
  });

  it("focus が外れると閉じる", async () => {
    render(<TooltipFixture />);

    await userEvent.tab();

    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    await userEvent.tab();

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("Escape で閉じる", async () => {
    render(<TooltipFixture defaultOpen />);

    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("trigger のアクセシブルな名前は tooltip の内容ではなく trigger 自身が持つ", () => {
    render(
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger aria-label="補足を表示" />
          <TooltipContent>この値は保存されません。</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByRole("button", { name: "補足を表示" });

    expect(trigger).toHaveAccessibleName("補足を表示");
    expect(trigger).toHaveAccessibleDescription("この値は保存されません。");
  });

  it("開いた状態で a11y 自動検査に違反しない", async () => {
    const { baseElement } = render(<TooltipFixture defaultOpen />);

    const result = await axe(baseElement, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });

    expect(result.violations).toEqual([]);
  });
});

describe("TooltipProvider", () => {
  it("配下の tooltip を成立させる", () => {
    expect(() => render(<TooltipFixture />)).not.toThrow();
  });

  it("provider の外に置いた tooltip を成立させない", () => {
    expect(() =>
      render(
        <Tooltip>
          <TooltipTrigger>為替の参考額</TooltipTrigger>
          <TooltipContent>概算です。</TooltipContent>
        </Tooltip>,
      ),
    ).toThrow();
  });
});

describe("TooltipTrigger", () => {
  it("補足の対象として slot を持つ要素を描画する", () => {
    render(<TooltipFixture />);

    expect(screen.getByRole("button", { name: "為替の参考額" })).toHaveAttribute(
      "data-slot",
      "tooltip-trigger",
    );
  });
});

describe("TooltipContent", () => {
  it("開いている間は補足を tooltip として描画する", () => {
    render(<TooltipFixture defaultOpen />);

    expect(screen.getAllByText("表示時点の参考レートで換算した概算です。")[0]).toBeVisible();
  });

  it("閉じている間は補足を描画しない", () => {
    render(<TooltipFixture />);

    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
