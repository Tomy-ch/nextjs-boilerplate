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

import { CartQuantityStepper } from "./quantity-stepper";

const PRODUCT_ID = "0195f0c2-0000-7000-8000-000000000001";

/** 直近の送信内容。 */
function submitted(): FormData | undefined {
  return setCartItemQuantityAction.mock.calls.at(-1)?.[1];
}

beforeEach(() => {
  setCartItemQuantityAction.mockReset();
  setCartItemQuantityAction.mockResolvedValue(succeededActionState(undefined));
});

describe("CartQuantityStepper", () => {
  it("現在の数量を出す", () => {
    render(<CartQuantityStepper label="イヤホン" productId={PRODUCT_ID} quantity={3} />);

    expect(screen.getByText("3")).toBeVisible();
  });

  it("増やす操作で 1 つ多い数量を送る", async () => {
    const user = userEvent.setup();

    render(<CartQuantityStepper label="イヤホン" productId={PRODUCT_ID} quantity={3} />);
    await user.click(screen.getByRole("button", { name: "イヤホン を 1 つ増やす" }));

    expect(submitted()?.get("productId")).toBe(PRODUCT_ID);
    expect(submitted()?.get("quantity")).toBe("4");
  });

  it("減らす操作で 1 つ少ない数量を送る", async () => {
    const user = userEvent.setup();

    render(<CartQuantityStepper label="イヤホン" productId={PRODUCT_ID} quantity={3} />);
    await user.click(screen.getByRole("button", { name: "イヤホン を 1 つ減らす" }));

    expect(submitted()?.get("quantity")).toBe("2");
  });

  it("1 のときは減らせない", () => {
    render(<CartQuantityStepper label="イヤホン" productId={PRODUCT_ID} quantity={1} />);

    expect(screen.getByRole("button", { name: "イヤホン を 1 つ減らす" })).toBeDisabled();
  });

  it("渡された上限に達したら増やせない", () => {
    render(<CartQuantityStepper label="イヤホン" max={2} productId={PRODUCT_ID} quantity={2} />);

    expect(screen.getByRole("button", { name: "イヤホン を 1 つ増やす" })).toBeDisabled();
  });

  it("上限を渡さないとき、契約の上限まで増やせる", () => {
    render(<CartQuantityStepper label="イヤホン" productId={PRODUCT_ID} quantity={99} />);

    expect(screen.getByRole("button", { name: "イヤホン を 1 つ増やす" })).toBeDisabled();
  });

  it("送信中はどちらの向きも押せなくする", async () => {
    const user = userEvent.setup();
    let settle: (() => void) | undefined;

    setCartItemQuantityAction.mockReturnValue(
      new Promise((resolve) => {
        settle = () => resolve(succeededActionState(undefined));
      }),
    );

    render(<CartQuantityStepper label="イヤホン" productId={PRODUCT_ID} quantity={3} />);
    await user.click(screen.getByRole("button", { name: "イヤホン を 1 つ増やす" }));

    expect(await screen.findByRole("button", { name: "イヤホン を 1 つ減らす" })).toBeDisabled();

    settle?.();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "イヤホン を 1 つ増やす" })).toBeEnabled(),
    );
  });

  it("失敗したとき、その操作の隣に理由を出す", async () => {
    const user = userEvent.setup();

    setCartItemQuantityAction.mockResolvedValue(
      failedActionState({ formError: "現在サービスを利用できません。" }),
    );

    render(<CartQuantityStepper label="イヤホン" productId={PRODUCT_ID} quantity={3} />);
    await user.click(screen.getByRole("button", { name: "イヤホン を 1 つ増やす" }));

    expect(await screen.findByText("数量を変更できませんでした")).toBeVisible();
    expect(screen.getByText("現在サービスを利用できません。")).toBeVisible();
  });

  it("送信していない間は失敗の文言を出さない", () => {
    render(<CartQuantityStepper label="イヤホン" productId={PRODUCT_ID} quantity={3} />);

    expect(screen.queryByText("数量を変更できませんでした")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <CartQuantityStepper label="イヤホン" productId={PRODUCT_ID} quantity={3} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
