// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { PurchaseStatusCount } from "@/model/dashboard/dashboard";

import { StatusChart } from "./status-chart";

// 帯は `next/dynamic` で読まれる。先に解決しておかないと、要素を待つ時間の中に module の
// 読み込みが入る（`docs/testing-conventions.md`「`next/dynamic` を含む木を描くとき」）。
beforeAll(async () => {
  // recharts が寸法を測るために使う API を jsdom が持たないため、ここで補う。
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  await import("../status-bars/status-bars");
});

/** 手空きの知らせを、テストが好きな時点で起こすための口。 */
let idle: (() => void) | undefined;

beforeEach(() => {
  idle = undefined;
  vi.stubGlobal("requestIdleCallback", (callback: () => void) => {
    idle = callback;

    return 1;
  });
  vi.stubGlobal("cancelIdleCallback", () => undefined);
});

/** ブラウザが手空きになったことを知らせる。 */
function settle(): void {
  act(() => idle?.());
}

const COUNTS: readonly PurchaseStatusCount[] = [
  { statusId: "1", statusName: "検討中", count: 22 },
  { statusId: "2", statusName: "支払い済み", count: 5 },
];

describe("StatusChart", () => {
  // 枠の検証はここに 1 つだけ置き、先頭に保つ（`React.lazy` は解決した値をこの module へ
  // 抱え込むため、2 つ目を足しても枠を通らない）。
  it("届くまでは、出来上がりと同じ高さの枠を読み上げの外へ置く", () => {
    const { container } = render(<StatusChart counts={COUNTS} />);
    const frame = container.firstElementChild;

    expect(frame).toHaveClass("h-56");
    expect(frame).toHaveAttribute("aria-hidden", "true");
  });

  it("手空きになるまでは帯を読み込まない", () => {
    const { container } = render(<StatusChart counts={COUNTS} />);

    expect(container.querySelector('[data-slot="chart"]')).toBeNull();
  });

  it("読み込みが終わると、帯の容れ物を出す", async () => {
    const { container } = render(<StatusChart counts={COUNTS} />);
    settle();

    await expect.poll(() => container.querySelector('[data-slot="chart"]')).not.toBeNull();
  });

  it("受け取った件数をそのまま帯へ渡す", async () => {
    const { container } = render(<StatusChart counts={COUNTS} />);
    settle();

    await expect
      .poll(() => container.querySelector('[data-slot="chart-style"]')?.textContent)
      .toContain("--color-count");
  });

  it("件数が空でも容れ物は出す", async () => {
    const { container } = render(<StatusChart counts={[]} />);
    settle();

    await expect.poll(() => container.querySelector('[data-slot="chart"]')).not.toBeNull();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<StatusChart counts={COUNTS} />);
    settle();

    await expect.poll(() => container.querySelector('[data-slot="chart"]')).not.toBeNull();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
