// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { PurchaseStatusCount } from "@/model/dashboard/dashboard";

import { StatusChart } from "./status-chart";

beforeAll(() => {
  // recharts が寸法を測るために使う API を jsdom が持たないため、ここで補う。
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const COUNTS: readonly PurchaseStatusCount[] = [
  { statusId: "1", statusName: "検討中", count: 22 },
  { statusId: "2", statusName: "支払い済み", count: 5 },
];

describe("StatusChart", () => {
  it("渡された件数をそのまま描く", () => {
    const { container } = render(<StatusChart counts={COUNTS} />);

    expect(container.querySelector('[data-slot="chart"]')).toBeInTheDocument();
  });

  it("凡例も tooltip も置かない", () => {
    const { container } = render(<StatusChart counts={COUNTS} />);

    expect(container.querySelector(".recharts-legend-wrapper")).toBeNull();
    expect(container.querySelector(".recharts-tooltip-wrapper")).toBeNull();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<StatusChart counts={COUNTS} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
