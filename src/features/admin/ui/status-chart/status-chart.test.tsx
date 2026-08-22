// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

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

const COUNTS: readonly PurchaseStatusCount[] = [
  { statusId: "1", statusName: "検討中", count: 22 },
  { statusId: "2", statusName: "支払い済み", count: 5 },
];

// 待機中の枠はここに出ない。先読みを済ませた木では `next/dynamic` が同期で解決するため、
// `loading` を通らない。枠の高さが出来上がりと一致することは基準画像
// （Storybook `Page/Admin/Analytics`）が持つ。
describe("StatusChart", () => {
  // ----- 正常系 -----
  it("読み込みが終わると、帯の容れ物を出す", async () => {
    const { container } = render(<StatusChart counts={COUNTS} />);

    await expect.poll(() => container.querySelector('[data-slot="chart"]')).not.toBeNull();
  });

  it("受け取った件数をそのまま帯へ渡す", async () => {
    const { container } = render(<StatusChart counts={COUNTS} />);

    await expect
      .poll(() => container.querySelector('[data-slot="chart-style"]')?.textContent)
      .toContain("--color-count");
  });

  // ----- 異常系 -----
  it("件数が空でも容れ物は出す", async () => {
    const { container } = render(<StatusChart counts={[]} />);

    await expect.poll(() => container.querySelector('[data-slot="chart"]')).not.toBeNull();
  });
});
