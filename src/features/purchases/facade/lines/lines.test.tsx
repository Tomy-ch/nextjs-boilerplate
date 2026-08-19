// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PURCHASE_DETAIL } from "../purchase.fixture";
import { PurchaseLineList } from "./lines";

describe("PurchaseLineList", () => {
  it("商品名・購入時点の単価・数量を出す", () => {
    render(<PurchaseLineList lines={PURCHASE_DETAIL.lines} />);

    expect(screen.getByText("ワイヤレスイヤホン")).toBeVisible();
    expect(screen.getByText("$19.99 / 個")).toBeVisible();
    expect(screen.getByText("3 個")).toBeVisible();
  });

  it("行ごとの金額を作らない", () => {
    render(<PurchaseLineList lines={PURCHASE_DETAIL.lines} />);

    expect(screen.queryByText("$59.97")).not.toBeInTheDocument();
  });

  it("明細が無くても器だけを出す", () => {
    render(<PurchaseLineList lines={[]} />);

    expect(screen.getByText("ご購入いただいた商品")).toBeVisible();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<PurchaseLineList lines={PURCHASE_DETAIL.lines} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
