// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import GlobalError from "./global-error";

describe("GlobalError", () => {
  it("正規化済みの文言と問い合わせ番号を出す", () => {
    render(
      <GlobalError
        error={Object.assign(new Error("layout が壊れた"), { digest: "9f2c" })}
        reset={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "問題が発生しました。時間をおいて再試行してください。" }),
    ).toBeVisible();
    expect(screen.getByText(/9f2c/)).toBeVisible();
  });

  it("再試行の操作で reset を呼ぶ", async () => {
    const reset = vi.fn();
    render(<GlobalError error={new Error("失敗")} reset={reset} />);

    await userEvent.click(screen.getByRole("button", { name: "再試行する" }));

    expect(reset).toHaveBeenCalledOnce();
  });

  it("digest が無いときは問い合わせ番号の行を出さない", () => {
    render(<GlobalError error={new Error("失敗")} reset={vi.fn()} />);

    expect(screen.queryByText(/識別子/)).not.toBeInTheDocument();
  });
});
