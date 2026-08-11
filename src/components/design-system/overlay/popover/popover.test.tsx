// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { useId } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./popover";

function PopoverFixture({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Popover defaultOpen={defaultOpen}>
      <PopoverTrigger>補足を開く</PopoverTrigger>
      <PopoverContent aria-describedby={descriptionId} aria-labelledby={titleId}>
        <PopoverHeader>
          <PopoverTitle id={titleId}>表示条件</PopoverTitle>
          <PopoverDescription id={descriptionId}>
            条件を満たす項目だけを一覧に表示します。
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

describe("Popover", () => {
  it("開くまで内容を表示しない", () => {
    render(<PopoverFixture />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "補足を開く" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("trigger の操作で Portal の内容を表示し、見出しをアクセシブルな名前にする", () => {
    render(<PopoverFixture />);

    fireEvent.click(screen.getByRole("button", { name: "補足を開く" }));

    const content = screen.getByRole("dialog", { name: "表示条件" });

    expect(content).toHaveAttribute("data-slot", "popover-content");
    expect(content).toHaveAccessibleDescription("条件を満たす項目だけを一覧に表示します。");
    expect(screen.getByRole("button", { name: "補足を開く" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("trigger の aria-controls が実在する内容を指す", () => {
    render(<PopoverFixture defaultOpen />);

    const trigger = screen.getByRole("button", { name: "補足を開く" });
    const content = screen.getByRole("dialog", { name: "表示条件" });

    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(content.id).not.toBe("");
    expect(trigger).toHaveAttribute("aria-controls", content.id);
  });

  it("閉じている間は aria-controls を持たない", () => {
    render(<PopoverFixture />);

    expect(screen.getByRole("button", { name: "補足を開く" })).not.toHaveAttribute("aria-controls");
  });

  it("ページ内容へ重ねても背後が透けない不透明な面として描画する", () => {
    render(<PopoverFixture defaultOpen />);

    const content = screen.getByRole("dialog", { name: "表示条件" });

    expect(content).toHaveClass("bg-background", "text-foreground", "border-border");
  });

  it("Escape で閉じる", () => {
    render(<PopoverFixture defaultOpen />);

    expect(screen.getByRole("dialog", { name: "表示条件" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("PopoverAnchor で trigger とは別の要素を位置基準にできる", () => {
    render(
      <Popover defaultOpen>
        <PopoverAnchor data-testid="anchor">
          <PopoverTrigger>変更</PopoverTrigger>
        </PopoverAnchor>
        <PopoverContent aria-label="日付の変更">基準要素を分けた場合の内容です。</PopoverContent>
      </Popover>,
    );

    expect(screen.getByTestId("anchor")).toHaveAttribute("data-slot", "popover-anchor");
    expect(screen.getByRole("dialog", { name: "日付の変更" })).toBeInTheDocument();
  });

  it("開いた状態で a11y 自動検査に違反しない", async () => {
    const { baseElement } = render(<PopoverFixture defaultOpen />);

    const result = await axe(baseElement, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("PopoverTrigger", () => {
  // ----- 正常系 -----
  it("開閉を切り替える操作として slot を持つ要素を描画する", () => {
    render(
      <Popover>
        <PopoverTrigger>補足を開く</PopoverTrigger>
      </Popover>,
    );

    expect(screen.getByRole("button", { name: "補足を開く" })).toHaveAttribute(
      "data-slot",
      "popover-trigger",
    );
  });

  it("押すと内容を開く", () => {
    render(<PopoverFixture />);

    fireEvent.click(screen.getByRole("button", { name: "補足を開く" }));

    expect(screen.getByRole("dialog")).toBeVisible();
  });
});

describe("PopoverContent", () => {
  // ----- 正常系 -----
  it("開いた内容として slot を持つ要素を描画する", () => {
    render(<PopoverFixture defaultOpen />);

    expect(screen.getByRole("dialog")).toHaveAttribute("data-slot", "popover-content");
  });

  // ----- 異常系 -----
  it("閉じている間は内容を描画しない", () => {
    render(<PopoverFixture />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("PopoverAnchor", () => {
  // ----- 正常系 -----
  it("位置の基準として slot を持つ要素を描画する", () => {
    const { container } = render(
      <Popover>
        <PopoverAnchor>基準</PopoverAnchor>
      </Popover>,
    );

    expect(container.querySelector('[data-slot="popover-anchor"]')).not.toBeNull();
  });
});

describe("PopoverHeader", () => {
  // ----- 正常系 -----
  it("見出し枠として slot を持つ要素を描画する", () => {
    render(<PopoverHeader>見出し枠</PopoverHeader>);

    expect(screen.getByText("見出し枠")).toHaveAttribute("data-slot", "popover-header");
  });
});

describe("PopoverTitle", () => {
  // ----- 正常系 -----
  it("題名として slot を持つ要素を描画する", () => {
    render(<PopoverTitle>表示条件</PopoverTitle>);

    expect(screen.getByText("表示条件")).toHaveAttribute("data-slot", "popover-title");
  });
});

describe("PopoverDescription", () => {
  // ----- 正常系 -----
  it("補足として slot を持つ要素を描画する", () => {
    render(<PopoverDescription>条件の説明</PopoverDescription>);

    expect(screen.getByText("条件の説明")).toHaveAttribute("data-slot", "popover-description");
  });
});
