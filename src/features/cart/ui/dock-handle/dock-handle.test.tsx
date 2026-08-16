// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CartDockHandle } from "./dock-handle";

describe("CartDockHandle", () => {
  it("隠れているとき、開く操作として読める", () => {
    render(<CartDockHandle onToggle={vi.fn()} shown={false} />);

    const handle = screen.getByRole("button", { name: "小計を表示する" });

    expect(handle).toHaveAttribute("aria-expanded", "false");
  });

  it("出ているとき、隠す操作として読める", () => {
    render(<CartDockHandle onToggle={vi.fn()} shown />);

    const handle = screen.getByRole("button", { name: "小計を隠す" });

    expect(handle).toHaveAttribute("aria-expanded", "true");
  });

  it("押したら切り替えを呼ぶ", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();

    render(<CartDockHandle onToggle={onToggle} shown={false} />);
    await user.click(screen.getByRole("button"));

    expect(onToggle).toHaveBeenCalledOnce();
  });
});
