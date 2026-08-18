// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { CartLine } from "@/model/cart/cart";

import { EARPHONE_LINE, INSUFFICIENT_LINE } from "../../../checkout.fixture";
import { OrderLineRow } from "./order-line-row";

const PRICE_INCREASED: CartLine = {
  ...EARPHONE_LINE,
  issues: ["priceIncreased"],
};

const NOT_FOUND: CartLine = {
  ...EARPHONE_LINE,
  name: null,
  unitPrice: null,
  issues: ["notFound"],
};

function renderRow(line: CartLine) {
  return render(
    <ul>
      <OrderLineRow line={line} />
    </ul>,
  );
}

describe("OrderLineRow", () => {
  it("商品名・単価・数量を出す", () => {
    renderRow(EARPHONE_LINE);

    expect(screen.getByText("ワイヤレスイヤホン")).toBeVisible();
    expect(screen.getByText("$19.99 / 個")).toBeVisible();
    expect(screen.getByText("3 個")).toBeVisible();
  });

  it("事情の無い明細には何も添えない", () => {
    renderRow(EARPHONE_LINE);

    expect(screen.queryByText(/含まれません|確かめます/)).not.toBeInTheDocument();
  });

  it("数量を変える操作も取り除く操作も持たない", () => {
    renderRow(EARPHONE_LINE);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
  it("買えない明細には、理由と外れることを添える", () => {
    renderRow(INSUFFICIENT_LINE);

    expect(screen.getByText("在庫が 2 個までです。")).toBeVisible();
    expect(screen.getByText("この明細は今回の購入に含まれません。")).toBeVisible();
  });

  it("値が変わった明細には、確定のときに確かめることを添える", () => {
    renderRow(PRICE_INCREASED);

    expect(screen.getByText("カートに入れたときより価格が上がっています。")).toBeVisible();
    expect(screen.getByText("この金額で購入してよいかを、確定のときに確かめます。")).toBeVisible();
  });

  it("商品を引けない明細には、名前の代わりを出す", () => {
    renderRow(NOT_FOUND);

    expect(screen.getByText("取得できない商品")).toBeVisible();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderRow(INSUFFICIENT_LINE);

    expect((await axe(container)).violations).toEqual([]);
  });
});
