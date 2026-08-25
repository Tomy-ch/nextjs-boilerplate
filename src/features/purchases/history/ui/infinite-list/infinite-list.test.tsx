// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { CursorPage } from "@/model/pagination";
import type { PurchaseHistoryEntry } from "@/model/purchase/purchase";
import { PURCHASE_STATUS } from "@/model/purchase/purchase-status";

const { useInfinitePurchases } = vi.hoisted(() => ({ useInfinitePurchases: vi.fn() }));

vi.mock("../../use-infinite-purchases", () => ({ useInfinitePurchases }));

import { PurchaseInfiniteList } from "./infinite-list";

const ENTRY: PurchaseHistoryEntry = {
  code: "0195f0c2-0000-7000-9000-000000000001",
  totalAmount: 21_287,
  statusCode: PURCHASE_STATUS.UNPROCESSED,
  statusName: "未処理",
  orderedAt: new Date("2026-08-17T10:30:00+09:00"),
};

const INITIAL: CursorPage<PurchaseHistoryEntry> = { items: [ENTRY], nextCursor: null };

describe("PurchaseInfiniteList", () => {
  it("読み進めた購入を、詳細への行き先つきで並べる", () => {
    useInfinitePurchases.mockReturnValue({
      items: [ENTRY],
      loadMore: { status: "exhausted" },
      sentinelRef: { current: null },
    });

    render(<PurchaseInfiniteList initial={INITIAL} pageSize={20} period={{ kind: "all" }} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", `/purchases/${ENTRY.code}`);
  });

  it("最初のページと効いている期間と件数を、そのまま取得へ渡す", () => {
    useInfinitePurchases.mockReturnValue({
      items: [],
      loadMore: { status: "exhausted" },
      sentinelRef: { current: null },
    });
    const period = { kind: "recent", days: 30 } as const;

    render(<PurchaseInfiniteList initial={INITIAL} pageSize={20} period={period} />);

    expect(useInfinitePurchases).toHaveBeenCalledWith(INITIAL, period, 20);
  });

  it("続きの読み込みの状態をそのまま見せる", () => {
    useInfinitePurchases.mockReturnValue({
      items: [ENTRY],
      loadMore: { status: "loading" },
      sentinelRef: { current: null },
    });

    render(<PurchaseInfiniteList initial={INITIAL} pageSize={20} period={{ kind: "all" }} />);

    expect(screen.getByRole("status", { name: "続きを読み込んでいます" })).toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    useInfinitePurchases.mockReturnValue({
      items: [ENTRY],
      loadMore: { status: "exhausted" },
      sentinelRef: { current: null },
    });

    const { container } = render(
      <PurchaseInfiniteList initial={INITIAL} pageSize={20} period={{ kind: "all" }} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
