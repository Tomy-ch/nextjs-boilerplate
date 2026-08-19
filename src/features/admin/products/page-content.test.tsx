// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { getProductCategories, getProductStatuses, results } = vi.hoisted(() => ({
  getProductCategories: vi.fn(),
  getProductStatuses: vi.fn(),
  results: vi.fn(),
}));

vi.mock("@/adapters/server/api/product-masters", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/product-masters")>()),
  getProductCategories,
  getProductStatuses,
}));
vi.mock("./results", () => ({
  AdminProductListResults: (props: unknown) => {
    results(props);

    return <p>一覧</p>;
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { AdminProductListPageContent } from "./page-content";

beforeEach(() => {
  vi.clearAllMocks();
  getProductCategories.mockResolvedValue([{ id: "c1", name: "電子機器", code: 1 }]);
  getProductStatuses.mockResolvedValue([{ id: "s1", name: "在庫切れ", code: 2 }]);
});

describe("AdminProductListPageContent", () => {
  it("画面と一覧を組み立てる", async () => {
    render(await AdminProductListPageContent({ searchParams: {} }));

    expect(screen.getByRole("region", { name: "商品の検索と絞り込み" })).toBeInTheDocument();
    expect(await screen.findByText("一覧")).toBeInTheDocument();
  });

  it("マスタを選択肢へ直して入力欄へ渡す", async () => {
    render(await AdminProductListPageContent({ searchParams: {} }));

    expect(screen.getByRole("option", { name: "電子機器" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "在庫切れ" })).toBeInTheDocument();
  });

  it("先頭に指定なしの選択肢を置く", async () => {
    render(await AdminProductListPageContent({ searchParams: {} }));

    expect(screen.getByRole("option", { name: "すべての分類" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "すべての状態" })).toBeInTheDocument();
  });

  it("URL の条件を読んで入力欄へ反映する", async () => {
    render(await AdminProductListPageContent({ searchParams: { categoryCodes: "1" } }));

    expect(screen.getByLabelText("分類")).toHaveValue("1");
  });

  it("URL が表す場所を一覧へ渡す", async () => {
    render(await AdminProductListPageContent({ searchParams: { keyword: "鞄", after: "c1" } }));

    expect(results).toHaveBeenCalledWith(
      expect.objectContaining({
        location: expect.objectContaining({ keyword: "鞄", cursor: "c1" }),
      }),
    );
  });

  // ----- 条件が契約を外れているとき -----
  it("一覧の代わりに、条件が正しくないことを出す", async () => {
    render(await AdminProductListPageContent({ searchParams: { categoryCodes: "abc" } }));

    expect(screen.getByText("この条件では商品を表示できません")).toBeInTheDocument();
    expect(screen.queryByText("一覧")).not.toBeInTheDocument();
  });

  it("外れた条件を名指しする", async () => {
    render(await AdminProductListPageContent({ searchParams: { statusCodes: "xyz" } }));

    expect(screen.getByText("確認する条件: 状態")).toBeInTheDocument();
  });

  it("整数でない分類のコードを弾く", async () => {
    render(await AdminProductListPageContent({ searchParams: { categoryCodes: "1.5" } }));

    expect(screen.getByText("この条件では商品を表示できません")).toBeInTheDocument();
  });

  it("契約を外れた条件では取得へ進まない", async () => {
    render(await AdminProductListPageContent({ searchParams: { categoryCodes: "abc" } }));

    expect(results).not.toHaveBeenCalled();
  });

  it("条件を外して戻る導線を添える", async () => {
    render(await AdminProductListPageContent({ searchParams: { categoryCodes: "abc" } }));

    expect(screen.getByRole("link", { name: "条件を外して一覧を見る" })).toBeInTheDocument();
  });

  it("2 つのマスタを並行して取る", async () => {
    render(await AdminProductListPageContent({ searchParams: {} }));

    expect(getProductCategories).toHaveBeenCalledTimes(1);
    expect(getProductStatuses).toHaveBeenCalledTimes(1);
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(await AdminProductListPageContent({ searchParams: {} }));

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
