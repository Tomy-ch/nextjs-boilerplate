// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ProductFilterApply } from "./filter-apply";

function summary(): HTMLElement {
  return screen.getByRole("status");
}

describe("ProductFilterApply", () => {
  it("押すと確定を伝える", async () => {
    const onApply = vi.fn();
    render(<ProductFilterApply count={12} onApply={onApply} />);

    await userEvent.click(screen.getByRole("button", { name: "絞り込み" }));

    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("確定する前の該当件数を出す", () => {
    render(<ProductFilterApply count={12} onApply={vi.fn()} />);

    expect(summary()).toHaveTextContent("該当件数 12 件");
  });

  it("一致するものが無くても件数として 0 を出す", () => {
    render(<ProductFilterApply count={0} onApply={vi.fn()} />);

    expect(summary()).toHaveTextContent("該当件数 0 件");
  });

  it("数え直している間は 1 つ前の件数を残す", () => {
    render(<ProductFilterApply count={12} counting onApply={vi.fn()} />);

    expect(summary()).toHaveTextContent("該当件数 12 件");
  });

  it("件数が分からないときは数を出さない", () => {
    render(<ProductFilterApply onApply={vi.fn()} />);

    expect(summary()).toHaveTextContent("");
  });

  it("件数が分からなくても押せる状態は変えない", () => {
    render(<ProductFilterApply onApply={vi.fn()} />);

    expect(screen.getByRole("button", { name: "絞り込み" })).toBeEnabled();
  });

  it("反映の取得が終わっていない間は二重に押せない", () => {
    render(<ProductFilterApply count={12} onApply={vi.fn()} pending />);

    expect(screen.getByRole("button", { name: "絞り込み" })).toBeDisabled();
  });

  it("件数を、読み上げへ割り込まずに知らせる領域として出す", () => {
    render(<ProductFilterApply count={12} onApply={vi.fn()} />);

    // status role は暗黙に polite。割り込む alert role でないことがこの表示の要件。
    expect(summary()).toHaveAttribute("role", "status");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<ProductFilterApply count={12} onApply={vi.fn()} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
