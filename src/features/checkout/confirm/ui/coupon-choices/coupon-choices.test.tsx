// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { PlaceOrderFormState } from "../../../form-state";

const { placeOrderAction } = vi.hoisted(() => ({
  placeOrderAction:
    vi.fn<(previous: PlaceOrderFormState, formData: FormData) => Promise<PlaceOrderFormState>>(),
}));

vi.mock("../../../actions", () => ({ placeOrderAction }));

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, idleActionState } from "@/model/action-state";
import { type CartCoupon, toCouponId } from "@/model/coupon/coupon";

import { COUPON_ID_FIELD } from "../../../form-fields";
import { PlaceOrderForm } from "../place-order-form/place-order-form";
import { PlaceOrderStateProvider } from "../place-order-state/place-order-state";
import { CouponChoice, CouponChoices, CouponLockedNotice } from "./coupon-choices";

const KEY = "0195f0c2-0000-7000-a000-000000000001";
const FIRST: CartCoupon = {
  id: toCouponId("0193a1c0-0001-7000-8000-000000000001"),
  discount: { kind: "flat", value: "5.00" },
  scopeKind: "all",
  discountAmount: 500,
  expiresAt: new Date("2027-06-30T14:59:59Z"),
};
const SECOND: CartCoupon = {
  ...FIRST,
  id: toCouponId("0193a1c0-0001-7000-8000-000000000002"),
};
const REJECTED_FIELD_ERROR = "このクーポンは使えなくなりました。選び直してください。";
const NO_SCRIPT_MESSAGE =
  "JavaScript が無効のときはクーポンを選べません。クーポンを使わない注文はできます。";
const LOCKED_MESSAGE =
  "前回の確定の結果が分かるまで、クーポンは選び直せません。同じ内容でもう一度確定してください。";

/** 選択は送信状態の器が持つ。拒まれた状態を作れるよう、確定の操作も並べる。 */
function renderChoices() {
  return render(
    <PlaceOrderStateProvider coupons={[FIRST, SECOND]} idempotencyKey={KEY}>
      <CouponChoices title="クーポン">
        <CouponChoice couponId={FIRST.id}>1 枚目のクーポン</CouponChoice>
        <CouponChoice couponId={SECOND.id}>2 枚目のクーポン</CouponChoice>
      </CouponChoices>
      <PlaceOrderForm orderable />
    </PlaceOrderStateProvider>,
  );
}

/** 候補が無いときの案内。結果の定まらない状態を作れるよう、確定の操作も並べる。 */
function renderNotice() {
  return render(
    <PlaceOrderStateProvider coupons={[]} idempotencyKey={KEY}>
      <CouponLockedNotice title="クーポン" />
      <PlaceOrderForm orderable />
    </PlaceOrderStateProvider>,
  );
}

async function leaveOutcomeOpenWithoutChoices() {
  placeOrderAction.mockResolvedValue(
    failedActionState({
      formError: "いまは確定できません。",
      kind: ErrorKind.UNAVAILABLE,
    }),
  );

  await userEvent.click(screen.getByRole("button", { name: "注文を確定する" }));

  return screen.findByText(LOCKED_MESSAGE);
}

function radio(name: string) {
  return screen.getByRole("radio", { name });
}

async function rejectSelected() {
  placeOrderAction.mockResolvedValue(
    failedActionState({
      formError: "選んだクーポンを使えなかったため、注文は確定していません。",
      fieldErrors: { [COUPON_ID_FIELD]: [REJECTED_FIELD_ERROR] },
      kind: ErrorKind.VALIDATION,
    }),
  );

  await userEvent.click(radio("1 枚目のクーポン"));
  await userEvent.click(screen.getByRole("button", { name: "注文を確定する" }));

  return screen.findByText(REJECTED_FIELD_ERROR);
}

async function leaveOutcomeOpen() {
  placeOrderAction.mockResolvedValue(
    failedActionState({
      formError: "いまは確定できません。",
      kind: ErrorKind.UNAVAILABLE,
    }),
  );

  await userEvent.click(radio("1 枚目のクーポン"));
  await userEvent.click(screen.getByRole("button", { name: "注文を確定する" }));

  return screen.findByText(LOCKED_MESSAGE);
}

beforeEach(() => {
  placeOrderAction.mockReset();
  placeOrderAction.mockResolvedValue(idleActionState());
});

describe("CouponChoices", () => {
  // ----- 拒まれていないとき -----
  it("見出しを欄の名前にした選択の群として出す", () => {
    renderChoices();

    expect(screen.getByRole("radiogroup", { name: "クーポン" })).toBeVisible();
  });

  it("使わないを先頭に置き、渡された選択肢をその後に並べる", () => {
    renderChoices();

    expect(screen.getAllByRole("radio")).toEqual([
      radio("使わない"),
      radio("1 枚目のクーポン"),
      radio("2 枚目のクーポン"),
    ]);
  });

  it("最初はどの選択肢も選んでいない", () => {
    renderChoices();

    for (const choice of screen.getAllByRole("radio")) {
      expect(choice).not.toBeChecked();
    }
  });

  it("クーポンを選んだ後に使わないを選ぶと、使わないだけが選ばれる", async () => {
    renderChoices();
    await userEvent.click(radio("1 枚目のクーポン"));
    await userEvent.click(radio("使わない"));

    expect(radio("使わない")).toBeChecked();
    expect(radio("1 枚目のクーポン")).not.toBeChecked();
    expect(radio("2 枚目のクーポン")).not.toBeChecked();
  });

  it("使わないを選ぶと、確定にクーポンを載せない", async () => {
    renderChoices();
    await userEvent.click(radio("1 枚目のクーポン"));
    await userEvent.click(radio("使わない"));
    await userEvent.click(screen.getByRole("button", { name: "注文を確定する" }));

    expect(placeOrderAction.mock.calls.at(-1)?.[1].get(COUPON_ID_FIELD)).toBeNull();
  });

  it("拒まれていなければ、欄を不正とも示さず説明も結ばない", () => {
    renderChoices();

    const group = screen.getByRole("radiogroup", { name: "クーポン" });

    expect(group).not.toHaveAttribute("aria-invalid");
    expect(group).not.toHaveAttribute("aria-describedby");
  });

  it("結果の定まらない送信が無ければ、欄を操作できないとは示さず理由の文も出さない", () => {
    renderChoices();

    expect(screen.getByRole("radiogroup", { name: "クーポン" })).not.toHaveAttribute(
      "aria-disabled",
    );
    expect(screen.queryByText(LOCKED_MESSAGE)).not.toBeInTheDocument();
  });

  it("読み込みが済んだ後は、欄を操作できる", () => {
    renderChoices();

    expect(screen.getByRole("radiogroup", { name: "クーポン" })).toBeEnabled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderChoices();

    expect((await axe(container)).violations).toEqual([]);
  });

  // ----- 選んだクーポンが拒まれたとき -----
  it("拒まれたら欄を不正と示し、理由を欄の説明として結ぶ", async () => {
    renderChoices();

    const message = await rejectSelected();
    const group = screen.getByRole("radiogroup", { name: "クーポン" });

    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveAttribute("aria-describedby", message.id);
  });

  it("拒まれた後に選び直すと、理由と不正の表示を外す", async () => {
    renderChoices();

    await rejectSelected();
    await userEvent.click(radio("2 枚目のクーポン"));

    const group = screen.getByRole("radiogroup", { name: "クーポン" });

    expect(screen.queryByText(REJECTED_FIELD_ERROR)).not.toBeInTheDocument();
    expect(group).not.toHaveAttribute("aria-invalid");
  });

  it("拒まれた状態でも a11y 自動検査に違反しない", async () => {
    const { container } = renderChoices();

    await rejectSelected();

    expect((await axe(container)).violations).toEqual([]);
  });

  it("拒まれても、欄を操作できないとは示さない", async () => {
    renderChoices();

    await rejectSelected();

    expect(screen.getByRole("radiogroup", { name: "クーポン" })).not.toHaveAttribute(
      "aria-disabled",
    );
  });

  // ----- 確定の結果が定まらないとき -----
  it("結果が定まらないあいだは、欄を操作できないと示し、その理由を欄の説明として結ぶ", async () => {
    renderChoices();

    const message = await leaveOutcomeOpen();
    const group = screen.getByRole("radiogroup", { name: "クーポン" });

    expect(group).toHaveAttribute("aria-disabled", "true");
    expect(group).toHaveAttribute("aria-describedby", message.id);
  });

  it("結果が定まらないあいだは、どの選択肢も操作できないと示す", async () => {
    renderChoices();

    await leaveOutcomeOpen();

    for (const choice of screen.getAllByRole("radio")) {
      expect(choice).toHaveAttribute("aria-disabled", "true");
    }
  });

  it("結果が定まらないあいだに別のクーポンを押しても、選んでいたものから動かない", async () => {
    renderChoices();

    await leaveOutcomeOpen();
    await userEvent.click(radio("2 枚目のクーポン"));

    expect(radio("1 枚目のクーポン")).toBeChecked();
    expect(radio("2 枚目のクーポン")).not.toBeChecked();
  });

  it("結果が定まらない状態でも a11y 自動検査に違反しない", async () => {
    const { container } = renderChoices();

    await leaveOutcomeOpen();

    expect((await axe(container)).violations).toEqual([]);
  });

  // ----- server で描くとき -----
  it("server で描いた時点では欄を操作できず、JavaScript が無効のときの案内を出す", () => {
    const markup = renderToStaticMarkup(
      <PlaceOrderStateProvider coupons={[FIRST, SECOND]} idempotencyKey={KEY}>
        <CouponChoices title="クーポン">
          <CouponChoice couponId={FIRST.id}>1 枚目のクーポン</CouponChoice>
          <CouponChoice couponId={SECOND.id}>2 枚目のクーポン</CouponChoice>
        </CouponChoices>
      </PlaceOrderStateProvider>,
    );

    expect(markup).toMatch(/<fieldset[^>]*\sdisabled=""/);
    expect(markup).toContain(NO_SCRIPT_MESSAGE);
  });
});

describe("CouponChoice", () => {
  // ----- CouponChoices の中に置いたとき -----
  it("クーポンを選ぶと、そのクーポンだけが選ばれる", async () => {
    renderChoices();
    await userEvent.click(radio("2 枚目のクーポン"));

    expect(radio("2 枚目のクーポン")).toBeChecked();
    expect(radio("1 枚目のクーポン")).not.toBeChecked();
    expect(radio("使わない")).not.toBeChecked();
  });

  it("クーポンを選ぶと、確定にそのクーポンを載せる", async () => {
    renderChoices();
    await userEvent.click(radio("2 枚目のクーポン"));
    await userEvent.click(screen.getByRole("button", { name: "注文を確定する" }));

    expect(placeOrderAction.mock.calls.at(-1)?.[1].get(COUPON_ID_FIELD)).toBe(SECOND.id);
  });

  // ----- CouponChoices の外に置いたとき -----
  it("CouponChoices の外に置いたら、その場で落とす", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() =>
      render(
        <PlaceOrderStateProvider coupons={[FIRST]} idempotencyKey={KEY}>
          <CouponChoice couponId={FIRST.id}>1 枚目のクーポン</CouponChoice>
        </PlaceOrderStateProvider>,
      ),
    ).toThrow("CouponChoices の外にクーポンの選択肢を置こうとしました");

    vi.restoreAllMocks();
  });
});

describe("CouponLockedNotice", () => {
  // ----- 結果の定まらない送信が無いとき -----
  it("結果の定まらない送信が無ければ、何も出さない", () => {
    renderNotice();

    expect(screen.queryByRole("heading", { name: "クーポン" })).not.toBeInTheDocument();
    expect(screen.queryByText(LOCKED_MESSAGE)).not.toBeInTheDocument();
  });

  // ----- 確定の結果が定まらないとき -----
  it("結果が定まらないあいだは、見出しと選び直せない理由の文を出す", async () => {
    renderNotice();

    await leaveOutcomeOpenWithoutChoices();

    expect(screen.getByRole("heading", { name: "クーポン" })).toBeVisible();
    expect(screen.getByText(LOCKED_MESSAGE)).toBeVisible();
  });

  it("結果が定まらない状態でも a11y 自動検査に違反しない", async () => {
    const { container } = renderNotice();

    await leaveOutcomeOpenWithoutChoices();

    expect((await axe(container)).violations).toEqual([]);
  });
});
