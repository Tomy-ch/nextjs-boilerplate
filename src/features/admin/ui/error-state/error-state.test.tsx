// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { AdminScreenError } from "./error-state";

describe("AdminScreenError", () => {
  it("正規化済みの文言を出す", () => {
    render(<AdminScreenError message="時間をおいて試してください。" onRetry={vi.fn()} />);

    expect(screen.getByText("時間をおいて試してください。")).toBeInTheDocument();
  });

  it("問い合わせ番号を添える", () => {
    render(<AdminScreenError digest="abc123" message="失敗しました。" onRetry={vi.fn()} />);

    expect(screen.getByText("abc123")).toBeInTheDocument();
  });

  it("問い合わせ番号が無ければその行を出さない", () => {
    render(<AdminScreenError message="失敗しました。" onRetry={vi.fn()} />);

    expect(screen.queryByText(/問い合わせ番号/)).not.toBeInTheDocument();
  });

  it("再試行を呼び出し元へ渡す", async () => {
    const onRetry = vi.fn();

    render(<AdminScreenError message="失敗しました。" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "再試行" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(
      <AdminScreenError digest="abc123" message="失敗しました。" onRetry={vi.fn()} />,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
