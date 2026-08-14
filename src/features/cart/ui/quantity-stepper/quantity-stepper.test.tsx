// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CartQuantityStepper } from "./quantity-stepper";

describe("CartQuantityStepper", () => {
  it("現在の数量を表示する", () => {
    render(<CartQuantityStepper label="深煎りブレンド" max={9} onChange={vi.fn()} quantity={3} />);

    expect(screen.getByText("3")).toBeVisible();
  });

  it("増やす操作で 1 つ多い数量を渡す", async () => {
    const onChange = vi.fn();
    render(<CartQuantityStepper label="深煎りブレンド" max={9} onChange={onChange} quantity={3} />);

    await userEvent.click(screen.getByRole("button", { name: "深煎りブレンド を 1 つ増やす" }));

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("減らす操作で 1 つ少ない数量を渡す", async () => {
    const onChange = vi.fn();
    render(<CartQuantityStepper label="深煎りブレンド" max={9} onChange={onChange} quantity={3} />);

    await userEvent.click(screen.getByRole("button", { name: "深煎りブレンド を 1 つ減らす" }));

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("数量が 1 なら減らす操作を削除として示す", () => {
    render(<CartQuantityStepper label="深煎りブレンド" max={9} onChange={vi.fn()} quantity={1} />);

    expect(screen.getByRole("button", { name: "深煎りブレンド を削除する" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "深煎りブレンド を 1 つ減らす" }),
    ).not.toBeInTheDocument();
  });

  it("削除として示している操作は 0 を渡す", async () => {
    const onChange = vi.fn();
    render(<CartQuantityStepper label="深煎りブレンド" max={9} onChange={onChange} quantity={1} />);

    await userEvent.click(screen.getByRole("button", { name: "深煎りブレンド を削除する" }));

    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <CartQuantityStepper label="深煎りブレンド" max={9} onChange={vi.fn()} quantity={2} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });

  it("上限に達していたら増やす操作を押せなくする", () => {
    render(<CartQuantityStepper label="深煎りブレンド" max={3} onChange={vi.fn()} quantity={3} />);

    expect(screen.getByRole("button", { name: "深煎りブレンド を 1 つ増やす" })).toBeDisabled();
  });
});
