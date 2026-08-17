// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FILTER_KEY, type ProductListSelection } from "../facade/list-url/list-url";

const { fetchProductCount } = vi.hoisted(() => ({ fetchProductCount: vi.fn() }));

vi.mock("@/adapters/client/api/products", () => ({ fetchProductCount }));

import { useFilteredCount } from "./use-filtered-count";

/** 件数と取得の状況だけを出す部品。 */
function Probe({ conditions }: { conditions: ProductListSelection }) {
  const { count, loading } = useFilteredCount(conditions);

  return <p>{`count: ${String(count)} / loading: ${String(loading)}`}</p>;
}

function state(): string {
  return screen.getByText(/^count:/).textContent ?? "";
}

/** 待ちを飛ばし、走った取得の解決までを進める。 */
async function settle(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1_000);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  fetchProductCount.mockReset();
  fetchProductCount.mockResolvedValue(12);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useFilteredCount", () => {
  it("操作が止まるまで数えに行かない", () => {
    render(<Probe conditions={{ [FILTER_KEY.KEYWORD]: "鞄" }} />);

    expect(fetchProductCount).not.toHaveBeenCalled();
  });

  it("止まってから数え、その件数を返す", async () => {
    render(<Probe conditions={{ [FILTER_KEY.KEYWORD]: "鞄" }} />);

    await settle();

    expect(fetchProductCount).toHaveBeenCalledTimes(1);
    expect(state()).toContain("count: 12");
  });

  it("読み進めた位置を数える条件へ含めない", async () => {
    render(<Probe conditions={{ [FILTER_KEY.KEYWORD]: "鞄", after: "cursor-1", first: "48" }} />);

    await settle();

    expect(fetchProductCount.mock.calls[0]?.[0].toString()).toBe("keyword=%E9%9E%84");
  });

  it("数え終えるまでは、まだ数え終えていないことを伝える", () => {
    render(<Probe conditions={{}} />);

    expect(state()).toContain("loading: true");
  });

  it("数え終えたら、数え終えたことを伝える", async () => {
    render(<Probe conditions={{}} />);

    await settle();

    expect(state()).toContain("loading: false");
  });

  it("条件が続けて変わるあいだは、最後の 1 回だけ数える", async () => {
    const { rerender } = render(<Probe conditions={{ [FILTER_KEY.KEYWORD]: "鞄" }} />);

    rerender(<Probe conditions={{ [FILTER_KEY.KEYWORD]: "鞄と靴" }} />);
    await settle();

    expect(fetchProductCount).toHaveBeenCalledTimes(1);
    expect(fetchProductCount.mock.calls[0]?.[0].toString()).toContain(encodeURIComponent("鞄と靴"));
  });

  it("数え直している間は 1 つ前の件数を残す", async () => {
    const { rerender } = render(<Probe conditions={{ [FILTER_KEY.KEYWORD]: "鞄" }} />);
    await settle();

    rerender(<Probe conditions={{ [FILTER_KEY.KEYWORD]: "靴" }} />);

    expect(state()).toContain("count: 12");
    expect(state()).toContain("loading: true");
  });

  it("条件が同じままなら数え直さない", async () => {
    const { rerender } = render(<Probe conditions={{ [FILTER_KEY.KEYWORD]: "鞄" }} />);
    await settle();

    rerender(<Probe conditions={{ [FILTER_KEY.KEYWORD]: "鞄" }} />);
    await settle();

    expect(fetchProductCount).toHaveBeenCalledTimes(1);
  });

  // ----- 異常系 -----
  it("数えられなかったときは件数を消す", async () => {
    const { rerender } = render(<Probe conditions={{ [FILTER_KEY.KEYWORD]: "鞄" }} />);
    await settle();

    fetchProductCount.mockRejectedValue(new Error("数えられない"));
    rerender(<Probe conditions={{ [FILTER_KEY.KEYWORD]: "靴" }} />);
    await settle();

    expect(state()).toContain("count: undefined");
  });

  it("画面を離れるときに走っている取得を打ち切る", async () => {
    const { unmount } = render(<Probe conditions={{}} />);
    await settle();

    const signal: unknown = fetchProductCount.mock.calls[0]?.[1];

    unmount();

    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal).toHaveProperty("aborted", true);
  });
});
