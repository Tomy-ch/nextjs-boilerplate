// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import ProductsError from "./error";

describe("ProductsError", () => {
  it("生のエラー本文を出さずに正規化済みの文言を出す", () => {
    render(
      <ProductsError
        error={Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:8080"), {
          digest: "2741564515",
        })}
        reset={vi.fn()}
      />,
    );

    expect(screen.queryByText(/ECONNREFUSED/)).not.toBeInTheDocument();
    expect(screen.getByText(/問題が発生しました/)).toBeInTheDocument();
  });

  it("問い合わせ番号を出す", () => {
    render(
      <ProductsError
        error={Object.assign(new Error("失敗"), { digest: "2741564515" })}
        reset={vi.fn()}
      />,
    );

    expect(screen.getByText("2741564515")).toBeInTheDocument();
  });

  it("再試行が境界の reset を呼ぶ", () => {
    const reset = vi.fn();
    render(<ProductsError error={new Error("失敗")} reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: "再試行" }));

    expect(reset).toHaveBeenCalledOnce();
  });

  it("a11y 違反を持たない", async () => {
    const { container } = render(
      <ProductsError
        error={Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:8080"), {
          digest: "2741564515",
        })}
        reset={vi.fn()}
      />,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
