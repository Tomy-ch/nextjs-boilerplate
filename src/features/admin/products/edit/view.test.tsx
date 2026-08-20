// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";
import type { Product } from "@/model/product/product";
import { toProductId } from "@/model/product/product";

import { UnsavedChangesGuard } from "../../ui/unsaved-changes-guard/unsaved-changes-guard";
import type { ProductFormState } from "../form-state";
import { PRODUCT_VERSION_CONFLICT_MESSAGE } from "../form-state";
import { AdminProductEditView } from "./view";

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

const PRODUCT: Product = {
  id: toProductId("0195f0c2-0000-7000-8000-000000000001"),
  name: "ワイヤレスイヤホン",
  description: "<p>説明</p>",
  price: "19.99",
  quantity: 12,
  stockWarningThreshold: 3,
  status: { id: "status-1", name: "在庫あり" },
  category: { id: "category-1", name: "電子機器" },
  publishedAt: new Date("2026-08-07T09:00:00.000Z"),
  imagePaths: ["products/saved.png"],
  version: 4,
};

const SAVED_IMAGES = [{ imagePath: "products/saved.png", url: "/saved.png" }];

const idle = () => Promise.resolve(idleActionState<void>());
const uploaded = () => Promise.resolve(succeededActionState("products/uploaded.png"));

function renderView(updateAction: () => Promise<ProductFormState> = idle) {
  return render(
    <UnsavedChangesGuard>
      <AdminProductEditView
        categoryOptions={CATEGORY_OPTIONS}
        maxUploadBytes={4 * 1024 * 1024}
        product={PRODUCT}
        savedImages={SAVED_IMAGES}
        statusOptions={STATUS_OPTIONS}
        updateAction={updateAction}
        uploadAction={uploaded}
      />
    </UnsavedChangesGuard>,
  );
}

describe("AdminProductEditView", () => {
  it("4 つの観点を切り替えとして並べる", () => {
    renderView();

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "基本情報",
      "説明",
      "画像",
      "公開",
    ]);
  });

  it("読み込んだ内容を各欄へ入れる", () => {
    renderView();

    expect(screen.getByLabelText("商品名")).toHaveValue("ワイヤレスイヤホン");
    expect(screen.getByLabelText("価格")).toHaveValue("19.99");
  });

  it("在庫数を扱わない。在庫は別の口が持つため", () => {
    renderView();

    expect(screen.queryByLabelText("在庫数")).not.toBeInTheDocument();
  });

  it("読み込んだ時点の版を送信へ載せる", () => {
    const { container } = renderView();

    expect(container.querySelector('input[name="version"]')).toHaveValue("4");
  });

  it("保存済みの画像も送信へ載せる。送らないと既にある画像が消えるため", () => {
    const { container } = renderView();

    expect(container.querySelector('input[name="images"]')).toHaveValue("products/saved.png");
  });

  it("選んでいない観点だけを見せない。値は送信に残す", () => {
    const { container } = renderView();

    const [, description] = screen.getAllByRole("tabpanel", { hidden: true });

    expect(description).not.toBeVisible();
    expect(container.querySelector('input[name="description"]')).toHaveValue("<p>説明</p>");
  });

  it("観点を選ぶと、その中身が見える", () => {
    renderView();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "公開" }));

    expect(screen.getByLabelText("公開日時")).toBeVisible();
  });

  it("開いた時点から変わっていなければ、書きかけとして申告しない", () => {
    renderView();

    expect(guard.when).toBe(false);
  });

  it("直せば書きかけとして申告する", () => {
    renderView();

    fireEvent.change(screen.getByLabelText("商品名"), { target: { value: "別の名前" } });

    expect(guard.when).toBe(true);
  });

  it("送信が弾かれたら、誤りのある観点へ移る", async () => {
    renderView(() =>
      Promise.resolve(
        failedActionState<void>({
          formError: null,
          fieldErrors: { statusId: ["状態を選んでください。"] },
        }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "更新する" }));

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "公開" })).toHaveAttribute("aria-selected", "true"),
    );
  });

  it("弾かれなかったときは観点を移さない", async () => {
    renderView(() => Promise.resolve(succeededActionState<void>(undefined)));

    fireEvent.mouseDown(screen.getByRole("tab", { name: "画像" }));
    fireEvent.click(screen.getByRole("button", { name: "更新する" }));

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "画像" })).toHaveAttribute("aria-selected", "true"),
    );
  });

  it("項目ごとの誤りが無ければ、観点を移さない", async () => {
    renderView(() => Promise.resolve(failedActionState<void>({ formError: "認証が必要です。" })));

    fireEvent.mouseDown(screen.getByRole("tab", { name: "画像" }));
    fireEvent.click(screen.getByRole("button", { name: "更新する" }));

    await screen.findByText("認証が必要です。");

    expect(screen.getByRole("tab", { name: "画像" })).toHaveAttribute("aria-selected", "true");
  });

  it("版が食い違ったときだけ、読み込み直す導線を添える", async () => {
    renderView(() =>
      Promise.resolve(
        failedActionState<void>({
          formError: PRODUCT_VERSION_CONFLICT_MESSAGE,
          kind: ErrorKind.CONFLICT,
        }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "更新する" }));

    expect(await screen.findByRole("link", { name: "読み込み直す" })).toBeInTheDocument();
  });

  it("同じ文言でも、分類が伴わなければ導線を出さない", async () => {
    // 合図は分類であって文言ではない。文言へ動的な要素を足しても導線が消えないための固定。
    renderView(() =>
      Promise.resolve(failedActionState<void>({ formError: PRODUCT_VERSION_CONFLICT_MESSAGE })),
    );

    fireEvent.click(screen.getByRole("button", { name: "更新する" }));

    await screen.findByText(PRODUCT_VERSION_CONFLICT_MESSAGE);

    expect(screen.queryByRole("link", { name: "読み込み直す" })).not.toBeInTheDocument();
  });

  it("やり直しても直らない失敗には、読み込み直す導線を添えない", async () => {
    renderView(() => Promise.resolve(failedActionState<void>({ formError: "認証が必要です。" })));

    fireEvent.click(screen.getByRole("button", { name: "更新する" }));

    expect(await screen.findByText("認証が必要です。")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "読み込み直す" })).not.toBeInTheDocument();
  });

  it("観点を移すと、直前の結果を下げる", async () => {
    renderView(() => Promise.resolve(failedActionState<void>({ formError: "認証が必要です。" })));

    fireEvent.click(screen.getByRole("button", { name: "更新する" }));
    await screen.findByText("認証が必要です。");

    fireEvent.mouseDown(screen.getByRole("tab", { name: "画像" }));

    expect(screen.queryByText("認証が必要です。")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderView();

    await waitFor(() => expect(screen.getByLabelText("商品名")).toBeInTheDocument());

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
