// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { DISPATCH_GROUPS } from "./shipments.fixture";
import { ShipmentQueueView } from "./view";

const shipAction = vi.fn();

describe("ShipmentQueueView", () => {
  // ----- 正常系 -----
  it("発送を待っている便を、契約が返した順で積む", () => {
    render(<ShipmentQueueView groups={DISPATCH_GROUPS} shipAction={shipAction} />);

    const addresses = screen.getAllByText(/^0195f0c2-0000-7000-9000-0000000000a/);

    expect(addresses.map((element) => element.textContent)).toEqual(
      DISPATCH_GROUPS.map(({ userId }) => userId),
    );
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <ShipmentQueueView groups={DISPATCH_GROUPS} shipAction={shipAction} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });

  // ----- 異常系 -----
  it("発送を待っている注文が無ければ、その旨だけを出す", () => {
    render(<ShipmentQueueView groups={[]} shipAction={shipAction} />);

    expect(screen.getByText("発送を待っている注文はありません。")).toBeVisible();
    expect(screen.queryByRole("button", { name: "発送する" })).not.toBeInTheDocument();
  });
});
