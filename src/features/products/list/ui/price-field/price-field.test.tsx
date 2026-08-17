// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { PRICE_RANGE_MAX, PRICE_RANGE_MIN } from "../../price-range";
import { ProductPriceField } from "./price-field";

function low(): HTMLElement {
  return screen.getByLabelText("価格の下限", { selector: "select" });
}

function high(): HTMLElement {
  return screen.getByLabelText("価格の上限", { selector: "select" });
}

describe("ProductPriceField", () => {
  it("同じ範囲を選択とスライダーの 2 つの操作面で出す", () => {
    render(<ProductPriceField onChange={vi.fn()} value={[PRICE_RANGE_MIN, PRICE_RANGE_MAX]} />);

    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it("端の位置を指定なしとして見せる", () => {
    render(<ProductPriceField onChange={vi.fn()} value={[PRICE_RANGE_MIN, PRICE_RANGE_MAX]} />);

    expect(low()).toHaveValue(String(PRICE_RANGE_MIN));
    expect(screen.getByRole("option", { name: "下限なし" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "上限なし" })).toBeInTheDocument();
  });

  it("下限に上限なしの端を選ばせない", () => {
    render(<ProductPriceField onChange={vi.fn()} value={[PRICE_RANGE_MIN, PRICE_RANGE_MAX]} />);

    expect(within(low()).queryByRole("option", { name: "上限なし" })).not.toBeInTheDocument();
  });

  it("上限に下限なしの端を選ばせない", () => {
    render(<ProductPriceField onChange={vi.fn()} value={[PRICE_RANGE_MIN, PRICE_RANGE_MAX]} />);

    expect(within(high()).queryByRole("option", { name: "下限なし" })).not.toBeInTheDocument();
  });

  it("下限を選ぶと、その位置を確定として伝える", async () => {
    const onChange = vi.fn();
    render(<ProductPriceField onChange={onChange} value={[PRICE_RANGE_MIN, PRICE_RANGE_MAX]} />);

    await userEvent.selectOptions(low(), "2");

    expect(onChange).toHaveBeenCalledWith([2, PRICE_RANGE_MAX]);
  });

  it("上限より後ろの下限を選ぶと、上限もそこまで押し上げる", async () => {
    const onChange = vi.fn();
    render(<ProductPriceField onChange={onChange} value={[PRICE_RANGE_MIN, 3]} />);

    await userEvent.selectOptions(low(), "5");

    expect(onChange).toHaveBeenCalledWith([5, 5]);
  });

  it("下限より前の上限を選ぶと、下限もそこまで引き下げる", async () => {
    const onChange = vi.fn();
    render(<ProductPriceField onChange={onChange} value={[5, PRICE_RANGE_MAX]} />);

    await userEvent.selectOptions(high(), "2");

    expect(onChange).toHaveBeenCalledWith([2, 2]);
  });

  it("下限以降の上限を選んでも、下限は動かさない", async () => {
    const onChange = vi.fn();
    render(<ProductPriceField onChange={onChange} value={[2, PRICE_RANGE_MAX]} />);

    await userEvent.selectOptions(high(), "5");

    expect(onChange).toHaveBeenCalledWith([2, 5]);
  });

  it("外から来た位置を選択が映す", () => {
    render(<ProductPriceField onChange={vi.fn()} value={[2, 5]} />);

    expect(low()).toHaveValue("2");
    expect(high()).toHaveValue("5");
  });

  it("スライダーの端に、どちらの端かが判る名前を与える", () => {
    render(<ProductPriceField onChange={vi.fn()} value={[PRICE_RANGE_MIN, PRICE_RANGE_MAX]} />);

    expect(screen.getByRole("slider", { name: "価格の下限" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "価格の上限" })).toBeInTheDocument();
  });

  it("スライダーを動かすと、離した時点で位置を確定として伝える", async () => {
    const onChange = vi.fn();
    render(<ProductPriceField onChange={onChange} value={[PRICE_RANGE_MIN, PRICE_RANGE_MAX]} />);

    screen.getByRole("slider", { name: "価格の下限" }).focus();
    await userEvent.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenCalledWith([PRICE_RANGE_MIN + 1, PRICE_RANGE_MAX]);
  });

  it("スライダーで動かした位置を、外から来る位置より優先して映す", async () => {
    // 外からは常に端を渡す。動かした位置を自分で持っていなければ、表示は端のままになる。
    render(<ProductPriceField onChange={vi.fn()} value={[PRICE_RANGE_MIN, PRICE_RANGE_MAX]} />);

    screen.getByRole("slider", { name: "価格の上限" }).focus();
    await userEvent.keyboard("{ArrowLeft}");

    expect(high()).toHaveValue(String(PRICE_RANGE_MAX - 1));
  });

  it("セレクトボックスで選び直すと、スライダーが持っていた位置を捨てる", async () => {
    const { rerender } = render(
      <ProductPriceField onChange={vi.fn()} value={[PRICE_RANGE_MIN, PRICE_RANGE_MAX]} />,
    );

    screen.getByRole("slider", { name: "価格の上限" }).focus();
    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.selectOptions(low(), "2");
    rerender(<ProductPriceField onChange={vi.fn()} value={[2, PRICE_RANGE_MAX]} />);

    expect(high()).toHaveValue(String(PRICE_RANGE_MAX));
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<ProductPriceField onChange={vi.fn()} value={[2, 5]} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
