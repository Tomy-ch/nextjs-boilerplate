// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ShipmentQueueSkeleton } from "./skeleton";

describe("ShipmentQueueSkeleton", () => {
  it("読み上げの対象から外す", () => {
    const { container } = render(<ShipmentQueueSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<ShipmentQueueSkeleton />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
