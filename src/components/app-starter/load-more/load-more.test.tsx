// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { LoadMore } from "./load-more";

describe("LoadMore", () => {
  it("続きがあるあいだは、操作も進行も出さずに目印だけを置く", () => {
    render(<LoadMore state={{ status: "idle" }} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("取得している最中は進行を読み上げへ伝える", () => {
    render(<LoadMore state={{ status: "loading" }} />);

    expect(screen.getByRole("status", { name: "続きを読み込んでいます" })).toBeInTheDocument();
  });

  it("読み終えたら何も描かない", () => {
    const { container } = render(<LoadMore state={{ status: "exhausted" }} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("文言を差し替えられる", () => {
    render(
      <LoadMore
        failureMessage="続きの購入を読み込めませんでした。"
        retryLabel="読み直す"
        state={{ status: "failed", onRetry: () => {} }}
      />,
    );

    expect(screen.getByText("続きの購入を読み込めませんでした。")).toBeVisible();
    expect(screen.getByRole("button", { name: "読み直す" })).toBeVisible();
  });

  it("失敗したときだけ読み直す操作を出す", async () => {
    const onRetry = vi.fn();

    render(<LoadMore state={{ status: "failed", onRetry }} />);
    await userEvent.click(screen.getByRole("button", { name: "もう一度読み込む" }));

    expect(screen.getByText("続きを読み込めませんでした。")).toBeVisible();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<LoadMore state={{ status: "failed", onRetry: () => {} }} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
