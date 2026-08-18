// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PURCHASE } from "../../../checkout.fixture";
import { PurchaseReceipt } from "./purchase-receipt";

describe("PurchaseReceipt", () => {
  // ----- 正常系 -----
  it("注文番号・注文日時・状況を出す", () => {
    render(<PurchaseReceipt purchase={PURCHASE} />);

    expect(screen.getByText(PURCHASE.code)).toBeVisible();
    expect(screen.getByText("2026/08/17 10:30")).toBeVisible();
    expect(screen.getByText("未処理")).toBeVisible();
  });

  // ----- 異常系 -----
  it("取得に使う識別子は出さない", () => {
    render(
      <PurchaseReceipt purchase={{ ...PURCHASE, id: "0195f0c2-0000-7000-9000-00000000ffff" }} />,
    );

    expect(screen.queryByText("0195f0c2-0000-7000-9000-00000000ffff")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<PurchaseReceipt purchase={PURCHASE} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
