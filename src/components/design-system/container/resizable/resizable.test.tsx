// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./resizable";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const originalResizeObserver = globalThis.ResizeObserver;

function TwoPanes({
  handleLabel,
  orientation,
  withHandle = false,
}: {
  handleLabel?: string;
  orientation?: "horizontal" | "vertical";
  withHandle?: boolean;
}) {
  return (
    <ResizablePanelGroup orientation={orientation}>
      <ResizablePanel defaultSize="50%" minSize="20%">
        一つ目
      </ResizablePanel>
      <ResizableHandle aria-label={handleLabel} withHandle={withHandle} />
      <ResizablePanel minSize="20%">二つ目</ResizablePanel>
    </ResizablePanelGroup>
  );
}

beforeEach(() => {
  globalThis.ResizeObserver = ResizeObserverStub;
});

afterEach(() => {
  globalThis.ResizeObserver = originalResizeObserver;
});

describe("ResizablePanelGroup", () => {
  it("pane の集合と、その中身を並べる", () => {
    const { container } = render(<TwoPanes />);

    expect(container.querySelector('[data-slot="resizable-panel-group"]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="resizable-panel"]')).toHaveLength(2);
    expect(screen.getByText("一つ目")).toBeInTheDocument();
    expect(screen.getByText("二つ目")).toBeInTheDocument();
  });

  it("境界を separator として公開し、keyboard で到達できる", () => {
    render(<TwoPanes handleLabel="左右の区切り" />);

    const handle = screen.getByRole("separator", { name: "左右の区切り" });

    expect(handle).toHaveAttribute("data-slot", "resizable-handle");
    expect(handle).toHaveAttribute("tabindex", "0");
  });

  it("境界の名前を省略すると既定の名前になる", () => {
    render(<TwoPanes />);

    expect(screen.getByRole("separator")).toHaveAccessibleName("表示領域の区切り");
  });

  it("orientation が境界の向きを決める", () => {
    const { rerender } = render(<TwoPanes />);

    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");

    rerender(<TwoPanes orientation="vertical" />);

    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "horizontal");
  });

  it("withHandle のときだけ標識を置き、標識は読み上げない", () => {
    const { container, rerender } = render(<TwoPanes />);
    const markOf = () => container.querySelector('[data-slot="resizable-handle"] svg');

    expect(markOf()).toBeNull();

    rerender(<TwoPanes withHandle />);

    expect(markOf()).toHaveAttribute("aria-hidden", "true");
  });

  it("動かせない境界を disabled で示す", () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel defaultSize="50%">一つ目</ResizablePanel>
        <ResizableHandle aria-label="左右の区切り" disabled />
        <ResizablePanel>二つ目</ResizablePanel>
      </ResizablePanelGroup>,
    );

    const handle = screen.getByRole("separator", { name: "左右の区切り" });

    expect(handle).toHaveAttribute("aria-disabled", "true");
    expect(handle).toHaveAttribute("data-separator", "disabled");
  });

  it("className で大きさを与えられる", () => {
    const { container } = render(
      <ResizablePanelGroup className="h-64">
        <ResizablePanel>一つ目</ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(container.querySelector('[data-slot="resizable-panel-group"]')).toHaveClass("h-64");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<TwoPanes handleLabel="左右の区切り" withHandle />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("ResizablePanel", () => {
  it("区画 1 つとして slot を持つ要素を描画する", () => {
    const { container } = render(<TwoPanes />);

    expect(container.querySelectorAll('[data-slot="resizable-panel"]')).toHaveLength(2);
  });
});

describe("ResizableHandle", () => {
  it("境界を動かす操作として slot を持つ要素を描画する", () => {
    const { container } = render(<TwoPanes />);

    expect(container.querySelector('[data-slot="resizable-handle"]')).not.toBeNull();
  });

  it("呼び出し側が与えた名前を separator として公開する", () => {
    render(<TwoPanes handleLabel="区画の境界" />);

    expect(screen.getByRole("separator", { name: "区画の境界" })).toHaveAttribute(
      "data-slot",
      "resizable-handle",
    );
  });
});
