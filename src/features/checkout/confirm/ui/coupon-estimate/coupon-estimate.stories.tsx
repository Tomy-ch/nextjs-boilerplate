import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { formatMoney } from "@/model/money";
import { CART_COUPONS } from "../../../checkout.fixture";
import { CouponChoice, CouponChoices } from "../coupon-choices/coupon-choices";
import { PlaceOrderStateProvider } from "../place-order-state/place-order-state";
import { CouponEstimate } from "./coupon-estimate";

/** 画面が組み立てた鍵の代わり。カタログでは確定を実行しないため、値そのものに意味はない。 */

function firstCouponName(): string {
  const coupon = CART_COUPONS[0];
  if (coupon === undefined) throw new Error("クーポンの候補が無い");

  return formatMoney(-coupon.discountAmount);
}

const meta = {
  title: "Features/Checkout/Confirm/CouponEstimate",
  component: CouponEstimate,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "選んだクーポンの値引きを見込みとして 1 行で出し、値引きが確定時に決まることを添えます。",
          "**値引き額は受け取った値をそのまま出し**、小計からは差し引きません。何も選んでいないとき、",
          "「使わない」を選んだとき、候補を読めなかったときは何も出しません。",
        ].join(""),
      },
    },
  },
  decorators: [
    // 選択は送信状態の器が持つ。選ぶ欄を並べ、選んだクーポンの見込みを出せるようにする。
    (Story) => (
      <PlaceOrderStateProvider coupons={CART_COUPONS}>
        <div className="flex max-w-md flex-col gap-4">
          <CouponChoices title="クーポン">
            {CART_COUPONS.map((coupon) => (
              <CouponChoice couponId={coupon.id} key={coupon.id}>
                {formatMoney(-coupon.discountAmount)}
              </CouponChoice>
            ))}
          </CouponChoices>
          <div className="rounded-lg border p-4">
            <Story />
          </div>
        </div>
      </PlaceOrderStateProvider>
    ),
  ],
} satisfies Meta<typeof CouponEstimate>;

export default meta;
type Story = StoryObj<typeof meta>;

/** まだどれも選んでいない状態。見込みの行は出ない。 */
export const Default: Story = {};

/** クーポンを 1 枚選んだ状態。値引き額を見込みとして出し、確定時に決まることを添える。 */
export const Chosen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("radio", { name: firstCouponName() }));
    await canvas.findByText("クーポン値引き（見込み）");
  },
};
