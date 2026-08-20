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

// 帯や軸ラベルはここに出ない。recharts は実寸を測ってから中身を描き、jsdom は寸法を持たないため
// 容れ物が 0×0 のまま空で終わる。描いた結果そのものは基準画像（Storybook `Page/Admin/Analytics`）が
// 持つので、ここで見るのは容れ物の側の契約だけにしてある。
describe("StatusChart", () => {
  it("図の容れ物を出す", () => {
    const { container } = render(<StatusChart counts={COUNTS} />);

    expect(container.querySelector('[data-slot="chart"]')).toBeInTheDocument();
  });

  it("件数の系列に色を割り当てる", () => {
    const { container } = render(<StatusChart counts={COUNTS} />);

    expect(container.querySelector('[data-slot="chart-style"]')?.textContent).toContain(
      "--color-count",
    );
  });

  it("凡例も tooltip も置かない", () => {
    const { container } = render(<StatusChart counts={COUNTS} />);

    expect(container.querySelector(".recharts-legend-wrapper")).toBeNull();
    expect(container.querySelector(".recharts-tooltip-wrapper")).toBeNull();
  });

  it("件数が空でも落ちない", () => {
    const { container } = render(<StatusChart counts={[]} />);

    expect(container.querySelector('[data-slot="chart"]')).toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<StatusChart counts={COUNTS} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
