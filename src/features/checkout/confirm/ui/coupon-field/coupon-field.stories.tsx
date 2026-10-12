import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { mocked, userEvent, within } from "storybook/test";

import { failedActionState } from "@/model/action-state";
import { placeOrderAction } from "../../../actions";
import { CART_COUPONS } from "../../../checkout.fixture";
import { COUPON_ID_FIELD } from "../../../form-fields";
import { PlaceOrderForm } from "../place-order-form/place-order-form";
import { PlaceOrderStateProvider } from "../place-order-state/place-order-state";
import { CouponField } from "./coupon-field";

/** 画面が組み立てた鍵の代わり。カタログでは送信しないため、値そのものに意味はない。 */
const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-a000-000000000001";

const meta = {
  title: "Features/Checkout/Confirm/CouponField",
  component: CouponField,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "確定に載せるクーポンを 1 枚選ぶ欄です。**値引き額は受け取った値をそのまま出し**、合計には",
          "足し込みません。「使わない」を先頭に置き、最初はどれも選んでいません。選択は確定の送信状態と",
          "同じ器が持ち、脇・帯・金額の確かめのどこから確定しても同じ選択が載ります。",
        ].join(""),
      },
    },
  },
  args: { coupons: CART_COUPONS },
  decorators: [
    // 選択は送信状態の器が持つ。確定の操作を並べ、選んだ値が送信に載ることも確かめられるようにする。
    (Story, { args }) => (
      <PlaceOrderStateProvider
        couponIds={args.coupons?.map((coupon) => coupon.id) ?? []}
        idempotencyKey={IDEMPOTENCY_KEY}
      >
        <div className="flex max-w-md flex-col gap-4">
          <Story />
          <PlaceOrderForm orderable />
        </div>
      </PlaceOrderStateProvider>
    ),
  ],
} satisfies Meta<typeof CouponField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 使えるクーポンが並んだ状態。まだどれも選んでいない。 */
export const Default: Story = {};

/** 使えるクーポンを読めなかった状態。使わずに注文できることだけを告げる。 */
export const Unavailable: Story = {
  args: { coupons: null },
};

/**
 * 選んだクーポンが確定で拒まれた状態。欄の下に理由が出て、選び直すと消える。
 *
 * @remarks
 * 送信先は Server Action で、カタログでは差し替えてあります。拒まれた状態は props では作れない
 * ため、戻り値の側から作ります。
 */
export const Rejected: Story = {
  beforeEach: () => {
    mocked(placeOrderAction).mockResolvedValue(
      failedActionState({
        formError: "選んだクーポンを使えなかったため、注文は確定していません。",
        fieldErrors: { [COUPON_ID_FIELD]: ["このクーポンは使えなくなりました。選び直してください。"] },
      }),
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [, firstCoupon] = canvas.getAllByRole("radio");
    if (firstCoupon === undefined) throw new Error("クーポンの選択肢が無い");

    await userEvent.click(firstCoupon);
    await userEvent.click(canvas.getByRole("button", { name: "注文を確定する" }));
    await canvas.findByText("このクーポンは使えなくなりました。選び直してください。");
  },
};
