// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";

import { UnsavedChangesGuard } from "../../ui/unsaved-changes-guard/unsaved-changes-guard";
import type { ProductFormState } from "../form-state";
import { AdminProductCreateView } from "./view";

// 申告の宛先は器で、器が何を見張っているかは `NavigationGuard` へ渡る `when` に現れる。
const guard = vi.hoisted(() => ({ when: false }));

vi.mock("@/components/app-starter/navigation-guard/navigation-guard", () => ({
  NavigationGuard: ({ children, when }: { children: ReactNode; when: boolean }) => {
    guard.when = when;

    return children;
  },
}));

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  guard.when = false;
});

const CATEGORY_OPTIONS = [{ value: "category-1", label: "電子機器" }];
const STATUS_OPTIONS = [{ value: "status-1", label: "在庫あり" }];

const idle = () => Promise.resolve(idleActionState<void>());
const uploaded = () => Promise.resolve(succeededActionState("products/uploaded.png"));

function renderView(createAction: () => Promise<ProductFormState> = idle) {
  return render(
    <UnsavedChangesGuard>
      <AdminProductCreateView
        categoryOptions={CATEGORY_OPTIONS}
        createAction={createAction}
        maxUploadBytes={4 * 1024 * 1024}
        statusOptions={STATUS_OPTIONS}
        uploadAction={uploaded}
      />
    </UnsavedChangesGuard>,
  );
}

/** 基本情報の必須をすべて埋める。 */
function fillBasics() {
  fireEvent.change(screen.getByLabelText("商品名"), { target: { value: "商品" } });
  fireEvent.change(screen.getByLabelText("価格"), { target: { value: "19.99" } });
  fireEvent.change(screen.getByLabelText("在庫数"), { target: { value: "3" } });
  fireEvent.change(screen.getByLabelText("分類"), { target: { value: "category-1" } });
}

describe("AdminProductCreateView", () => {
  // ----- 正常系 -----
  it("5 つの段を進捗として並べる", () => {
    renderView();

    const progress = screen.getByRole("list", { name: "商品の登録の進捗" });

    expect(
      [...progress.querySelectorAll("li")].map((item) =>
        item.textContent?.replace(/\s+/g, "").slice(-4),
      ),
    ).toHaveLength(5);
  });

  it("表示していない段の入力も送信に残す", () => {
    const { container } = renderView();

    // 公開の段は隠れているが、送信の欄としては存在する。
    expect(container.querySelector('select[name="statusId"]')).toBeInTheDocument();
  });

  it("埋まれば次の段へ進める", () => {
    renderView();

    fillBasics();
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));

    expect(screen.getByRole("textbox", { name: "商品説明" })).toBeVisible();
  });

  it("公開の段の操作は確認へ進む", () => {
    renderView();

    fillBasics();
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));

    expect(screen.getByRole("button", { name: "確認" })).toBeInTheDocument();
  });

  it("最後の段でだけ送信の操作を出す", () => {
    renderView();

    expect(screen.queryByRole("button", { name: "登録する" })).not.toBeInTheDocument();
  });

  it("入力すると、書きかけがあることを器へ申告する", () => {
    renderView();

    fireEvent.change(screen.getByLabelText("商品名"), { target: { value: "書きかけ" } });

    expect(guard.when).toBe(true);
  });

  // ----- 異常系 -----
  it("必須が埋まるまで次の段へ進めない", () => {
    renderView();

    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
  });

  it("入力欄にブラウザの必須指定を与えない。隠れた段で送信が黙って止まるため", () => {
    renderView();

    const input = screen.getByLabelText("商品名");

    expect(input).not.toHaveAttribute("required");
    // 支援技術へは必須であることを伝える。止めるのはブラウザではなく画面。
    expect(input).toHaveAttribute("aria-required", "true");
  });

  it("送信が弾かれたら、項目ごとの誤りを辿れる形で出す", async () => {
    renderView(() =>
      Promise.resolve(
        failedActionState<void>({ formError: null, fieldErrors: { price: ["登録できません。"] } }),
      ),
    );

    fillBasics();
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    fireEvent.change(screen.getByLabelText("状態"), { target: { value: "status-1" } });
    fireEvent.click(screen.getByRole("button", { name: "確認" }));
    fireEvent.click(screen.getByRole("button", { name: "登録する" }));

    expect(await screen.findByRole("link", { name: /価格/ })).toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderView();

    await waitFor(() => expect(screen.getByLabelText("商品名")).toBeInTheDocument());

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
