// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PURCHASE_STATUS } from "@/model/purchase/purchase-status";

import { PURCHASE_DETAIL } from "../purchase.fixture";
import { PurchaseReceiptCard } from "./receipt";

describe("PurchaseReceiptCard", () => {
  it("注文番号・注文日時・状況を出す", () => {
    render(<PurchaseReceiptCard purchase={PURCHASE_DETAIL} />);

    expect(screen.getByText(PURCHASE_DETAIL.code)).toBeVisible();
    expect(screen.getByText("2026/08/17 10:30")).toBeVisible();
    expect(screen.getByText("未処理")).toBeVisible();
  });

  it("状況は一覧の行と同じ色で示す", () => {
    render(
      <PurchaseReceiptCard
        purchase={{
          ...PURCHASE_DETAIL,
          statusCode: PURCHASE_STATUS.DELIVERED,
          statusName: "配達済み",
        }}
      />,
    );

    expect(screen.getByText("配達済み")).toHaveAttribute("data-variant", "success");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<PurchaseReceiptCard purchase={PURCHASE_DETAIL} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
