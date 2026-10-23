// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { placeOrderAction } = vi.hoisted(() => ({ placeOrderAction: vi.fn() }));

vi.mock("../../../actions", () => ({ placeOrderAction }));

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, succeededActionState } from "@/model/action-state";
import { type CartCoupon, type CouponId, toCouponId } from "@/model/coupon/coupon";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";

import { COUPON_ID_FIELD } from "../../../form-fields";

import { PlaceOrderStateProvider, usePlaceOrderState } from "./place-order-state";

const KEY = "0195f0c2-0000-7000-a000-000000000001";
const OTHER_KEY = "0195f0c2-0000-7000-a000-000000000002";
const COUPON: CartCoupon = {
  id: toCouponId("0193a1c0-0001-7000-8000-000000000001"),
  discount: { kind: "flat", value: "5.00" },
  scopeKind: "all",
  discountAmount: 500,
  expiresAt: "2027-06-30T14:59:59Z",
};
const OTHER_COUPON: CartCoupon = {
  ...COUPON,
  id: toCouponId("0193a1c0-0001-7000-8000-000000000002"),
  discountAmount: 300,
};
const REJECTED_FIELD_ERROR = "このクーポンは使えなくなりました。選び直してください。";
const REJECTED_FORM_ERROR = "選んだクーポンを使えなかったため、注文は確定していません。";
const UNAVAILABLE_FORM_ERROR = "いまは確定できません。";
const CONFLICT_FORM_ERROR = "在庫が変わりました。";
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** 器から読んだものを、そのまま見える形に出す姿。名前で 2 つを見分ける。 */
function Consumer({ name }: { name: string }) {
  const { formAction, formError, isPending, idempotencyKey } = usePlaceOrderState();

  return (
    <form action={formAction}>
      <input name={IDEMPOTENCY_KEY_FIELD} type="hidden" value={idempotencyKey} />
      <p>{`${name}:${isPending ? "待っている" : "待っていない"}`}</p>
      <p>{`${name}:${formError ?? "理由なし"}`}</p>
      <button type="submit">{`${name} から送る`}</button>
    </form>
  );
}

/** 器から読んだクーポンの状態を、そのまま見える形に出す姿。 */
function CouponConsumer({ name }: { name: string }) {
  const { coupon, couponId, couponSelection, couponErrors, couponLocked, outcomeOpen, formError } =
    usePlaceOrderState();
  const selection = couponSelection === undefined ? "未選択" : (couponSelection ?? "使わない");
  const discount = coupon === null ? "なし" : `${coupon.id} ${coupon.discountAmount}`;

  return (
    <>
      <p>{`${name}:選択 ${selection}`}</p>
      <p>{`${name}:載せる ${couponId ?? "なし"}`}</p>
      <p>{`${name}:値引き ${discount}`}</p>
      <p>{`${name}:文言 ${couponErrors?.join(" ") ?? "なし"}`}</p>
      <p>{`${name}:選び直し ${couponLocked ? "できない" : "できる"}`}</p>
      <p>{`${name}:結果 ${outcomeOpen ? "未定" : "未定ではない"}`}</p>
      <p>{`${name}:全体の文言 ${formError ?? "なし"}`}</p>
    </>
  );
}

/** クーポンを選び直す引き手。 */
function SelectCouponButton({ couponId, label }: { couponId: CouponId | null; label: string }) {
  const { selectCoupon } = usePlaceOrderState();
  const select = useCallback(() => selectCoupon(couponId), [selectCoupon, couponId]);

  return (
    <button type="button" onClick={select}>
      {label}
    </button>
  );
}

function unavailable(formError = UNAVAILABLE_FORM_ERROR) {
  return failedActionState({ formError, kind: ErrorKind.UNAVAILABLE });
}

function rejectedCoupon() {
  return failedActionState({
    formError: REJECTED_FORM_ERROR,
    fieldErrors: { [COUPON_ID_FIELD]: [REJECTED_FIELD_ERROR] },
    kind: ErrorKind.VALIDATION,
  });
}

/** 送る操作、選び直す操作、クーポンの状態を 1 つの器に並べる。 */
function couponFlow(coupons: readonly CartCoupon[] | null) {
  return (
    <PlaceOrderStateProvider coupons={coupons} idempotencyKey={KEY}>
      <Consumer name="脇" />
      <SelectCouponButton couponId={COUPON.id} label="1 枚目を選ぶ" />
      <SelectCouponButton couponId={OTHER_COUPON.id} label="2 枚目を選ぶ" />
      <CouponConsumer name="帯" />
    </PlaceOrderStateProvider>
  );
}

function renderCouponFlow(coupons: readonly CartCoupon[] | null = [COUPON, OTHER_COUPON]) {
  return render(couponFlow(coupons));
}

/** 器が次の送信に載せる鍵の欄を引く。 */
function keyInput(container: HTMLElement) {
  return container.querySelector(`input[name="${IDEMPOTENCY_KEY_FIELD}"]`);
}

/** 確定の送信のうち、0 始まりで call 番目に載った鍵を読む。 */
function sentKey(call: number) {
  return placeOrderAction.mock.calls[call]?.[1].get(IDEMPOTENCY_KEY_FIELD);
}

async function click(name: string) {
  await userEvent.click(screen.getByRole("button", { name }));
}

beforeEach(() => {
  placeOrderAction.mockReset();
  placeOrderAction.mockResolvedValue(succeededActionState(undefined));
});

let settlePending: (() => void) | undefined;

/** 応答を返さないまま待たせる送信。後片付けで必ず返す。 */
function pendingAction() {
  const { promise, resolve } = Promise.withResolvers<ReturnType<typeof succeededActionState>>();
  settlePending = () => resolve(succeededActionState(undefined));

  return promise;
}

afterEach(async () => {
  await act(async () => settlePending?.());
  settlePending = undefined;
});

describe("PlaceOrderStateProvider", () => {
  it("受け取った鍵を、器の中のどの姿へも同じ値で配る", () => {
    const { container } = render(
      <PlaceOrderStateProvider coupons={[]} idempotencyKey={KEY}>
        <Consumer name="脇" />
        <Consumer name="帯" />
      </PlaceOrderStateProvider>,
    );

    const keys = [...container.querySelectorAll(`input[name="${IDEMPOTENCY_KEY_FIELD}"]`)].map(
      (input) => input.getAttribute("value"),
    );

    expect(keys).toEqual([KEY, KEY]);
  });

  it("組み直された画面から別の鍵が届いても、配る鍵は変えない", () => {
    const { container, rerender } = render(
      <PlaceOrderStateProvider coupons={[]} idempotencyKey={KEY}>
        <Consumer name="脇" />
      </PlaceOrderStateProvider>,
    );

    rerender(
      <PlaceOrderStateProvider coupons={[]} idempotencyKey={OTHER_KEY}>
        <Consumer name="脇" />
      </PlaceOrderStateProvider>,
    );

    expect(container.querySelector(`input[name="${IDEMPOTENCY_KEY_FIELD}"]`)).toHaveValue(KEY);
  });

  it("片方の姿から送った失敗を、もう片方の姿も読む", async () => {
    placeOrderAction.mockResolvedValue(failedActionState({ formError: "在庫が変わりました。" }));

    render(
      <PlaceOrderStateProvider coupons={[]} idempotencyKey={KEY}>
        <Consumer name="脇" />
        <Consumer name="帯" />
      </PlaceOrderStateProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "帯 から送る" }));

    expect(await screen.findByText("脇:在庫が変わりました。")).toBeVisible();
    expect(screen.getByText("帯:在庫が変わりました。")).toBeVisible();
  });

  it("片方の姿から送っているあいだ、もう片方の姿も待っている", async () => {
    placeOrderAction.mockReturnValue(pendingAction());

    render(
      <PlaceOrderStateProvider coupons={[]} idempotencyKey={KEY}>
        <Consumer name="脇" />
        <Consumer name="帯" />
      </PlaceOrderStateProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "帯 から送る" }));

    expect(await screen.findByText("脇:待っている")).toBeVisible();
    expect(screen.getByText("帯:待っている")).toBeVisible();
  });

  it("片方の姿で選んだクーポンを、もう片方の姿も読む", async () => {
    render(
      <PlaceOrderStateProvider coupons={[COUPON]} idempotencyKey={KEY}>
        <SelectCouponButton couponId={COUPON.id} label="脇で選ぶ" />
        <CouponConsumer name="帯" />
      </PlaceOrderStateProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "脇で選ぶ" }));

    expect(screen.getByText(`帯:載せる ${COUPON.id}`)).toBeVisible();
  });

  it("a11y 自動検査に違反しない。包んだだけで支援技術への見え方を変えない", async () => {
    const { container } = render(
      <PlaceOrderStateProvider coupons={[]} idempotencyKey={KEY}>
        <Consumer name="脇" />
      </PlaceOrderStateProvider>,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

describe("usePlaceOrderState", () => {
  // ----- まだ送っていないとき -----
  it("まだ送っていないあいだは、待っておらず理由も持たない", () => {
    render(
      <PlaceOrderStateProvider coupons={[]} idempotencyKey={KEY}>
        <Consumer name="脇" />
      </PlaceOrderStateProvider>,
    );

    expect(screen.getByText("脇:待っていない")).toBeVisible();
    expect(screen.getByText("脇:理由なし")).toBeVisible();
  });

  it("まだ送っていないあいだは、クーポンを選び直せてフォーム全体の文言も持たない", () => {
    renderCouponFlow();

    expect(screen.getByText("帯:選び直し できる")).toBeVisible();
    expect(screen.getByText("帯:結果 未定ではない")).toBeVisible();
    expect(screen.getByText("帯:全体の文言 なし")).toBeVisible();
  });

  // ----- まだ選んでいないとき -----
  it("まだ選んでいないあいだは、クーポンを載せず選択も持たない", () => {
    render(
      <PlaceOrderStateProvider coupons={[COUPON]} idempotencyKey={KEY}>
        <CouponConsumer name="脇" />
      </PlaceOrderStateProvider>,
    );

    expect(screen.getByText("脇:選択 未選択")).toBeVisible();
    expect(screen.getByText("脇:載せる なし")).toBeVisible();
    expect(screen.getByText("脇:値引き なし")).toBeVisible();
  });

  // ----- クーポンを選んだとき -----
  it("選んだクーポンを、候補に並ぶ値引き額ごと読む", async () => {
    render(
      <PlaceOrderStateProvider coupons={[COUPON, OTHER_COUPON]} idempotencyKey={KEY}>
        <SelectCouponButton couponId={OTHER_COUPON.id} label="クーポンを選ぶ" />
        <CouponConsumer name="脇" />
      </PlaceOrderStateProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "クーポンを選ぶ" }));

    expect(screen.getByText(`脇:載せる ${OTHER_COUPON.id}`)).toBeVisible();
    expect(screen.getByText(`脇:値引き ${OTHER_COUPON.id} 300`)).toBeVisible();
  });

  it("使わないを選ぶと、使わない選択を持ちクーポンを載せない", async () => {
    render(
      <PlaceOrderStateProvider coupons={[COUPON]} idempotencyKey={KEY}>
        <SelectCouponButton couponId={COUPON.id} label="クーポンを選ぶ" />
        <SelectCouponButton couponId={null} label="使わないを選ぶ" />
        <CouponConsumer name="脇" />
      </PlaceOrderStateProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "クーポンを選ぶ" }));
    await userEvent.click(screen.getByRole("button", { name: "使わないを選ぶ" }));

    expect(screen.getByText("脇:選択 使わない")).toBeVisible();
    expect(screen.getByText("脇:載せる なし")).toBeVisible();
    expect(screen.getByText("脇:値引き なし")).toBeVisible();
  });

  it("選んだクーポンが候補から消えたら、クーポンを載せず値引きも読まない", async () => {
    const { rerender } = render(
      <PlaceOrderStateProvider coupons={[COUPON, OTHER_COUPON]} idempotencyKey={KEY}>
        <SelectCouponButton couponId={COUPON.id} label="クーポンを選ぶ" />
        <CouponConsumer name="脇" />
      </PlaceOrderStateProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "クーポンを選ぶ" }));
    rerender(
      <PlaceOrderStateProvider coupons={[OTHER_COUPON]} idempotencyKey={KEY}>
        <SelectCouponButton couponId={COUPON.id} label="クーポンを選ぶ" />
        <CouponConsumer name="脇" />
      </PlaceOrderStateProvider>,
    );

    expect(screen.getByText("脇:載せる なし")).toBeVisible();
    expect(screen.getByText("脇:値引き なし")).toBeVisible();
  });

  it("候補を読めなかったときは、選んでもクーポンを載せず値引きも読まない", async () => {
    render(
      <PlaceOrderStateProvider coupons={null} idempotencyKey={KEY}>
        <SelectCouponButton couponId={COUPON.id} label="クーポンを選ぶ" />
        <CouponConsumer name="脇" />
      </PlaceOrderStateProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "クーポンを選ぶ" }));

    expect(screen.getByText("脇:選択 未選択")).toBeVisible();
    expect(screen.getByText("脇:載せる なし")).toBeVisible();
    expect(screen.getByText("脇:値引き なし")).toBeVisible();
  });

  it("選んだクーポンが候補から消えたら、選択も手放す", async () => {
    const { rerender } = renderCouponFlow();

    await click("1 枚目を選ぶ");
    rerender(
      <PlaceOrderStateProvider coupons={[OTHER_COUPON]} idempotencyKey={KEY}>
        <CouponConsumer name="帯" />
      </PlaceOrderStateProvider>,
    );

    expect(screen.getByText("帯:選択 未選択")).toBeVisible();
  });

  it("消えたクーポンが候補に戻っても、選んだ状態には戻さない", async () => {
    const { rerender } = renderCouponFlow();

    await click("1 枚目を選ぶ");
    rerender(
      <PlaceOrderStateProvider coupons={[OTHER_COUPON]} idempotencyKey={KEY}>
        <CouponConsumer name="帯" />
      </PlaceOrderStateProvider>,
    );
    rerender(
      <PlaceOrderStateProvider coupons={[COUPON, OTHER_COUPON]} idempotencyKey={KEY}>
        <CouponConsumer name="帯" />
      </PlaceOrderStateProvider>,
    );

    expect(screen.getByText("帯:選択 未選択")).toBeVisible();
    expect(screen.getByText("帯:載せる なし")).toBeVisible();
  });

  it("クーポンを選び直しても、配る鍵は変えない", async () => {
    const { container } = render(
      <PlaceOrderStateProvider coupons={[COUPON]} idempotencyKey={KEY}>
        <SelectCouponButton couponId={COUPON.id} label="クーポンを選ぶ" />
        <Consumer name="脇" />
      </PlaceOrderStateProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "クーポンを選ぶ" }));

    expect(container.querySelector(`input[name="${IDEMPOTENCY_KEY_FIELD}"]`)).toHaveValue(KEY);
  });

  // ----- 確定が拒まれたとき -----
  it("確定がクーポンを名指しして拒んだら、その文言を読む", async () => {
    placeOrderAction.mockResolvedValue(rejectedCoupon());

    render(
      <PlaceOrderStateProvider coupons={[COUPON]} idempotencyKey={KEY}>
        <Consumer name="脇" />
        <CouponConsumer name="脇" />
      </PlaceOrderStateProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "脇 から送る" }));

    expect(await screen.findByText(`脇:文言 ${REJECTED_FIELD_ERROR}`)).toBeVisible();
  });

  it("確定がクーポンを名指しして拒んだら、次の送信を別の鍵で送る", async () => {
    placeOrderAction.mockResolvedValue(rejectedCoupon());

    const { container } = render(
      <PlaceOrderStateProvider coupons={[COUPON]} idempotencyKey={KEY}>
        <Consumer name="脇" />
        <CouponConsumer name="脇" />
      </PlaceOrderStateProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "脇 から送る" }));
    await screen.findByText(`脇:文言 ${REJECTED_FIELD_ERROR}`);

    expect(keyInput(container)).not.toHaveValue(KEY);
    expect(keyInput(container)).toHaveAttribute("value", expect.stringMatching(UUID_V7));
  });

  it("確定が衝突で拒まれたら、次の送信を別の鍵で送る", async () => {
    placeOrderAction.mockResolvedValue(
      failedActionState({ formError: "在庫が変わりました。", kind: ErrorKind.CONFLICT }),
    );

    const { container } = render(
      <PlaceOrderStateProvider coupons={[COUPON]} idempotencyKey={KEY}>
        <Consumer name="脇" />
      </PlaceOrderStateProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "脇 から送る" }));
    await screen.findByText("脇:在庫が変わりました。");

    expect(keyInput(container)).not.toHaveValue(KEY);
    expect(keyInput(container)).toHaveAttribute("value", expect.stringMatching(UUID_V7));
  });

  it("確定先が応じられなかった失敗では、送り直しても同じ鍵のまま", async () => {
    placeOrderAction.mockResolvedValue(
      failedActionState({ formError: "いまは確定できません。", kind: ErrorKind.UNAVAILABLE }),
    );

    const { container } = render(
      <PlaceOrderStateProvider coupons={[COUPON]} idempotencyKey={KEY}>
        <Consumer name="脇" />
      </PlaceOrderStateProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "脇 から送る" }));
    await screen.findByText("脇:いまは確定できません。");

    expect(container.querySelector(`input[name="${IDEMPOTENCY_KEY_FIELD}"]`)).toHaveValue(KEY);
  });

  it("分類を持たない失敗では、送り直しても同じ鍵のまま", async () => {
    placeOrderAction.mockResolvedValue(failedActionState({ formError: "在庫が変わりました。" }));

    const { container } = render(
      <PlaceOrderStateProvider coupons={[COUPON]} idempotencyKey={KEY}>
        <Consumer name="脇" />
      </PlaceOrderStateProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "脇 から送る" }));
    await screen.findByText("脇:在庫が変わりました。");

    expect(container.querySelector(`input[name="${IDEMPOTENCY_KEY_FIELD}"]`)).toHaveValue(KEY);
  });

  it("拒まれた後にクーポンを選び直すと、クーポンの文言を消す", async () => {
    placeOrderAction.mockResolvedValue(rejectedCoupon());

    render(
      <PlaceOrderStateProvider coupons={[COUPON, OTHER_COUPON]} idempotencyKey={KEY}>
        <Consumer name="脇" />
        <SelectCouponButton couponId={OTHER_COUPON.id} label="選び直す" />
        <CouponConsumer name="脇" />
      </PlaceOrderStateProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "脇 から送る" }));
    await screen.findByText(`脇:文言 ${REJECTED_FIELD_ERROR}`);
    await userEvent.click(screen.getByRole("button", { name: "選び直す" }));

    expect(screen.getByText("脇:文言 なし")).toBeVisible();
  });

  it("選び直した後に送って再び拒まれたら、クーポンの文言をまた読む", async () => {
    placeOrderAction.mockImplementation(async () => rejectedCoupon());

    render(
      <PlaceOrderStateProvider coupons={[COUPON, OTHER_COUPON]} idempotencyKey={KEY}>
        <Consumer name="脇" />
        <SelectCouponButton couponId={OTHER_COUPON.id} label="選び直す" />
        <CouponConsumer name="脇" />
      </PlaceOrderStateProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "脇 から送る" }));
    await screen.findByText(`脇:文言 ${REJECTED_FIELD_ERROR}`);
    await userEvent.click(screen.getByRole("button", { name: "選び直す" }));
    await screen.findByText("脇:文言 なし");
    await userEvent.click(screen.getByRole("button", { name: "脇 から送る" }));

    expect(await screen.findByText(`脇:文言 ${REJECTED_FIELD_ERROR}`)).toBeVisible();
  });

  it("確定がクーポンを名指しして拒んだ後は、クーポンを選び直せる", async () => {
    placeOrderAction.mockResolvedValue(rejectedCoupon());

    renderCouponFlow();
    await click("1 枚目を選ぶ");
    await click("脇 から送る");
    await screen.findByText(`帯:文言 ${REJECTED_FIELD_ERROR}`);
    await click("2 枚目を選ぶ");

    expect(screen.getByText("帯:選び直し できる")).toBeVisible();
    expect(screen.getByText(`帯:選択 ${OTHER_COUPON.id}`)).toBeVisible();
  });

  it("確定が拒まれたら、フォーム全体の文言を読む", async () => {
    placeOrderAction.mockResolvedValue(rejectedCoupon());

    renderCouponFlow();
    await click("脇 から送る");

    expect(await screen.findByText(`帯:全体の文言 ${REJECTED_FORM_ERROR}`)).toBeVisible();
  });

  it("拒まれた後にクーポンを選び直すと、フォーム全体の文言を消す", async () => {
    placeOrderAction.mockResolvedValue(rejectedCoupon());

    renderCouponFlow();
    await click("脇 から送る");
    await screen.findByText(`帯:全体の文言 ${REJECTED_FORM_ERROR}`);
    await click("2 枚目を選ぶ");

    expect(screen.getByText("帯:全体の文言 なし")).toBeVisible();
  });

  it("選び直した後に送って再び拒まれたら、フォーム全体の文言をまた読む", async () => {
    placeOrderAction.mockImplementation(async () => rejectedCoupon());

    renderCouponFlow();
    await click("脇 から送る");
    await screen.findByText(`帯:全体の文言 ${REJECTED_FORM_ERROR}`);
    await click("2 枚目を選ぶ");
    await screen.findByText("帯:全体の文言 なし");
    await click("脇 から送る");

    expect(await screen.findByText(`帯:全体の文言 ${REJECTED_FORM_ERROR}`)).toBeVisible();
  });

  it("分類を持たない失敗の後は、クーポンを選び直せる", async () => {
    placeOrderAction.mockResolvedValue(failedActionState({ formError: "在庫が変わりました。" }));

    renderCouponFlow();
    await click("1 枚目を選ぶ");
    await click("脇 から送る");
    await screen.findByText("帯:全体の文言 在庫が変わりました。");
    await click("2 枚目を選ぶ");

    expect(screen.getByText("帯:選び直し できる")).toBeVisible();
    expect(screen.getByText("帯:結果 未定ではない")).toBeVisible();
    expect(screen.getByText(`帯:選択 ${OTHER_COUPON.id}`)).toBeVisible();
  });

  it("衝突で拒まれた後にクーポンを選び直しても、フォーム全体の文言を残す", async () => {
    placeOrderAction.mockResolvedValue(
      failedActionState({ formError: CONFLICT_FORM_ERROR, kind: ErrorKind.CONFLICT }),
    );

    renderCouponFlow();
    await click("脇 から送る");
    await screen.findByText(`帯:全体の文言 ${CONFLICT_FORM_ERROR}`);
    await click("2 枚目を選ぶ");

    expect(screen.getByText(`帯:選択 ${OTHER_COUPON.id}`)).toBeVisible();
    expect(screen.getByText(`帯:全体の文言 ${CONFLICT_FORM_ERROR}`)).toBeVisible();
    expect(screen.getByText(`脇:${CONFLICT_FORM_ERROR}`)).toBeVisible();
  });

  // ----- 確定の結果が定まらないとき -----
  it("確定先が応じられなかったら、結果が未定でクーポンを選び直せないと読む", async () => {
    placeOrderAction.mockResolvedValue(unavailable());

    renderCouponFlow();
    await click("脇 から送る");
    await screen.findByText(`帯:全体の文言 ${UNAVAILABLE_FORM_ERROR}`);

    expect(screen.getByText("帯:選び直し できない")).toBeVisible();
    expect(screen.getByText("帯:結果 未定")).toBeVisible();
  });

  it("確定先が応じられなかった後は、選び直そうとしても選択を変えない", async () => {
    placeOrderAction.mockResolvedValue(unavailable());

    renderCouponFlow();
    await click("1 枚目を選ぶ");
    await click("脇 から送る");
    await screen.findByText(`帯:全体の文言 ${UNAVAILABLE_FORM_ERROR}`);
    await click("2 枚目を選ぶ");

    expect(screen.getByText(`帯:選択 ${COUPON.id}`)).toBeVisible();
    expect(screen.getByText(`帯:全体の文言 ${UNAVAILABLE_FORM_ERROR}`)).toBeVisible();
  });

  it("結果の定まらない失敗の後に同じ鍵で送り直して拒まれたら、選び直せるようになり次を別の鍵で送る", async () => {
    placeOrderAction.mockResolvedValueOnce(unavailable()).mockResolvedValueOnce(rejectedCoupon());

    const { container } = renderCouponFlow();
    await click("1 枚目を選ぶ");
    await click("脇 から送る");
    await screen.findByText(`帯:全体の文言 ${UNAVAILABLE_FORM_ERROR}`);
    await click("脇 から送る");
    await screen.findByText(`帯:全体の文言 ${REJECTED_FORM_ERROR}`);

    expect(sentKey(0)).toBe(KEY);
    expect(sentKey(1)).toBe(KEY);
    expect(screen.getByText("帯:選び直し できる")).toBeVisible();
    expect(screen.getByText("帯:結果 未定ではない")).toBeVisible();
    expect(keyInput(container)).not.toHaveValue(KEY);
    expect(keyInput(container)).toHaveAttribute("value", expect.stringMatching(UUID_V7));

    await click("2 枚目を選ぶ");

    expect(screen.getByText(`帯:選択 ${OTHER_COUPON.id}`)).toBeVisible();
  });

  it("結果の定まらない失敗の後に送り直して再び定まらなかったら、選び直せないまま同じ鍵を保つ", async () => {
    placeOrderAction
      .mockResolvedValueOnce(unavailable())
      .mockResolvedValueOnce(unavailable("まだ確定できません。"));

    const { container } = renderCouponFlow();
    await click("1 枚目を選ぶ");
    await click("脇 から送る");
    await screen.findByText(`帯:全体の文言 ${UNAVAILABLE_FORM_ERROR}`);
    await click("脇 から送る");
    await screen.findByText("帯:全体の文言 まだ確定できません。");
    await click("2 枚目を選ぶ");

    expect(sentKey(1)).toBe(KEY);
    expect(screen.getByText("帯:選び直し できない")).toBeVisible();
    expect(screen.getByText("帯:結果 未定")).toBeVisible();
    expect(screen.getByText(`帯:選択 ${COUPON.id}`)).toBeVisible();
    expect(keyInput(container)).toHaveValue(KEY);
  });

  it("結果の定まらない失敗の後に候補から選んだクーポンが消えても、選択を保ち載せ続ける", async () => {
    placeOrderAction.mockResolvedValue(unavailable());

    const { rerender } = renderCouponFlow();
    await click("1 枚目を選ぶ");
    await click("脇 から送る");
    await screen.findByText(`帯:全体の文言 ${UNAVAILABLE_FORM_ERROR}`);
    rerender(couponFlow([OTHER_COUPON]));

    expect(screen.getByText(`帯:選択 ${COUPON.id}`)).toBeVisible();
    expect(screen.getByText(`帯:載せる ${COUPON.id}`)).toBeVisible();
    expect(screen.getByText("帯:値引き なし")).toBeVisible();
  });

  it("結果の定まらない失敗の後に候補を読めなくなっても、選択を保ち載せ続ける", async () => {
    placeOrderAction.mockResolvedValue(unavailable());

    const { rerender } = renderCouponFlow();
    await click("1 枚目を選ぶ");
    await click("脇 から送る");
    await screen.findByText(`帯:全体の文言 ${UNAVAILABLE_FORM_ERROR}`);
    rerender(couponFlow(null));

    expect(screen.getByText(`帯:選択 ${COUPON.id}`)).toBeVisible();
    expect(screen.getByText(`帯:載せる ${COUPON.id}`)).toBeVisible();
    expect(screen.getByText("帯:値引き なし")).toBeVisible();
  });

  it("候補から消えたクーポンを保ったまま送り直して拒まれたら、選択を手放す", async () => {
    placeOrderAction.mockResolvedValueOnce(unavailable()).mockResolvedValueOnce(rejectedCoupon());

    const { rerender } = renderCouponFlow();
    await click("1 枚目を選ぶ");
    await click("脇 から送る");
    await screen.findByText(`帯:全体の文言 ${UNAVAILABLE_FORM_ERROR}`);
    rerender(couponFlow([OTHER_COUPON]));
    await click("脇 から送る");
    await screen.findByText(`帯:全体の文言 ${REJECTED_FORM_ERROR}`);

    expect(screen.getByText("帯:選び直し できる")).toBeVisible();
    expect(screen.getByText("帯:選択 未選択")).toBeVisible();
    expect(screen.getByText("帯:載せる なし")).toBeVisible();
  });

  // ----- 送っているあいだ -----
  it("送っているあいだは、結果が未定ではなくクーポンを選び直せないと読む", async () => {
    placeOrderAction.mockReturnValue(pendingAction());

    renderCouponFlow();
    await click("脇 から送る");
    await screen.findByText("脇:待っている");

    expect(screen.getByText("帯:選び直し できない")).toBeVisible();
    expect(screen.getByText("帯:結果 未定ではない")).toBeVisible();
  });

  it("送っているあいだは、選び直そうとしても選択を変えない", async () => {
    placeOrderAction.mockReturnValue(pendingAction());

    renderCouponFlow();
    await click("1 枚目を選ぶ");
    await click("脇 から送る");
    await screen.findByText("脇:待っている");
    await click("2 枚目を選ぶ");

    expect(screen.getByText(`帯:選択 ${COUPON.id}`)).toBeVisible();
  });

  // ----- 器の外で読んだとき -----
  it("器の外で読もうとしたら、その場で落とす", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<Consumer name="器の外" />)).toThrow(
      "PlaceOrderStateProvider の外で確定の送信状態を読もうとしました",
    );

    vi.restoreAllMocks();
  });
});
