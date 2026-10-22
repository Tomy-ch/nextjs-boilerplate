// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { placeOrderAction } = vi.hoisted(() => ({ placeOrderAction: vi.fn() }));

vi.mock("../../../actions", () => ({ placeOrderAction }));

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, succeededActionState } from "@/model/action-state";

import { COUPON_ID_FIELD } from "../../../form-fields";
import type { PlaceOrderFormState } from "../../../form-state";
import {
  PlaceOrderStateProvider,
  usePlaceOrderState,
} from "../place-order-state/place-order-state";
import { PlaceOrderError, PlaceOrderSubmit } from "./place-order-submit";

const KEY = "0195f0c2-0000-7000-a000-000000000001";
const LABEL = "注文を確定する";

/**
 * 送信部と失敗の表示を、実画面と同じ器の中で描く。
 *
 * 状態を props で差し込まないのは、この 2 つが読むのが器の持つ 1 つの状態だからで、差し込むと
 * 「器と繋がっているか」を確かめられなくなる。
 */
function renderSubmit({ orderable = true, fullWidth = false } = {}) {
  return render(
    <PlaceOrderStateProvider coupons={[]} idempotencyKey={KEY}>
      <PlaceOrderForm fullWidth={fullWidth} orderable={orderable} />
    </PlaceOrderStateProvider>,
  );
}

/** 器の中で送信できる最小の姿。送信先は器が持つものをそのまま使う。 */
function PlaceOrderForm({ orderable, fullWidth }: { orderable: boolean; fullWidth: boolean }) {
  const { formAction } = usePlaceOrderState();

  return (
    <form action={formAction}>
      <PlaceOrderSubmit fullWidth={fullWidth} label={LABEL} orderable={orderable} />
      <PlaceOrderError />
    </form>
  );
}

function SelectNoCouponButton() {
  const { selectCoupon } = usePlaceOrderState();
  const select = useCallback(() => selectCoupon(null), [selectCoupon]);

  return (
    <button type="button" onClick={select}>
      クーポンを使わない
    </button>
  );
}

function renderWithCouponChoice() {
  return render(
    <PlaceOrderStateProvider coupons={[]} idempotencyKey={KEY}>
      <PlaceOrderForm fullWidth={false} orderable />
      <SelectNoCouponButton />
    </PlaceOrderStateProvider>,
  );
}

async function submit() {
  await userEvent.click(screen.getByRole("button", { name: LABEL }));
}

/** 送信が返す結果を決める。返さないあいだ待ち続けたいときは `settle` を呼ぶまで解決しない。 */
function respondWith(state: PlaceOrderFormState) {
  placeOrderAction.mockResolvedValue(state);
}

beforeEach(() => {
  placeOrderAction.mockReset();
  respondWith(succeededActionState(undefined));
});

describe("PlaceOrderSubmit", () => {
  it("受け取った文言で送信する操作を出す", () => {
    renderSubmit();

    const button = screen.getByRole("button", { name: LABEL });

    expect(button).toHaveAttribute("type", "submit");
    expect(button).toBeEnabled();
  });

  it("幅を占めるかどうかを呼び出し元が決める", () => {
    renderSubmit({ fullWidth: true });

    expect(screen.getByRole("button", { name: LABEL })).toHaveClass("w-full");
  });

  it("送っている間は、押せなくしたうえで進行を読み上げる", async () => {
    let settle: ((state: PlaceOrderFormState) => void) | undefined;
    placeOrderAction.mockReturnValue(
      new Promise<PlaceOrderFormState>((resolve) => {
        settle = resolve;
      }),
    );

    renderSubmit();
    await submit();

    expect(await screen.findByRole("button", { name: "注文を確定しています" })).toBeDisabled();

    settle?.(succeededActionState(undefined));
    await waitFor(() => expect(screen.getByRole("button", { name: LABEL })).toBeEnabled());
  });

  it("確定できる明細が無ければ押せない", () => {
    renderSubmit({ orderable: false });

    expect(screen.getByRole("button", { name: LABEL })).toBeDisabled();
  });
});

describe("PlaceOrderError", () => {
  it("まだ送っていない状態では何も出さない", () => {
    renderSubmit();

    expect(screen.queryByText("注文を確定できませんでした")).not.toBeInTheDocument();
  });

  it("成立した状態では何も出さない", async () => {
    renderSubmit();
    await submit();

    await waitFor(() => expect(screen.getByRole("button", { name: LABEL })).toBeEnabled());
    expect(screen.queryByText("注文を確定できませんでした")).not.toBeInTheDocument();
  });

  it("失敗の理由を出す", async () => {
    respondWith(failedActionState({ formError: "在庫が変わりました。" }));

    renderSubmit();
    await submit();

    expect(await screen.findByText("在庫が変わりました。")).toBeVisible();
    expect(screen.getByText("注文を確定できませんでした")).toBeVisible();
  });

  it("理由の無い失敗では何も出さない", async () => {
    respondWith(failedActionState());

    renderSubmit();
    await submit();

    await waitFor(() => expect(screen.getByRole("button", { name: LABEL })).toBeEnabled());
    expect(screen.queryByText("注文を確定できませんでした")).not.toBeInTheDocument();
  });

  it("クーポンを名指しした拒否の後にクーポンを選び直すと、理由を消す", async () => {
    respondWith(
      failedActionState({
        formError: "クーポンを使えませんでした。",
        fieldErrors: { [COUPON_ID_FIELD]: ["このクーポンは使えなくなりました。"] },
        kind: ErrorKind.VALIDATION,
      }),
    );

    renderWithCouponChoice();
    await submit();
    await screen.findByText("クーポンを使えませんでした。");
    await userEvent.click(screen.getByRole("button", { name: "クーポンを使わない" }));

    expect(screen.queryByText("注文を確定できませんでした")).not.toBeInTheDocument();
  });

  it("衝突で拒まれた後にクーポンを選び直しても、理由を出したまま", async () => {
    respondWith(failedActionState({ formError: "在庫が変わりました。", kind: ErrorKind.CONFLICT }));

    renderWithCouponChoice();
    await submit();
    await screen.findByText("在庫が変わりました。");
    await userEvent.click(screen.getByRole("button", { name: "クーポンを使わない" }));

    expect(screen.getByText("在庫が変わりました。")).toBeVisible();
    expect(screen.getByText("注文を確定できませんでした")).toBeVisible();
  });

  it("結果の定まらない失敗の後は、クーポンを選び直そうとしても理由を出したまま", async () => {
    respondWith(
      failedActionState({ formError: "いまは確定できません。", kind: ErrorKind.UNAVAILABLE }),
    );

    renderWithCouponChoice();
    await submit();
    await screen.findByText("いまは確定できません。");
    await userEvent.click(screen.getByRole("button", { name: "クーポンを使わない" }));

    expect(screen.getByText("いまは確定できません。")).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    respondWith(failedActionState({ formError: "在庫が変わりました。" }));

    const { container } = renderSubmit();

    await submit();
    await screen.findByText("在庫が変わりました。");

    expect((await axe(container)).violations).toEqual([]);
  });
});
