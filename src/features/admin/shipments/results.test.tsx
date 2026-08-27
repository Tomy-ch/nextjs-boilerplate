// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { getShippablePurchases, getShippedPurchases } = vi.hoisted(() => ({
  getShippablePurchases: vi.fn(),
  getShippedPurchases: vi.fn(),
}));

vi.mock("@/adapters/server/api/purchases", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/purchases")>()),
  getShippablePurchases,
  getShippedPurchases,
}));

import { ShipmentQueueResults } from "./results";
import { DISPATCH_GROUPS, SHIPPED_PURCHASES } from "./shipments.fixture";

const shipAction = vi.fn();
const deliverAction = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  getShippablePurchases.mockResolvedValue(DISPATCH_GROUPS);
  getShippedPurchases.mockResolvedValue(SHIPPED_PURCHASES);
});

describe("ShipmentQueueResults", () => {
  it("取得した便をそのまま描く", async () => {
    render(await ShipmentQueueResults({ shipAction, deliverAction }));

    expect(screen.getByText(DISPATCH_GROUPS[0]?.userId ?? "")).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(await ShipmentQueueResults({ shipAction, deliverAction }));

    expect((await axe(container)).violations).toEqual([]);
  });

  it("取得した発送済みの注文もそのまま描く", async () => {
    render(await ShipmentQueueResults({ shipAction, deliverAction }));

    expect(screen.getByText(SHIPPED_PURCHASES[0]?.code ?? "")).toBeVisible();
  });

  it("2 つの取得をどちらも行う", async () => {
    await ShipmentQueueResults({ shipAction, deliverAction });

    expect(getShippablePurchases).toHaveBeenCalledOnce();
    expect(getShippedPurchases).toHaveBeenCalledOnce();
  });

  it("取得の失敗を握り潰さない", async () => {
    getShippablePurchases.mockRejectedValueOnce(new Error("接続できません"));

    await expect(ShipmentQueueResults({ shipAction, deliverAction })).rejects.toThrow(
      "接続できません",
    );
  });

  it("発送済みの取得が失敗しても握り潰さない", async () => {
    getShippedPurchases.mockRejectedValueOnce(new Error("接続できません"));

    await expect(ShipmentQueueResults({ shipAction, deliverAction })).rejects.toThrow(
      "接続できません",
    );
  });
});
