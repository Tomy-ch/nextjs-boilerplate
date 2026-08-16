// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ScrollDirection } from "../../use-scroll-direction";

const { useScrollDirection } = vi.hoisted(() => ({
  useScrollDirection: vi.fn<() => ScrollDirection>(),
}));

vi.mock("../../use-scroll-direction", () => ({ useScrollDirection }));

import { CartSummaryDock } from "./summary-dock";

/** 器の一番外の枠。位置と送りを持つ。 */
function dock(container: HTMLElement) {
  return container.firstElementChild;
}

beforeEach(() => {
  vi.clearAllMocks();
  useScrollDirection.mockReturnValue("up");
});

describe("CartSummaryDock", () => {
  it("渡された集計を中身として出す", () => {
    render(
      <CartSummaryDock>
        <p>小計</p>
      </CartSummaryDock>,
    );

    expect(screen.getByText("小計")).toBeInTheDocument();
  });

  it("隠れているとき、つまみの高さだけを残して器ごと下げる", () => {
    const { container } = render(
      <CartSummaryDock>
        <p>小計</p>
      </CartSummaryDock>,
    );

    expect(dock(container)).toHaveClass("translate-y-[calc(100%-1.5rem)]");
  });

  it("隠れているあいだは、中身を送りの対象から外す", () => {
    render(
      <CartSummaryDock>
        <p>小計</p>
      </CartSummaryDock>,
    );

    expect(screen.getByText("小計").parentElement).toHaveAttribute("inert");
  });

  it("下へ読み進めているあいだは出す", () => {
    useScrollDirection.mockReturnValue("down");

    const { container } = render(
      <CartSummaryDock>
        <p>小計</p>
      </CartSummaryDock>,
    );

    expect(dock(container)).toHaveClass("translate-y-0");
    expect(screen.getByText("小計").parentElement).not.toHaveAttribute("inert");
  });

  it("つまみで開ける", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <CartSummaryDock>
        <p>小計</p>
      </CartSummaryDock>,
    );
    await user.click(screen.getByRole("button", { name: "小計を表示する" }));

    expect(dock(container)).toHaveClass("translate-y-0");
  });

  it("脇に領域を置ける幅では出さない", () => {
    const { container } = render(
      <CartSummaryDock>
        <p>小計</p>
      </CartSummaryDock>,
    );

    expect(dock(container)).toHaveClass("lg:hidden");
  });
});
