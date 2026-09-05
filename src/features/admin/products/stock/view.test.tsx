// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, idleActionState } from "@/model/action-state";
import type { Product } from "@/model/product/product";
import { toProductId } from "@/model/product/product";

import { ADMIN_PRODUCT_LIST_PATH, adminProductStockPath } from "../../paths";
import type { StockFormState } from "./form-state";
import { AdminProductStockView } from "./view";

const PRODUCT: Product = {
  id: toProductId("0195f0c2-0000-7000-8000-000000000001"),
  name: "ワイヤレスイヤホン",
  description: null,
  price: "19.99",
  quantity: 128,
  stockWarningThreshold: null,
  status: { id: "status-1", name: "在庫あり" },
  category: { id: "category-1", name: "電子機器" },
  publishedAt: null,
  discontinuedAt: null,
  imagePaths: [],
  version: 4,
};

const idle = () => Promise.resolve(idleActionState<void>());

function renderView(adjustAction: () => Promise<StockFormState> = idle) {
  return render(<AdminProductStockView adjustAction={adjustAction} product={PRODUCT} />);
}

async function submit() {
  await userEvent.click(screen.getByRole("button", { name: "在庫を更新" }));
}

describe("AdminProductStockView", () => {
  it("対象を hidden の欄で持ち回る", () => {
    const { container } = renderView();

    expect(container.querySelector('input[name="productId"]')).toHaveValue(PRODUCT.id);
  });

  it("送るのをやめる導線を一覧へ向ける", () => {
    renderView();

    expect(screen.getByRole("link", { name: "キャンセル" })).toHaveAttribute(
      "href",
      ADMIN_PRODUCT_LIST_PATH,
    );
  });

  it("結果が無いうちは失敗の報せを出さない", () => {
    renderView();

    expect(screen.queryByText("在庫を更新できませんでした")).not.toBeInTheDocument();
  });

  it("送信そのものの失敗をフォームの先頭に出す", async () => {
    renderView(() =>
      Promise.resolve(failedActionState<void>({ formError: "問題が発生しました。" })),
    );

    await submit();

    expect(await screen.findByText("在庫を更新できませんでした")).toBeInTheDocument();
    expect(screen.getByText("問題が発生しました。")).toBeInTheDocument();
  });

  it("入力の誤りは欄のそばだけに出し、要約を置かない", async () => {
    renderView(() =>
      Promise.resolve(
        failedActionState<void>({
          formError: null,
          fieldErrors: { quantity: ["1 以上の整数を入力してください。"] },
        }),
      ),
    );

    await submit();

    expect(await screen.findByText("1 以上の整数を入力してください。")).toBeInTheDocument();
    expect(screen.queryByText("在庫を更新できませんでした")).not.toBeInTheDocument();
  });

  it("並行して動かされて拒まれたときだけ、読み込み直す導線を添える", async () => {
    renderView(() =>
      Promise.resolve(
        failedActionState<void>({
          formError: "現在の状態ではこの操作を実行できません。",
          kind: ErrorKind.CONFLICT,
        }),
      ),
    );

    await submit();

    const feedback = await screen.findByRole("alert");

    expect(within(feedback).getByRole("link", { name: "読み込み直す" })).toHaveAttribute(
      "href",
      adminProductStockPath(PRODUCT.id),
    );
  });

  it("通信の失敗には読み込み直す導線を添えない", async () => {
    renderView(() =>
      Promise.resolve(
        failedActionState<void>({
          formError: "問題が発生しました。",
          kind: ErrorKind.INTERNAL,
        }),
      ),
    );

    await submit();

    const feedback = await screen.findByRole("alert");

    // 現在の在庫の枠にも同じ呼び名の導線があるため、報せの内側だけを見る。
    expect(within(feedback).queryByRole("link", { name: "読み込み直す" })).not.toBeInTheDocument();
  });

  it("入力を直した時点で直前の結果を下げ、送り直せばまた出す", async () => {
    const adjust = vi.fn(() =>
      Promise.resolve(failedActionState<void>({ formError: "問題が発生しました。" })),
    );

    renderView(adjust);
    await submit();
    await screen.findByText("在庫を更新できませんでした");

    await userEvent.type(screen.getByRole("spinbutton", { name: /数量/ }), "5");

    expect(screen.queryByText("在庫を更新できませんでした")).not.toBeInTheDocument();

    await submit();

    expect(await screen.findByText("在庫を更新できませんでした")).toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderView();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
