// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { placeOrderAction } = vi.hoisted(() => ({ placeOrderAction: vi.fn() }));

vi.mock("../../../actions", () => ({ placeOrderAction }));

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, idleActionState } from "@/model/action-state";
import { type CartCoupon, COUPON_SCOPE_NAME } from "@/model/coupon/coupon";
import { formatCouponDiscount, formatCouponDiscountCap } from "@/model/coupon/discount-label";
import { formatDateTime } from "@/model/datetime";
import { formatMoney } from "@/model/money";

import { CART_COUPONS } from "../../../checkout.fixture";
import { PlaceOrderForm } from "../place-order-form/place-order-form";
import { PlaceOrderStateProvider } from "../place-order-state/place-order-state";
import { CouponField } from "./coupon-field";

const KEY = "0195f0c2-0000-7000-a000-000000000001";
const UNAVAILABLE_MESSAGE = "クーポンを読み込めませんでした。クーポンを使わずに注文できます。";
const LOCKED_MESSAGE =
  "前回の確定の結果が分かるまで、クーポンは選び直せません。同じ内容でもう一度確定してください。";
/** 先頭の候補の額面（10% 引き・上限 $10.00）を、確定できるカートの小計へ当て直した額。 */
const FACE_VALUE_DISCOUNT = 1_000;

function renderField(coupons: readonly CartCoupon[] | null = CART_COUPONS) {
  return render(
    <PlaceOrderStateProvider coupons={coupons} idempotencyKey={KEY}>
      <CouponField coupons={coupons} />
    </PlaceOrderStateProvider>,
  );
}

/** 結果の定まらない状態を作れるよう、確定の操作も並べる。 */
function renderFieldWithForm(coupons: readonly CartCoupon[] | null) {
  return render(
    <PlaceOrderStateProvider coupons={coupons} idempotencyKey={KEY}>
      <CouponField coupons={coupons} />
      <PlaceOrderForm orderable />
    </PlaceOrderStateProvider>,
  );
}

function couponAt(index: number): CartCoupon {
  const coupon = CART_COUPONS[index];

  if (coupon === undefined) throw new Error("クーポンの候補が無い");

  return coupon;
}

/** 候補 1 枚の選択肢。値引き額は候補ごとに異なるため、名前に含まれる額で見分ける。 */
function couponRadio(coupon: CartCoupon) {
  return screen.getByRole("radio", {
    name: (name) => name.includes(formatMoney(-coupon.discountAmount)),
  });
}

beforeEach(() => {
  placeOrderAction.mockReset();
  placeOrderAction.mockResolvedValue(idleActionState());
});

describe("CouponField", () => {
  // ----- 候補があるとき -----
  it("クーポンの欄として、候補 1 枚ごとに選択肢を並べる", () => {
    renderField();

    expect(screen.getByRole("radiogroup", { name: "クーポン" })).toBeVisible();
    expect(screen.getAllByRole("radio")).toHaveLength(CART_COUPONS.length + 1);
    for (const coupon of CART_COUPONS) {
      expect(couponRadio(coupon)).toBeVisible();
    }
  });

  it("値引き額は受け取った額をそのまま出し、額面から計算し直さない", () => {
    const coupon = couponAt(0);

    renderField();

    expect(screen.getByText(formatMoney(-coupon.discountAmount))).toBeVisible();
    expect(screen.queryByText(formatMoney(-FACE_VALUE_DISCOUNT))).not.toBeInTheDocument();
  });

  it("上限のある定率は、額面に上限を添える", () => {
    const coupon = couponAt(0);

    renderField();

    expect(
      screen.getByText(
        `${formatCouponDiscount(coupon.discount)}（${formatCouponDiscountCap(coupon.discount)}）・${COUPON_SCOPE_NAME[coupon.scopeKind]}`,
      ),
    ).toBeVisible();
  });

  it("上限の無い定率は、額面だけを出す", () => {
    const coupon = couponAt(2);

    renderField();

    expect(
      screen.getByText(
        `${formatCouponDiscount(coupon.discount)}・${COUPON_SCOPE_NAME[coupon.scopeKind]}`,
      ),
    ).toBeVisible();
  });

  it("定額は、額面だけを出す", () => {
    const coupon = couponAt(1);

    renderField();

    expect(
      screen.getByText(
        `${formatCouponDiscount(coupon.discount)}・${COUPON_SCOPE_NAME[coupon.scopeKind]}`,
      ),
    ).toBeVisible();
  });

  it("値引きの範囲を、種別の呼び名で出す", () => {
    renderField();

    for (const coupon of CART_COUPONS) {
      expect(
        screen.getByText(new RegExp(`・${COUPON_SCOPE_NAME[coupon.scopeKind]}$`)),
      ).toBeVisible();
    }
  });

  it("有効期限を日時で出す", () => {
    const coupon = couponAt(0);

    renderField();

    expect(
      screen.getByText(`有効期限 ${formatDateTime(new Date(coupon.expiresAt))}`),
    ).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderField();

    expect((await axe(container)).violations).toEqual([]);
  });

  // ----- 候補を読めなかったとき -----
  it("候補を読めなければ、使わずに注文できることだけを告げ選択肢を出さない", () => {
    renderField(null);

    expect(screen.getByText(UNAVAILABLE_MESSAGE)).toBeVisible();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "クーポン" })).not.toBeInTheDocument();
  });

  it("候補を読めなくても a11y 自動検査に違反しない", async () => {
    const { container } = renderField(null);

    expect((await axe(container)).violations).toEqual([]);
  });

  // ----- 使えるクーポンが無いとき -----
  it("使えるクーポンが無く結果の定まらない送信も無ければ、何も出さない", () => {
    renderField([]);

    expect(screen.queryByRole("heading", { name: "クーポン" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "クーポン" })).not.toBeInTheDocument();
    expect(screen.queryByText(LOCKED_MESSAGE)).not.toBeInTheDocument();
  });

  it("使えるクーポンが無くても結果が定まらないあいだは、見出しと選び直せない理由の文だけを出す", async () => {
    placeOrderAction.mockResolvedValue(
      failedActionState({ formError: "いまは確定できません。", kind: ErrorKind.UNAVAILABLE }),
    );

    renderFieldWithForm([]);
    await userEvent.click(screen.getByRole("button", { name: "注文を確定する" }));

    expect(await screen.findByText(LOCKED_MESSAGE)).toBeVisible();
    expect(screen.getByRole("heading", { name: "クーポン" })).toBeVisible();
    expect(screen.queryByRole("radiogroup", { name: "クーポン" })).not.toBeInTheDocument();
  });
});
