import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactElement } from "react";
import { userEvent, within } from "storybook/test";

import type { CartCoupon } from "@/model/coupon/coupon";
import { formatMoney } from "@/model/money";
import {
  BLOCKED_CART,
  CART_COUPONS,
  ORDERABLE_CART,
  PARTIALLY_ORDERABLE_CART,
  SUBTOTAL_REFERENCE,
} from "../../../checkout.fixture";
import { CouponChoice, CouponChoices } from "../coupon-choices/coupon-choices";
import { PlaceOrderStateProvider } from "../place-order-state/place-order-state";
import { OrderSummary } from "./order-summary";

/** 画面が組み立てた鍵の代わり。カタログでは確定を実行しないため、値そのものに意味はない。 */

function firstCouponName(): string {
  const coupon = CART_COUPONS[0];
  if (coupon === undefined) throw new Error("クーポンの候補が無い");

  return formatMoney(-coupon.discountAmount);
}

/**
 * 送信の状態は画面が 1 つだけ持つ。実画面と同じ位置に置かないと、確定の姿が器を持たない。
 * クーポンの選択も同じ器が持つ。候補は `parameters.coupons` で story ごとに渡し、あるときは選ぶ欄を
 * 並べて見込みの行を出せるようにする。
 */
function withPlaceOrderState(
  Story: () => ReactElement,
  context: { parameters: { coupons?: readonly CartCoupon[] } },
) {
  const coupons = context.parameters.coupons ?? null;

  return (
    <PlaceOrderStateProvider coupons={coupons}>
      <div className="flex w-80 flex-col gap-4">
        {coupons === null || coupons.length === 0 ? null : (
          <CouponChoices title="クーポン">
            {coupons.map((coupon) => (
              <CouponChoice couponId={coupon.id} key={coupon.id}>
                {formatMoney(-coupon.discountAmount)}
              </CouponChoice>
            ))}
          </CouponChoices>
        )}
        <div className="rounded-lg border p-4">
          <Story />
        </div>
      </div>
    </PlaceOrderStateProvider>
  );
}

const meta = {
  title: "Features/Checkout/Confirm/OrderSummary",
  component: OrderSummary,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "小計と確定の操作です。器を持たず、広い幅では本文の脇に貼り付き、狭い幅では画面の下端に固定されます。",
          "**出せるのは小計まで**で、税と送料は確定した時点で決まります。",
          "クーポンを選ぶと値引きの見込みを別の行に出し、小計からは差し引きません。",
          "**カタログでは確定は実行されません。**",
        ].join(""),
      },
    },
  },
  decorators: [withPlaceOrderState],
} satisfies Meta<typeof OrderSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。すべての明細が載る。 */
export const Default: Story = {
  args: {
    cart: ORDERABLE_CART,
    reference: SUBTOTAL_REFERENCE,
    size: "compact",
  },
};

/** 一部の明細が外れる状態。外れることを注記に足す。 */
export const WithExcluded: Story = {
  args: {
    cart: PARTIALLY_ORDERABLE_CART,
    reference: SUBTOTAL_REFERENCE,
    size: "compact",
  },
};

/** 確定できる明細が 1 つも無い状態。操作を押せなくする。 */
export const Blocked: Story = {
  args: {
    cart: BLOCKED_CART,
    reference: null,
    size: "compact",
  },
};

/** クーポンを選んだ状態。値引きの見込みを小計の下に別の行で出し、小計そのものは変えない。 */
export const WithCoupon: Story = {
  args: {
    cart: ORDERABLE_CART,
    reference: SUBTOTAL_REFERENCE,
    size: "compact",
  },
  parameters: { coupons: CART_COUPONS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("radio", { name: firstCouponName() }));
    await canvas.findByText("クーポン値引き（見込み）");
  },
};
