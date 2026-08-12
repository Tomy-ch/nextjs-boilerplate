// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ProductDetailError from "./error";

describe("ProductDetailError", () => {
  // ----- 正常系 -----
  it("生のエラー本文を出さずに正規化済みの文言を出す", () => {
    render(
      <ProductDetailError
        error={Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:8080"), {
          digest: "2741564515",
        })}
        reset={vi.fn()}
      />,
    );

    expect(screen.queryByText(/ECONNREFUSED/)).not.toBeInTheDocument();
    expect(screen.getByText(/問題が発生しました/)).toBeVisible();
  });

  it("再試行の操作で reset を呼ぶ", async () => {
    const reset = vi.fn();
    render(<ProductDetailError error={new Error("失敗")} reset={reset} />);

    await userEvent.click(screen.getByRole("button"));

    expect(reset).toHaveBeenCalledOnce();
  });
});
