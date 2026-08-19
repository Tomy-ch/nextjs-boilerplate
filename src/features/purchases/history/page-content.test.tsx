// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("./results", () => ({
  PurchaseHistoryResults: ({ period }: { period: { kind: string } }) => (
    <p>{`一覧（${period.kind}）`}</p>
  ),
}));

import { PurchaseHistoryPageContent } from "./page-content";

describe("PurchaseHistoryPageContent", () => {
  it("URL の期間を読み、絞り込みへ渡す", () => {
    render(<PurchaseHistoryPageContent searchParams={{ period: "recent", days: "30" }} />);

    expect(screen.getByRole("button", { name: /期間: 直近 30 日/ })).toBeInTheDocument();
  });

  it("読み取った期間で一覧を取り直させる", () => {
    render(<PurchaseHistoryPageContent searchParams={{ period: "month", month: "2026-07" }} />);

    expect(screen.getByText("一覧（month）")).toBeVisible();
  });

  it("読めない条件は全期間として扱う", () => {
    render(<PurchaseHistoryPageContent searchParams={{ period: "month" }} />);

    expect(screen.getByText("一覧（all）")).toBeVisible();
  });

  it("待機表示に落ちるのは一覧だけで、絞り込みは残す", () => {
    render(<PurchaseHistoryPageContent searchParams={{}} />);

    expect(screen.getByRole("form", { name: "購入履歴の絞り込み" })).toBeInTheDocument();
  });
});
