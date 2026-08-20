// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useUnsavedChangesStore } from "@/stores/unsaved-changes-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { UnsavedChangesGuard } from "./unsaved-changes-guard";

beforeEach(() => {
  useUnsavedChangesStore.setState({ hasUnsavedChanges: false });
});

describe("UnsavedChangesGuard", () => {
  // ----- 正常系 -----
  it("見張る範囲をそのまま通す", () => {
    render(
      <UnsavedChangesGuard>
        <p>本文</p>
      </UnsavedChangesGuard>,
    );

    expect(screen.getByText("本文")).toBeInTheDocument();
  });

  it("書きかけが無ければ、確認は出ない", () => {
    render(
      <UnsavedChangesGuard>
        <a href="/admin/products">商品一覧管理</a>
      </UnsavedChangesGuard>,
    );

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  // ----- 異常系 -----
  it("書きかけがあるあいだに離れようとしたら確認する", () => {
    useUnsavedChangesStore.setState({ hasUnsavedChanges: true });

    render(
      <UnsavedChangesGuard>
        <a href="/admin/products">商品一覧管理</a>
      </UnsavedChangesGuard>,
    );

    fireEvent.click(screen.getByRole("link", { name: "商品一覧管理" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "編集中の内容は保存されませんが移動しますか？",
    );
  });
});
