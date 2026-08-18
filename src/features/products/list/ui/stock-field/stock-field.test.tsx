// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { STOCK_AVAILABILITY } from "../../stock-availability";
import { ProductStockField } from "./stock-field";

describe("ProductStockField", () => {
  it("3 つの状態を排他の選択肢として並べる", () => {
    render(<ProductStockField onChange={vi.fn()} value={STOCK_AVAILABILITY.ALL} />);

    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("選ばれている状態にだけ印を付ける", () => {
    render(<ProductStockField onChange={vi.fn()} value={STOCK_AVAILABILITY.IN_STOCK} />);

    expect(screen.getByLabelText("在庫あり")).toBeChecked();
    expect(screen.getByLabelText("すべて")).not.toBeChecked();
  });

  it("選ぶとその状態を伝える", async () => {
    const onChange = vi.fn();
    render(<ProductStockField onChange={onChange} value={STOCK_AVAILABILITY.ALL} />);

    await userEvent.click(screen.getByLabelText("在庫なし"));

    expect(onChange).toHaveBeenCalledWith(STOCK_AVAILABILITY.OUT_OF_STOCK);
  });

  it("同じ画面に 2 つ置いても、片方の選択がもう片方を外さない", async () => {
    render(
      <>
        <ProductStockField onChange={vi.fn()} value={STOCK_AVAILABILITY.IN_STOCK} />
        <ProductStockField onChange={vi.fn()} value={STOCK_AVAILABILITY.OUT_OF_STOCK} />
      </>,
    );

    expect(screen.getAllByLabelText("在庫あり")[0]).toBeChecked();
    expect(screen.getAllByLabelText("在庫なし")[1]).toBeChecked();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <ProductStockField onChange={vi.fn()} value={STOCK_AVAILABILITY.IN_STOCK} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
