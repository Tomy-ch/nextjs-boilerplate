// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { getShippablePurchases } = vi.hoisted(() => ({ getShippablePurchases: vi.fn() }));

vi.mock("@/adapters/server/api/purchases", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/purchases")>()),
  getShippablePurchases,
}));

import { ShipmentQueueResults } from "./results";
import { DISPATCH_GROUPS } from "./shipments.fixture";

const shipAction = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  getShippablePurchases.mockResolvedValue(DISPATCH_GROUPS);
});

describe("ShipmentQueueResults", () => {
  it("取得した便をそのまま描く", async () => {
    render(await ShipmentQueueResults({ shipAction }));

    expect(screen.getByText(DISPATCH_GROUPS[0]?.userId ?? "")).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(await ShipmentQueueResults({ shipAction }));

    expect((await axe(container)).violations).toEqual([]);
  });

  it("取得の失敗を握り潰さない", async () => {
    getShippablePurchases.mockRejectedValueOnce(new Error("接続できません"));

    await expect(ShipmentQueueResults({ shipAction })).rejects.toThrow("接続できません");
  });
});
