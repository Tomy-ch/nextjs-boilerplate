// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { PlaceOrderFormState } from "../form-state";

const { placeOrderAction } = vi.hoisted(() => ({
  placeOrderAction:
    vi.fn<(previous: PlaceOrderFormState, formData: FormData) => Promise<PlaceOrderFormState>>(),
}));

vi.mock("../actions", () => ({ placeOrderAction }));

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, idleActionState } from "@/model/action-state";
import type { Cart } from "@/model/cart/cart";
import type { CartCoupon } from "@/model/coupon/coupon";
import { formatMoney } from "@/model/money";

import {
  CART_COUPONS,
  EMPTY_CART,
  ORDERABLE_CART,
  PROFILE,
  SUBTOTAL_REFERENCE,
} from "../checkout.fixture";
import { COUPON_ID_FIELD } from "../form-fields";
import { CheckoutConfirmView } from "./view";

const KEY = "0195f0c2-0000-7000-a000-000000000001";
const REJECTED_FORM_ERROR = "選んだクーポンを使えなかったため、注文は確定していません。";
const REJECTED_FIELD_ERROR = "このクーポンは使えなくなりました。選び直してください。";
const UNAVAILABLE_FORM_ERROR = "いまは確定できません。";
const ESTIMATE_LABEL = "クーポン値引き（見込み）";
const LOCKED_MESSAGE =
  "前回の確定の結果が分かるまで、クーポンは選び直せません。同じ内容でもう一度確定してください。";

function viewOf(cart: Cart, coupons: readonly CartCoupon[] | null) {
  return (
    <CheckoutConfirmView
      cart={cart}
      coupons={coupons}
      idempotencyKey={KEY}
      profile={PROFILE}
      reference={SUBTOTAL_REFERENCE}
    />
  );
}

function renderView(cart = ORDERABLE_CART, coupons: readonly CartCoupon[] | null = []) {
  return render(viewOf(cart, coupons));
}

/** 候補 1 枚の選択肢。値引き額は候補ごとに異なるため、名前に含まれる額で見分ける。 */
function couponRadio(coupon: CartCoupon) {
  return screen.getByRole("radio", {
    name: (name) => name.includes(formatMoney(-coupon.discountAmount)),
  });
}

function couponAt(index: number): CartCoupon {
  const coupon = CART_COUPONS[index];

  if (coupon === undefined) throw new Error("クーポンの候補が無い");

  return coupon;
}

function asideSubmit(): HTMLElement {
  const aside = screen.getByRole("complementary", { name: "お支払い金額" });

  return within(aside).getByRole("button", { name: "注文を確定する" });
}

/** 下端の帯の確定。脇の区画の外にある方を取る。 */
function bandSubmit(): HTMLElement {
  const aside = screen.getByRole("complementary", { name: "お支払い金額" });
  const found = screen
    .getAllByRole("button", { name: "注文を確定する" })
    .find((button) => !aside.contains(button));

  if (found === undefined) throw new Error("下端の帯に確定の操作が無い");

  return found;
}

beforeEach(() => {
  placeOrderAction.mockReset();
  placeOrderAction.mockResolvedValue(idleActionState());
});

describe("CheckoutConfirmView", () => {
  // ----- 確定できるカートのとき -----
  it("届け先と注文内容を並べる", () => {
    renderView();

    expect(screen.getByText("お届け先")).toBeVisible();
    expect(screen.getByText("ご注文内容（全 2 件）")).toBeVisible();
  });

  it("集計を脇と下端の 2 か所へ置く", () => {
    const { container } = renderView();

    expect(screen.getByRole("complementary", { name: "お支払い金額" }).tagName).toBe("ASIDE");
    expect(container.querySelector('[data-slot="action-bar"]')).toBeInTheDocument();
  });

  it("同じ名前の区画を 2 つ名乗らない", () => {
    renderView();

    expect(screen.getAllByRole("complementary", { name: "お支払い金額" })).toHaveLength(1);
  });

  it("片方の姿から送った失敗を、もう片方の姿も出す", async () => {
    placeOrderAction.mockResolvedValue(failedActionState({ formError: "在庫が変わりました。" }));

    renderView();
    const aside = screen.getByRole("complementary", { name: "お支払い金額" });

    await userEvent.click(within(aside).getByRole("button", { name: "注文を確定する" }));

    expect(await screen.findAllByText("在庫が変わりました。")).toHaveLength(2);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderView();

    expect((await axe(container)).violations).toEqual([]);
  });

  // ----- 使えるクーポンがあるとき -----
  it("クーポンの欄を本文に 1 か所だけ置き、使わないと候補の数だけ選択肢を並べる", () => {
    renderView(ORDERABLE_CART, CART_COUPONS);

    expect(screen.getAllByRole("radiogroup", { name: "クーポン" })).toHaveLength(1);
    expect(screen.getAllByRole("radio")).toHaveLength(CART_COUPONS.length + 1);
  });

  it("選んだクーポンを、脇の確定から送る", async () => {
    const coupon = couponAt(1);

    renderView(ORDERABLE_CART, CART_COUPONS);
    await userEvent.click(couponRadio(coupon));
    await userEvent.click(asideSubmit());

    expect(placeOrderAction.mock.calls.at(-1)?.[1].get(COUPON_ID_FIELD)).toBe(coupon.id);
  });

  it("選んだクーポンを、下端の帯の確定からも送る", async () => {
    const coupon = couponAt(1);

    renderView(ORDERABLE_CART, CART_COUPONS);
    await userEvent.click(couponRadio(coupon));
    await userEvent.click(bandSubmit());

    expect(placeOrderAction.mock.calls.at(-1)?.[1].get(COUPON_ID_FIELD)).toBe(coupon.id);
  });

  it("選んだクーポンの値引きの見込みを、脇と下端の帯の両方に出す", async () => {
    const coupon = couponAt(1);

    renderView(ORDERABLE_CART, CART_COUPONS);
    await userEvent.click(couponRadio(coupon));

    const aside = screen.getByRole("complementary", { name: "お支払い金額" });
    const rows = screen.getAllByText(ESTIMATE_LABEL).map((label) => label.closest("p"));

    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => aside.contains(row))).toHaveLength(1);
    for (const row of rows) {
      expect(row).toHaveTextContent(formatMoney(-coupon.discountAmount));
    }
  });

  it("クーポンが拒まれて候補が無くなったら欄を外し、理由は確定の隣に残す", async () => {
    placeOrderAction.mockResolvedValue(
      failedActionState({
        formError: REJECTED_FORM_ERROR,
        fieldErrors: { [COUPON_ID_FIELD]: [REJECTED_FIELD_ERROR] },
        kind: ErrorKind.VALIDATION,
      }),
    );

    const { rerender } = renderView(ORDERABLE_CART, CART_COUPONS);
    await userEvent.click(couponRadio(couponAt(0)));
    await userEvent.click(asideSubmit());
    await screen.findByText(REJECTED_FIELD_ERROR);
    rerender(viewOf(ORDERABLE_CART, []));

    expect(screen.queryByRole("radiogroup", { name: "クーポン" })).not.toBeInTheDocument();
    expect(screen.queryByText(REJECTED_FIELD_ERROR)).not.toBeInTheDocument();
    expect(screen.getAllByText(REJECTED_FORM_ERROR)).toHaveLength(2);
  });

  it("クーポンの欄を置いても a11y 自動検査に違反しない", async () => {
    const { container } = renderView(ORDERABLE_CART, CART_COUPONS);

    expect((await axe(container)).violations).toEqual([]);
  });

  // ----- 使えるクーポンが無いとき -----
  it("使えるクーポンが無ければ、クーポンの欄を置かない", () => {
    renderView(ORDERABLE_CART, []);

    expect(screen.queryByRole("heading", { name: "クーポン" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "クーポン" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("結果の定まらない失敗の後に候補が無くなったら、見出しと選び直せない理由の文だけを残す", async () => {
    placeOrderAction.mockResolvedValue(
      failedActionState({ formError: UNAVAILABLE_FORM_ERROR, kind: ErrorKind.UNAVAILABLE }),
    );

    const { rerender } = renderView(ORDERABLE_CART, CART_COUPONS);
    await userEvent.click(couponRadio(couponAt(0)));
    await userEvent.click(asideSubmit());
    await screen.findByText(LOCKED_MESSAGE);
    rerender(viewOf(ORDERABLE_CART, []));

    expect(screen.getByRole("heading", { name: "クーポン" })).toBeVisible();
    expect(screen.getByText(LOCKED_MESSAGE)).toBeVisible();
    expect(screen.queryByRole("radiogroup", { name: "クーポン" })).not.toBeInTheDocument();
  });

  it("結果の定まらない失敗の後に候補が無くなっても、選んでいたクーポンを次の確定に載せ、見込みの行は外す", async () => {
    const coupon = couponAt(0);
    placeOrderAction.mockResolvedValue(
      failedActionState({ formError: UNAVAILABLE_FORM_ERROR, kind: ErrorKind.UNAVAILABLE }),
    );

    const { rerender } = renderView(ORDERABLE_CART, CART_COUPONS);
    await userEvent.click(couponRadio(coupon));
    await userEvent.click(asideSubmit());
    await screen.findByText(LOCKED_MESSAGE);
    rerender(viewOf(ORDERABLE_CART, []));

    expect(screen.queryByText(ESTIMATE_LABEL)).not.toBeInTheDocument();

    await userEvent.click(asideSubmit());

    expect(placeOrderAction).toHaveBeenCalledTimes(2);
    expect(placeOrderAction.mock.calls.at(-1)?.[1].get(COUPON_ID_FIELD)).toBe(coupon.id);
  });

  // ----- 使えるクーポンを読めなかったとき -----
  it("クーポンを読めなければ、使わずに注文できることだけを告げ選択肢を出さない", () => {
    renderView(ORDERABLE_CART, null);

    expect(
      screen.getByText("クーポンを読み込めませんでした。クーポンを使わずに注文できます。"),
    ).toBeVisible();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  // ----- カートが空のとき -----
  it("カートが空なら、確かめる対象が無いことと商品を探す導線を出す", () => {
    renderView(EMPTY_CART);

    expect(screen.getByText(/確定できる注文がありません/)).toBeVisible();
    expect(screen.getByRole("link", { name: "商品を探す" })).toHaveAttribute("href", "/products");
  });

  it("カートが空なら確定の操作を出さない", () => {
    renderView(EMPTY_CART);

    expect(screen.queryByRole("button", { name: "注文を確定する" })).not.toBeInTheDocument();
  });

  it("カートが空なら、使えるクーポンがあってもクーポンの欄を置かない", () => {
    renderView(EMPTY_CART, CART_COUPONS);

    expect(screen.queryByRole("radiogroup", { name: "クーポン" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
});
