// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

beforeAll(() => {
  // 候補を開く overlay が使う表示位置・寸法計測の API を jsdom が持たないため、ここで補う。
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

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
    await userEvent.click(screen.getByRole("button", { name: /分類/ }));

    expect(screen.getByRole("checkbox", { name: "電子機器" })).toBeInTheDocument();
  });

  it("何も選ばれていなければ、すべてを対象にしていることを示す", async () => {
    render(await AdminProductListPageContent({ searchParams: {} }));

    expect(screen.getAllByRole("button", { name: /すべて/ }).length).toBeGreaterThan(0);
  });

  it("URL の条件を読んで入力欄へ反映する", async () => {
    render(await AdminProductListPageContent({ searchParams: { categoryCodes: "1" } }));
    await userEvent.click(screen.getByRole("button", { name: /分類/ }));

    expect(screen.getByRole("checkbox", { name: "電子機器" })).toBeChecked();
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

  it("長すぎる語も、その欄の呼び名で名指しする", async () => {
    render(await AdminProductListPageContent({ searchParams: { keyword: "あ".repeat(256) } }));

    expect(screen.getByText("確認する条件: キーワード")).toBeInTheDocument();
  });

  it("形の違う起点も、その欄の呼び名で名指しする", async () => {
    render(await AdminProductListPageContent({ searchParams: { after: "「」" } }));

    expect(screen.getByText("確認する条件: 読み込み位置")).toBeInTheDocument();
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
