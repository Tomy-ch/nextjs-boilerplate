// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import AdminError from "./error";

function renderError(digest?: string) {
  const reset = vi.fn();

  render(<AdminError error={Object.assign(new Error("失敗"), { digest })} reset={reset} />);

  return { reset };
}

describe("AdminError", () => {
  it("取得に失敗したことを伝える", () => {
    renderError();

    expect(screen.getByText("商品を取得できませんでした")).toBeInTheDocument();
  });

  it("生のエラー本文を出さない", () => {
    renderError();

    expect(screen.queryByText("失敗")).not.toBeInTheDocument();
  });

  it("問い合わせ番号を渡す", () => {
    renderError("abc123");

    expect(screen.getByText("abc123")).toBeInTheDocument();
  });

  it("再試行で境界を作り直す", async () => {
    const { reset } = renderError();

    await userEvent.click(screen.getByRole("button", { name: "再試行" }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<AdminError error={new Error("失敗")} reset={vi.fn()} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
