// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { useCartStore } from "@/stores/cart-store";

import { CartHeaderToggle } from "./header-toggle";

beforeEach(() => {
  useCartStore.setState({ isOpen: false });
});

describe("CartHeaderToggle", () => {
  it("入っている点数を出す", () => {
    render(<CartHeaderToggle count={2} />);

    expect(screen.getByText("2")).toBeVisible();
  });

  it("閉じているとき、開く操作として読める", () => {
    render(<CartHeaderToggle count={0} />);

    expect(screen.getByRole("button", { name: "カートを開く" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("開いているとき、閉じる操作として読める", () => {
    useCartStore.setState({ isOpen: true });

    render(<CartHeaderToggle count={0} />);

    expect(screen.getByRole("button", { name: "カートを閉じる" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("押すと開く要求を立てる", async () => {
    const user = userEvent.setup();

    render(<CartHeaderToggle count={0} />);
    await user.click(screen.getByRole("button"));

    expect(useCartStore.getState().isOpen).toBe(true);
  });

  it("開いているときに押すと要求を下ろす", async () => {
    const user = userEvent.setup();

    useCartStore.setState({ isOpen: true });
    render(<CartHeaderToggle count={0} />);
    await user.click(screen.getByRole("button"));

    expect(useCartStore.getState().isOpen).toBe(false);
  });
});
