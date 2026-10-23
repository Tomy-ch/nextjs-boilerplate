// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CAMPAIGN_PAGE_MAX } from "@/adapters/server/api/campaigns";

import type { AdminCampaignResultsProps } from "./results";

const { results, request } = vi.hoisted(() => {
  const pending: { current: Promise<void> | null } = { current: null };

  return { results: vi.fn(), request: pending };
});

vi.mock("./results", async () => {
  const { use } = await import("react");

  return {
    AdminCampaignResults: (props: AdminCampaignResultsProps) => {
      results(props);
      if (request.current !== null) {
        use(request.current);
      }

      return <p>{`${props.location.page} ページ目の行`}</p>;
    },
  };
});

import type { SuspendCampaignState } from "./form-state";
import { AdminCampaignListPageContent } from "./page-content";
import { ADMIN_CAMPAIGN_PAGE_SIZE } from "./page-size";

const NOW = new Date("2026-01-01T00:00:00.000Z");

const suspendAction = () => Promise.resolve<SuspendCampaignState>({ status: "idle" });

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });

  return { promise, resolve };
}

function contentOf(searchParams: Record<string, string | string[] | undefined>) {
  return (
    <AdminCampaignListPageContent
      now={NOW}
      searchParams={searchParams}
      suspendAction={suspendAction}
    />
  );
}

function skeleton() {
  return document.querySelector('[data-slot="skeleton"]');
}

function lastResultsProps(): AdminCampaignResultsProps | undefined {
  return results.mock.calls.at(-1)?.[0];
}

beforeEach(() => {
  results.mockReset();
  request.current = null;
});

describe("AdminCampaignListPageContent", () => {
  // ----- 取得を待っているとき -----
  it("取得を待つ間は、一覧の代わりに待機の枠を出す", () => {
    request.current = deferred().promise;

    render(contentOf({}));

    expect(skeleton()).not.toBeNull();
    expect(screen.queryByText("1 ページ目の行")).not.toBeInTheDocument();
  });

  it("ページを移ったら、前のページの行を残さず待機の枠へ戻す", async () => {
    const { rerender } = render(contentOf({ page: "1" }));

    await screen.findByText("1 ページ目の行");

    request.current = deferred().promise;
    rerender(contentOf({ page: "2" }));

    expect(skeleton()).not.toBeNull();
    expect(screen.queryByText("1 ページ目の行")).not.toBeInTheDocument();
  });

  // ----- 取得できたとき -----
  it("取得が済んだら、待機の枠を一覧へ差し替える", async () => {
    const fetching = deferred();

    request.current = fetching.promise;
    await act(async () => {
      render(contentOf({}));
    });

    expect(skeleton()).not.toBeNull();

    await act(async () => {
      fetching.resolve();
      await fetching.promise;
    });

    expect(screen.getByText("1 ページ目の行")).toBeInTheDocument();
    expect(skeleton()).toBeNull();
  });

  it("URL のページ番号を読んで、取り直す範囲へ渡す", async () => {
    render(contentOf({ page: "2" }));

    await screen.findByText("2 ページ目の行");

    expect(lastResultsProps()?.location).toEqual({ page: 2 });
  });

  it("数として読めないページ番号は、先頭ページとして渡す", async () => {
    render(contentOf({ page: "abc" }));

    await screen.findByText("1 ページ目の行");

    expect(lastResultsProps()?.location).toEqual({ page: 1 });
  });

  it("契約の上限を超えるページ番号は、取得へ届く前に先頭へ倒れる", async () => {
    render(contentOf({ page: String(CAMPAIGN_PAGE_MAX + 1) }));

    await screen.findByText("1 ページ目の行");

    expect(lastResultsProps()?.location).toEqual({ page: 1 });
  });

  it("1 ページの件数に、この画面が決めた件数を渡す", async () => {
    render(contentOf({}));

    await screen.findByText("1 ページ目の行");

    expect(lastResultsProps()?.perPage).toBe(ADMIN_CAMPAIGN_PAGE_SIZE);
  });

  it("受け取った時刻を、状態の判定の基準としてそのまま渡す", async () => {
    render(contentOf({}));

    await screen.findByText("1 ページ目の行");

    expect(lastResultsProps()?.now).toBe(NOW);
  });

  it("停止の送信先を、そのまま一覧へ渡す", async () => {
    render(contentOf({}));

    await screen.findByText("1 ページ目の行");

    expect(lastResultsProps()?.suspendAction).toBe(suspendAction);
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(contentOf({}));

    await screen.findByText("1 ページ目の行");

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  // ----- 取得が失敗したとき -----
  it("取得の失敗を握りつぶさず、外側の境界へ渡す", () => {
    results.mockImplementation(() => {
      throw new Error("取得に失敗しました");
    });

    expect(() => render(contentOf({}))).toThrow("取得に失敗しました");
  });
});
