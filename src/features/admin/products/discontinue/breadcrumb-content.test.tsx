// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { toProductId } from "@/model/product/product";

const { getProductIncludingUnpublished } = vi.hoisted(() => ({
  getProductIncludingUnpublished: vi.fn(),
}));

vi.mock("@/adapters/server/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/products")>()),
  getProductIncludingUnpublished,
}));

import { AdminProductDiscontinueBreadcrumbContent } from "./breadcrumb-content";

const ID = toProductId("0195f0c2-0000-7000-8000-000000000001");

describe("AdminProductDiscontinueBreadcrumbContent", () => {
  beforeEach(() => {
    getProductIncludingUnpublished.mockReset();
    getProductIncludingUnpublished.mockResolvedValue({ name: "ワイヤレスイヤホン" });
  });

  it("未公開も含めて読む口で、対象の商品を取る", async () => {
    await AdminProductDiscontinueBreadcrumbContent({ id: ID });

    expect(getProductIncludingUnpublished).toHaveBeenCalledWith(ID);
  });

  it("一覧・商品名・廃番の順に階層を出す", async () => {
    render(await AdminProductDiscontinueBreadcrumbContent({ id: ID }));

    expect(screen.getByRole("link", { name: "商品一覧管理" })).toBeInTheDocument();
    expect(screen.getByText("ワイヤレスイヤホン")).toBeInTheDocument();
    expect(screen.getByText("廃番")).toBeInTheDocument();
  });

  it("途中の商品名は戻り先を持たない", async () => {
    render(await AdminProductDiscontinueBreadcrumbContent({ id: ID }));

    expect(screen.queryByRole("link", { name: "ワイヤレスイヤホン" })).not.toBeInTheDocument();
  });

  it("取得が失敗すれば、その失敗を境界へ渡す", async () => {
    getProductIncludingUnpublished.mockRejectedValue(new Error("対象が見つかりません"));

    await expect(AdminProductDiscontinueBreadcrumbContent({ id: ID })).rejects.toThrow(
      "対象が見つかりません",
    );
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(await AdminProductDiscontinueBreadcrumbContent({ id: ID }));

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
