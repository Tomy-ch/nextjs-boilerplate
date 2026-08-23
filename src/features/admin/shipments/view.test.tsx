// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { DISPATCH_GROUPS, SHIPPED_PURCHASES } from "./shipments.fixture";
import { ShipmentQueueView } from "./view";

const shipAction = vi.fn();
const deliverAction = vi.fn();

describe("ShipmentQueueView", () => {
  it("発送を待っている便を、契約が返した順で積む", () => {
    render(
      <ShipmentQueueView
        deliverAction={deliverAction}
        groups={DISPATCH_GROUPS}
        shipAction={shipAction}
        shipped={SHIPPED_PURCHASES}
      />,
    );

    const addresses = screen.getAllByText(/^0195f0c2-0000-7000-9000-0000000000a/);

    expect(addresses.map((element) => element.textContent)).toEqual(
      DISPATCH_GROUPS.map(({ userId }) => userId),
    );
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <ShipmentQueueView
        deliverAction={deliverAction}
        groups={DISPATCH_GROUPS}
        shipAction={shipAction}
        shipped={SHIPPED_PURCHASES}
      />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });

  it("発送済みの注文を、便の下に続けて並べる", () => {
    render(
      <ShipmentQueueView
        deliverAction={deliverAction}
        groups={DISPATCH_GROUPS}
        shipAction={shipAction}
        shipped={SHIPPED_PURCHASES}
      />,
    );

    expect(screen.getAllByRole("button", { name: "配達済みにする" })).toHaveLength(
      SHIPPED_PURCHASES.length,
    );
    expect(screen.getByText(SHIPPED_PURCHASES[0]?.code ?? "")).toBeVisible();
  });

  it("発送を待つ便が無くても、配達を待つ注文があれば出す", () => {
    render(
      <ShipmentQueueView
        deliverAction={deliverAction}
        groups={[]}
        shipAction={shipAction}
        shipped={SHIPPED_PURCHASES}
      />,
    );

    expect(screen.getByText("発送済み")).toBeVisible();
    expect(screen.queryByText("発送を待っている注文はありません。")).not.toBeInTheDocument();
  });

  it("どちらも無ければ、その旨だけを出す", () => {
    render(
      <ShipmentQueueView
        deliverAction={deliverAction}
        groups={[]}
        shipAction={shipAction}
        shipped={[]}
      />,
    );

    expect(screen.getByText("発送を待っている注文はありません。")).toBeVisible();
    expect(screen.queryByRole("button", { name: "発送する" })).not.toBeInTheDocument();
  });
});
