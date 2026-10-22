// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { type Campaign, toCampaignId } from "@/model/campaign/campaign";

const { getCampaignPage } = vi.hoisted(() => ({ getCampaignPage: vi.fn() }));

vi.mock("@/adapters/server/api/campaigns", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/campaigns")>()),
  getCampaignPage,
}));
vi.mock("./ui/suspendable-list/suspendable-list", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ui/suspendable-list/suspendable-list")>();

  return { ...actual, SuspendableCampaignList: vi.fn(actual.SuspendableCampaignList) };
});

import { ADMIN_CAMPAIGN_LIST_PATH } from "../../paths";
import type { SuspendCampaignState } from "./form-state";
import { AdminCampaignResults } from "./results";
import { SuspendableCampaignList } from "./ui/suspendable-list/suspendable-list";

const PER_PAGE = 20;
const NOW = new Date("2026-01-01T00:00:00.000Z");

const suspendAction = () => Promise.resolve<SuspendCampaignState>({ status: "idle" });

function campaign(code: string, overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: toCampaignId(`0195f0c2-0000-7000-8000-${code.padStart(12, "0")}`),
    code,
    discount: { kind: "flat", value: "5.00" },
    scopeKind: "all",
    startsAt: "2025-12-01T00:00:00.000Z",
    endsAt: "2026-01-31T15:00:00.000Z",
    couponExpiresAt: "2026-03-31T15:00:00.000Z",
    totalLimit: 1000,
    issuedCount: 300,
    suspendedAt: null,
    ...overrides,
  };
}

const UPCOMING = campaign("SPRING2026", { startsAt: "2026-03-01T00:00:00.000Z" });
const ACTIVE = campaign("WINTER2025");
const SUSPENDED = campaign("FLASH1225", { suspendedAt: "2025-12-22T03:30:00.000Z" });
const ENDED = campaign("AUTUMN2025", { endsAt: "2025-12-15T00:00:00.000Z" });

function page(items: readonly Campaign[], total: number) {
  return { items, total, perPage: PER_PAGE, offset: 0 };
}

function renderResults(location = { page: 1 }) {
  return AdminCampaignResults({ location, now: NOW, perPage: PER_PAGE, suspendAction });
}

function rowOf(code: string) {
  return screen.getByRole("row", { name: new RegExp(code) });
}

beforeEach(() => {
  getCampaignPage.mockReset();
  getCampaignPage.mockResolvedValue(page([UPCOMING, ACTIVE, SUSPENDED, ENDED], 45));
  vi.mocked(SuspendableCampaignList).mockClear();
});

describe("AdminCampaignResults", () => {
  // ----- 行があるとき -----
  it("いま見ているページと 1 ページの件数を取得の条件へ写す", async () => {
    render(await renderResults({ page: 2 }));

    expect(getCampaignPage).toHaveBeenCalledWith({ page: 2, perPage: PER_PAGE });
  });

  it.each([
    { code: "SPRING2026", name: "配布前" },
    { code: "WINTER2025", name: "配布中" },
    { code: "FLASH1225", name: "停止" },
    { code: "AUTUMN2025", name: "期間外" },
  ])("受け取った時刻で状態を決め、$code の行に $name を出す", async ({ code, name }) => {
    render(await renderResults());

    expect(within(rowOf(code)).getByText(name)).toBeInTheDocument();
  });

  it("停止した行だけが、操作を持たない", async () => {
    render(await renderResults());

    expect(screen.queryByRole("button", { name: "FLASH1225 の操作" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SPRING2026 の操作" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "WINTER2025 の操作" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AUTUMN2025 の操作" })).toBeInTheDocument();
  });

  it("残り枚数を、総枚数から配った枚数を引いて出す", async () => {
    render(await renderResults());

    expect(within(rowOf("WINTER2025")).getByText("700 / 1,000")).toBeInTheDocument();
  });

  it("全件数と 1 ページの件数から、跳べるページ数を導く", async () => {
    render(await renderResults());

    const nav = screen.getByRole("navigation", { name: "キャンペーン一覧のページ送り" });

    expect(within(nav).getByRole("link", { name: "3 ページ目" })).toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "4 ページ目" })).not.toBeInTheDocument();
  });

  it("いま見ているページを現在地として示す", async () => {
    render(await renderResults({ page: 2 }));

    expect(screen.getByRole("link", { name: "2 ページ目" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "1 ページ目" })).not.toHaveAttribute("aria-current");
  });

  it("先頭ページへは、条件を載せない住所で移る", async () => {
    render(await renderResults({ page: 2 }));

    expect(screen.getByRole("link", { name: "1 ページ目" })).toHaveAttribute(
      "href",
      ADMIN_CAMPAIGN_LIST_PATH,
    );
  });

  it("2 ページ目からは、ページ番号を載せた住所で移る", async () => {
    render(await renderResults({ page: 2 }));

    expect(screen.getByRole("link", { name: "3 ページ目" })).toHaveAttribute(
      "href",
      `${ADMIN_CAMPAIGN_LIST_PATH}?page=3`,
    );
  });

  it("停止の送信先を、一覧へそのまま渡す", async () => {
    render(await renderResults());

    const [listProps] = vi.mocked(SuspendableCampaignList).mock.calls[0] ?? [];

    expect(listProps?.suspendAction).toBe(suspendAction);
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(await renderResults());

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  // ----- 1 ページに収まるとき -----
  it("前後のどちらへも進めない", async () => {
    getCampaignPage.mockResolvedValue(page([ACTIVE], 1));

    render(await renderResults());

    expect(screen.getByRole("button", { name: "前のページ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "次のページ" })).toBeDisabled();
  });

  // ----- 空のとき -----
  it("1 件も無ければ、無いことを伝える", async () => {
    getCampaignPage.mockResolvedValue(page([], 0));

    render(await renderResults());

    expect(screen.getByText("キャンペーンはまだありません。")).toBeInTheDocument();
  });

  it("総ページ数を超えるページを開いたとき、空の一覧と、現在地を持たないページ送りを示す", async () => {
    getCampaignPage.mockResolvedValue(page([], 3));

    render(await renderResults({ page: 50 }));

    const nav = screen.getByRole("navigation", { name: "キャンペーン一覧のページ送り" });

    expect(screen.getByText("キャンペーンはまだありません。")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "1 ページ目" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(within(nav).queryAllByRole("link", { current: "page" })).toHaveLength(0);
  });

  // ----- 取得が失敗したとき -----
  it("取得が失敗すれば、その失敗を境界へ渡す", async () => {
    getCampaignPage.mockRejectedValue(new Error("取得に失敗しました"));

    await expect(renderResults()).rejects.toThrow("取得に失敗しました");
  });
});
