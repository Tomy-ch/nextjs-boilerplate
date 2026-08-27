// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";

import { UnsavedChangesGuard } from "../../ui/unsaved-changes-guard/unsaved-changes-guard";
import type { ProductFormState } from "../form-state";
import { AdminProductCreateView } from "./view";

// 申告の宛先は器で、器が何を見張っているかは `NavigationGuard` へ渡る `when` に現れる。
const guard = vi.hoisted(() => ({ when: false }));

// 編集面は ProseMirror で、合成した input に応じない。編集面自身の振る舞いはその部品の
// テストが持つので、ここは同じ役割と名前を持つ入力欄へ差し替え、画面の配線だけを確かめる。
vi.mock("@/components/design-system/rich-text/rich-text-editor/rich-text-editor", async () => {
  const { useCallback } = await import("react");

  return {
    RichTextEditor: ({
      id,
      label,
      onChange,
    }: {
      id?: string;
      label: string;
      onChange: (html: string) => void;
    }) => {
      const handleChange = useCallback(
        (event: { target: { value: string } }) => onChange(event.target.value),
        [onChange],
      );

      return <textarea aria-label={label} id={id} onChange={handleChange} value="" />;
    },
  };
});

vi.mock("@/components/app-starter/navigation-guard/navigation-guard", () => ({
  NavigationGuard: ({ children, when }: { children: ReactNode; when: boolean }) => {
    guard.when = when;

    return children;
  },
}));

// 確認の段は `next/dynamic` で読まれる。先に解決しておかないと、要素を待つ時間の中に module の
// 読み込みが入る（`docs/testing-conventions.md`「`next/dynamic` を含む木を描くとき」）。
beforeAll(async () => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();

  await import("../ui/confirm-section/confirm-details");
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
async function fillBasics() {
  await userEvent.type(screen.getByLabelText("商品名"), "商品");
  await userEvent.type(screen.getByLabelText("価格"), "19.99");
  await userEvent.type(screen.getByLabelText("在庫数"), "3");
  await userEvent.selectOptions(screen.getByLabelText("分類"), "category-1");
}

describe("AdminProductCreateView", () => {
  it("5 つの段を進捗として並べる", () => {
    renderView();

    const progress = screen.getByRole("list", { name: "商品の登録の進捗" });

    expect(
      [...progress.querySelectorAll("li")].map((item) =>
        item.textContent?.replace(/\s+/g, "").slice(-4),
      ),
    ).toHaveLength(5);
  });

  it("到達していない段は、まだ組み立てない", () => {
    const { container } = renderView();

    expect(container.querySelector('select[name="statusId"]')).not.toBeInTheDocument();
  });

  it("通り過ぎた段の入力は、隠れたあとも送信に残す", async () => {
    const { container } = renderView();

    await fillBasics();
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    expect(container.querySelector('input[name="name"]')).toBeInTheDocument();
  });

  it("埋まれば次の段へ進める", async () => {
    renderView();

    await fillBasics();
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    expect(screen.getByRole("textbox", { name: "商品説明" })).toBeVisible();
  });

  it("本文の変更を値へ入れ、直前の結果を下げる", async () => {
    renderView(() => Promise.resolve(failedActionState<void>({ formError: "登録できません。" })));

    await fillBasics();
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    // **ここは `user-event` を使いません。**差し替えた入力欄は編集面の代役で、実物は打鍵ごとに
    // 文字を足すのではなく、組み上げた HTML をまとめて返します。1 文字ずつ送ると実物と違う
    // 呼ばれ方になります。
    fireEvent.change(screen.getByRole("textbox", { name: "商品説明" }), {
      target: { value: "<p>書いた本文</p>" },
    });

    await waitFor(() =>
      expect(document.querySelector('input[name="description"]')).toHaveValue("<p>書いた本文</p>"),
    );
  });

  it("公開の段の操作は確認へ進む", async () => {
    renderView();

    await fillBasics();
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));

    expect(screen.getByRole("button", { name: "確認" })).toBeInTheDocument();
  });

  it("最後の段でだけ送信の操作を出す", () => {
    renderView();

    expect(screen.queryByRole("button", { name: "登録する" })).not.toBeInTheDocument();
  });

  it("入力すると、書きかけがあることを器へ申告する", async () => {
    renderView();

    await userEvent.clear(screen.getByLabelText("商品名"));
    await userEvent.type(screen.getByLabelText("商品名"), "書きかけ");

    expect(guard.when).toBe(true);
  });

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

    await fillBasics();
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    await userEvent.click(screen.getByRole("button", { name: "次へ" }));
    await userEvent.selectOptions(screen.getByLabelText("状態"), "status-1");
    await userEvent.click(screen.getByRole("button", { name: "確認" }));
    await userEvent.click(screen.getByRole("button", { name: "登録する" }));

    expect(await screen.findByRole("link", { name: /価格/ })).toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderView();

    await screen.findByLabelText("商品名");

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
