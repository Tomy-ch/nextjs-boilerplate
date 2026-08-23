// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { getMyPurchases } = vi.hoisted(() => ({ getMyPurchases: vi.fn() }));

vi.mock("@/adapters/server/api/purchases", () => ({ getMyPurchases }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { HISTORY_ENTRIES } from "../purchases.fixture";
import { PURCHASE_PAGE_SIZE } from "./query";
import { PurchaseHistoryResults } from "./results";

beforeEach(() => {
  getMyPurchases.mockReset().mockResolvedValue({ items: HISTORY_ENTRIES, nextCursor: null });
});

describe("PurchaseHistoryResults", () => {
  it("全期間では境界を持たない条件で先頭ページを引く", async () => {
    render(await PurchaseHistoryResults({ period: { kind: "all" } }));

    expect(getMyPurchases).toHaveBeenCalledWith({
      first: PURCHASE_PAGE_SIZE,
      includeOtherUsers: false,
    });
  });

  it("効いている期間を区間へ解いて渡す", async () => {
    render(await PurchaseHistoryResults({ period: { kind: "month", month: "2026-07" } }));

    expect(getMyPurchases).toHaveBeenCalledWith({
      first: PURCHASE_PAGE_SIZE,
      includeOtherUsers: false,
      orderedAfter: "2026-07-01T00:00:00+09:00",
      orderedBefore: "2026-08-01T00:00:00+09:00",
    });
  });

  it("相対の期間でも、区間を 1 度だけ解いて渡す", async () => {
    render(await PurchaseHistoryResults({ period: { kind: "recent", days: 30 } }));
    render(await PurchaseHistoryResults({ period: { kind: "recent", days: 30 } }));

    const [first] = getMyPurchases.mock.calls[0] ?? [];

    expect(first.orderedAfter).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\+09:00$/);
    expect(Date.parse(first.orderedBefore) - Date.parse(first.orderedAfter)).toBe(
      30 * 24 * 60 * 60 * 1000,
    );
  });

  it("取れた購入を、詳細への行き先つきで並べる", async () => {
    render(await PurchaseHistoryResults({ period: { kind: "all" } }));

    expect(screen.getAllByRole("listitem")).toHaveLength(HISTORY_ENTRIES.length);
    expect(screen.getAllByRole("link")[0]).toHaveAttribute(
      "href",
      `/purchases/${HISTORY_ENTRIES[0]?.code}`,
    );
  });

  it("購入が 1 件も無ければ、買い物へ戻る導線を出す", async () => {
    getMyPurchases.mockResolvedValue({ items: [], nextCursor: null });

    render(await PurchaseHistoryResults({ period: { kind: "all" } }));

    expect(screen.getByText("購入がまだありません。")).toBeVisible();
  });

  it("絞り込んだ結果が 0 件なら、全期間で見直す導線を出す", async () => {
    getMyPurchases.mockResolvedValue({ items: [], nextCursor: null });

    render(await PurchaseHistoryResults({ period: { kind: "recent", days: 7 } }));

    expect(screen.getByText("この期間の購入はありません。")).toBeVisible();
    expect(screen.getByRole("link", { name: "全期間で見る" })).toHaveAttribute(
      "href",
      "/purchases",
    );
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(await PurchaseHistoryResults({ period: { kind: "all" } }));

    expect((await axe(container)).violations).toEqual([]);
  });

  it("並べるものが無いときも a11y 自動検査に違反しない", async () => {
    getMyPurchases.mockResolvedValue({ items: [], nextCursor: null });

    const { container } = render(await PurchaseHistoryResults({ period: { kind: "all" } }));

    expect((await axe(container)).violations).toEqual([]);
  });
});
