// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { type ActionState, failedActionState, succeededActionState } from "@/model/action-state";

const { setCartItemQuantityAction } = vi.hoisted(() => ({
  setCartItemQuantityAction:
    vi.fn<(previous: ActionState<void>, formData: FormData) => Promise<ActionState<void>>>(),
}));

vi.mock("../../actions", () => ({ setCartItemQuantityAction }));

import { CartMatchStockButton } from "./match-stock-button";

const PRODUCT_ID = "0195f0c2-0000-7000-8000-000000000001";

/** 在庫 2 個に対して、名前つきで置いた操作。 */
function renderButton() {
  return render(
    <CartMatchStockButton availableQuantity={2} label="イヤホン" productId={PRODUCT_ID} />,
  );
}

beforeEach(() => {
  setCartItemQuantityAction.mockReset();
  setCartItemQuantityAction.mockResolvedValue(succeededActionState(undefined));
});

describe("CartMatchStockButton", () => {
  it("合わせる先の数を文言に出す", () => {
    renderButton();

    expect(
      screen.getByRole("button", { name: "イヤホン を在庫の 2 個に合わせる" }),
    ).toHaveTextContent("在庫の 2 個に合わせる");
  });

  it("押すと対象の商品と、いま買える数を送る", async () => {
    const user = userEvent.setup();

    renderButton();
    await user.click(screen.getByRole("button"));

    const formData = setCartItemQuantityAction.mock.calls.at(-1)?.[1];

    expect(formData?.get("productId")).toBe(PRODUCT_ID);
    expect(formData?.get("quantity")).toBe("2");
  });

  it("送信中は押せなくする", async () => {
    const user = userEvent.setup();
    let settle: (() => void) | undefined;

    setCartItemQuantityAction.mockReturnValue(
      new Promise((resolve) => {
        settle = () => resolve(succeededActionState(undefined));
      }),
    );

    renderButton();
    await user.click(screen.getByRole("button"));

    expect(await screen.findByRole("button")).toBeDisabled();

    settle?.();
    await waitFor(() => expect(screen.getByRole("button")).toBeEnabled());
  });
  it("失敗したとき、その操作の隣に理由を出す", async () => {
    const user = userEvent.setup();

    setCartItemQuantityAction.mockResolvedValue(
      failedActionState({ formError: "現在サービスを利用できません。" }),
    );

    renderButton();
    await user.click(screen.getByRole("button"));

    expect(await screen.findByText("数量を合わせられませんでした")).toBeVisible();
    expect(screen.getByText("現在サービスを利用できません。")).toBeVisible();
  });

  it("送信していない間は失敗の文言を出さない", () => {
    renderButton();

    expect(screen.queryByText("数量を合わせられませんでした")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderButton();

    expect((await axe(container)).violations).toEqual([]);
  });
});
