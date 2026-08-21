// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { STOCK_DIRECTION } from "../../stock-direction";
import { StockProjection } from "./projection";

describe("StockProjection", () => {
  it("補充は現在の在庫に足した数を出す", () => {
    render(<StockProjection current={128} direction={STOCK_DIRECTION.REPLENISH} quantity={50} />);

    expect(screen.getByText("178")).toBeInTheDocument();
  });

  it("差し引きは現在の在庫から引いた数を出す", () => {
    render(<StockProjection current={128} direction={STOCK_DIRECTION.DEDUCT} quantity={50} />);

    expect(screen.getByText("78")).toBeInTheDocument();
  });

  it("量が読めないうちは、打鍵ごとに動く数を出さない", () => {
    const { container } = render(
      <StockProjection current={128} direction={STOCK_DIRECTION.REPLENISH} quantity={null} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("見込みが負になるときは、受け付けられない要求であることを添える", () => {
    render(<StockProjection current={10} direction={STOCK_DIRECTION.DEDUCT} quantity={50} />);

    expect(screen.getByText("-40")).toBeInTheDocument();
    expect(screen.getByText(/在庫より多く差し引く要求は受け付けられません/)).toBeInTheDocument();
  });

  it("見込みが 0 以上なら、その断りを出さない", () => {
    render(<StockProjection current={50} direction={STOCK_DIRECTION.DEDUCT} quantity={50} />);

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByText(/受け付けられません/)).not.toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(
      <StockProjection current={128} direction={STOCK_DIRECTION.REPLENISH} quantity={50} />,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
