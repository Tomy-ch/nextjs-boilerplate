// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { ShipmentQueueResults } = vi.hoisted(() => ({
  ShipmentQueueResults: vi.fn(() => <p>便の並び</p>),
}));

vi.mock("./results", () => ({ ShipmentQueueResults }));

import { ShipmentQueuePageContent } from "./page-content";

const shipAction = vi.fn();

describe("ShipmentQueuePageContent", () => {
  it("取得の待ちを一覧本体だけに掛ける", () => {
    render(<ShipmentQueuePageContent shipAction={shipAction} />);

    expect(screen.getByText("便の並び")).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<ShipmentQueuePageContent shipAction={shipAction} />);

    expect((await axe(container)).violations).toEqual([]);
  });

  it("送信先をそのまま一覧へ渡す", () => {
    render(<ShipmentQueuePageContent shipAction={shipAction} />);

    expect(ShipmentQueueResults).toHaveBeenCalledWith({ shipAction }, undefined);
  });
});
