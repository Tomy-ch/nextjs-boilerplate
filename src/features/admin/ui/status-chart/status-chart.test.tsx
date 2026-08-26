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

/** 直近に作られた observer へ交差を知らせる口。 */
let fire: (entries: { isIntersecting: boolean }[]) => void = () => undefined;
let options: IntersectionObserverInit | undefined;

beforeEach(() => {
  options = undefined;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(
        callback: (entries: { isIntersecting: boolean }[]) => void,
        init?: IntersectionObserverInit,
      ) {
        options = init;
        fire = callback;
      }
      observe(): void {}
      disconnect(): void {}
    },
  );
});

/** 帯が近づいたことを知らせる。 */
function scrollIntoView(): void {
  act(() => fire([{ isIntersecting: true }]));
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
    const frame = container.firstElementChild?.firstElementChild;

    expect(frame).toHaveClass("h-56");
    expect(frame).toHaveAttribute("aria-hidden", "true");
  });

  it("近づくまでは帯を読み込まない", () => {
    const { container } = render(<StatusChart counts={COUNTS} />);

    expect(container.querySelector('[data-slot="chart"]')).toBeNull();
  });

  it("画面へ入り切る手前から読み始める", () => {
    render(<StatusChart counts={COUNTS} />);

    expect(options?.rootMargin).toBe("200px");
  });

  it("読み込みが終わると、帯の容れ物を出す", async () => {
    const { container } = render(<StatusChart counts={COUNTS} />);
    scrollIntoView();

    await expect.poll(() => container.querySelector('[data-slot="chart"]')).not.toBeNull();
  });

  it("受け取った件数をそのまま帯へ渡す", async () => {
    const { container } = render(<StatusChart counts={COUNTS} />);
    scrollIntoView();

    await expect
      .poll(() => container.querySelector('[data-slot="chart-style"]')?.textContent)
      .toContain("--color-count");
  });

  it("件数が空でも容れ物は出す", async () => {
    const { container } = render(<StatusChart counts={[]} />);
    scrollIntoView();

    await expect.poll(() => container.querySelector('[data-slot="chart"]')).not.toBeNull();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<StatusChart counts={COUNTS} />);
    scrollIntoView();

    await expect.poll(() => container.querySelector('[data-slot="chart"]')).not.toBeNull();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
