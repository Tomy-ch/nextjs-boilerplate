// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PURCHASE_DETAIL } from "../purchase.fixture";
import { PurchaseReceiptCard } from "./receipt";

describe("PurchaseReceiptCard", () => {
  // ----- 正常系 -----
  it("注文番号・注文日時・状況を出す", () => {
    render(<PurchaseReceiptCard purchase={PURCHASE_DETAIL} />);

    expect(screen.getByText(PURCHASE_DETAIL.code)).toBeVisible();
    expect(screen.getByText("2026/08/17 10:30")).toBeVisible();
    expect(screen.getByText("未処理")).toBeVisible();
  });

  it("状況は一覧の行と同じ色で示す", () => {
    render(<PurchaseReceiptCard purchase={{ ...PURCHASE_DETAIL, statusName: "配達済み" }} />);

    expect(screen.getByText("配達済み")).toHaveAttribute("data-variant", "success");
  });

  // ----- 異常系 -----
  it("取得に使う識別子は出さない", () => {
    render(
      <PurchaseReceiptCard
        purchase={{ ...PURCHASE_DETAIL, id: "0195f0c2-0000-7000-9000-00000000ffff" }}
      />,
    );

    expect(screen.queryByText("0195f0c2-0000-7000-9000-00000000ffff")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<PurchaseReceiptCard purchase={PURCHASE_DETAIL} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
