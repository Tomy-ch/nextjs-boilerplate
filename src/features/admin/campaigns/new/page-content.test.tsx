// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { idleActionState } from "@/model/action-state";

import type { CreateCampaignAction } from "./form-state";

const { getProductCategories } = vi.hoisted(() => ({
  getProductCategories: vi.fn(),
}));

vi.mock("@/adapters/server/api/product-masters", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/product-masters")>()),
  getProductCategories,
}));

vi.mock("./view", () => ({
  AdminCampaignCreateView: (props: { categoryOptions: unknown }) => (
    <output>{JSON.stringify(props.categoryOptions)}</output>
  ),
}));

import { AdminCampaignCreatePageContent } from "./page-content";

const createAction: CreateCampaignAction = () => Promise.resolve(idleActionState());

function assemble() {
  return AdminCampaignCreatePageContent({ createAction });
}

function passedOptions(): unknown {
  return JSON.parse(screen.getByRole("status").textContent ?? "");
}

beforeEach(() => {
  vi.clearAllMocks();
  getProductCategories.mockResolvedValue([
    { id: "category-1", name: "家電", code: 1 },
    { id: "category-2", name: "雑貨", code: 2 },
  ]);
});

describe("AdminCampaignCreatePageContent", () => {
  // ----- 揃ったとき -----
  it("カテゴリのマスタを、識別子を値に・名前を表示にした候補へ直して並び順のまま渡す", async () => {
    render(await assemble());

    expect(passedOptions()).toEqual([
      { value: "category-1", label: "家電" },
      { value: "category-2", label: "雑貨" },
    ]);
  });

  it("送信先を受け取ったまま画面へ渡す", async () => {
    const element = await assemble();

    expect(element.props.createAction).toBe(createAction);
  });

  it("カテゴリのマスタを 1 度だけ取る", async () => {
    await assemble();

    expect(getProductCategories).toHaveBeenCalledTimes(1);
  });

  // ----- 空のとき -----
  it("カテゴリが 1 件も無ければ、候補を空のまま渡す", async () => {
    getProductCategories.mockResolvedValue([]);

    render(await assemble());

    expect(passedOptions()).toEqual([]);
  });

  // ----- 取得に失敗したとき -----
  it("取得の失敗は握り潰さず、境界へ渡す", async () => {
    getProductCategories.mockRejectedValue(new Error("取得に失敗しました"));

    await expect(assemble()).rejects.toThrow("取得に失敗しました");
  });
});
