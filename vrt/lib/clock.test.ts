import type { Page } from "@playwright/test";
import { describe, expect, it, vi } from "vitest";

import { FIXED_NOW, installFixedClock } from "./clock";

/** `clock` だけを持つ最小のページ。 */
function fakePage(): { page: Page; setFixedTime: ReturnType<typeof vi.fn> } {
  const setFixedTime = vi.fn();

  return { page: { clock: { setFixedTime } } as unknown as Page, setFixedTime };
}

describe("installFixedClock", () => {
  // ----- 正常系 -----
  it("ページが読む現在時刻を固定した時刻へ差し替える", async () => {
    const { page, setFixedTime } = fakePage();

    await installFixedClock(page);

    expect(setFixedTime).toHaveBeenCalledWith(FIXED_NOW);
  });

  it("撮り直しても同じ時刻を渡す", async () => {
    const first = fakePage();
    const second = fakePage();

    await installFixedClock(first.page);
    await installFixedClock(second.page);

    expect(first.setFixedTime.mock.calls).toEqual(second.setFixedTime.mock.calls);
  });
});
