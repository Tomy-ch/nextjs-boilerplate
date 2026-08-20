// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { idleActionState, succeededActionState } from "@/model/action-state";

const { getProductCategories, getProductStatuses } = vi.hoisted(() => ({
  getProductCategories: vi.fn(),
  getProductStatuses: vi.fn(),
}));

vi.mock("@/adapters/server/api/product-masters", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/product-masters")>()),
  getProductCategories,
  getProductStatuses,
}));

vi.mock("./view", () => ({
  AdminProductCreateView: (props: { categoryOptions: unknown; statusOptions: unknown }) => (
    <output>
      {JSON.stringify({ categories: props.categoryOptions, statuses: props.statusOptions })}
    </output>
  ),
}));

import { AdminProductCreatePageContent } from "./page-content";

beforeEach(() => {
  vi.clearAllMocks();
  getProductCategories.mockResolvedValue([{ id: "category-1", name: "電子機器", code: 1 }]);
  getProductStatuses.mockResolvedValue([{ id: "status-1", name: "在庫あり", code: 1 }]);
});

function renderContent() {
  return AdminProductCreatePageContent({
    createAction: () => Promise.resolve(idleActionState()),
    maxUploadBytes: 4 * 1024 * 1024,
    uploadAction: () => Promise.resolve(succeededActionState("products/a.png")),
  });
}

describe("AdminProductCreatePageContent", () => {
  // ----- 正常系 -----
  it("分類と状態のマスタを揃えて画面へ渡す", async () => {
    render(await renderContent());

    expect(screen.getByRole("status").textContent).toContain("電子機器");
    expect(screen.getByRole("status").textContent).toContain("在庫あり");
  });

  it("送るのは識別子で、絞り込みが使うコードではない", async () => {
    render(await renderContent());

    expect(screen.getByRole("status").textContent).toContain("category-1");
  });

  it("互いに依存しないマスタを並行して取る", async () => {
    await renderContent();

    expect(getProductCategories).toHaveBeenCalledTimes(1);
    expect(getProductStatuses).toHaveBeenCalledTimes(1);
  });

  // ----- 異常系 -----
  it("取得の失敗は握り潰さず、境界へ渡す", async () => {
    getProductCategories.mockRejectedValue(new Error("取得に失敗しました"));

    await expect(renderContent()).rejects.toThrow("取得に失敗しました");
  });
});
