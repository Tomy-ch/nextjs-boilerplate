// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductListError } from "./product-list-error";

describe("正常系", () => {
  describe("ProductListError", () => {
    it("正規化済みの文言を示す", () => {
      render(<ProductListError message="現在サービスを利用できません。" onRetry={vi.fn()} />);

      expect(screen.getByText("現在サービスを利用できません。")).toBeInTheDocument();
    });
    it("問い合わせ番号を示す", () => {
      render(<ProductListError message="失敗しました。" digest="2741564515" onRetry={vi.fn()} />);

      expect(screen.getByText("2741564515")).toBeInTheDocument();
    });
    it("再試行を呼び出せる", () => {
      const onRetry = vi.fn();
      render(<ProductListError message="失敗しました。" onRetry={onRetry} />);

      fireEvent.click(screen.getByRole("button", { name: "再試行" }));

      expect(onRetry).toHaveBeenCalledOnce();
    });
  });
});

describe("異常系", () => {
  describe("ProductListError", () => {
    it("問い合わせ番号が無ければ枠ごと出さない", () => {
      render(<ProductListError message="失敗しました。" onRetry={vi.fn()} />);

      expect(screen.queryByText(/問い合わせ番号/)).not.toBeInTheDocument();
    });
  });
});
