import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { mocked, userEvent, within } from "storybook/test";

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState } from "@/model/action-state";
import { formatMoney } from "@/model/money";
import { placeOrderAction } from "../../../actions";
import { CART_COUPONS } from "../../../checkout.fixture";
import { COUPON_ID_FIELD } from "../../../form-fields";
import { PlaceOrderForm } from "../place-order-form/place-order-form";
import { PlaceOrderStateProvider } from "../place-order-state/place-order-state";
import { CouponChoice, CouponChoices } from "./coupon-choices";

/** 画面が組み立てた鍵の代わり。カタログでは送信しないため、値そのものに意味はない。 */
const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-a000-000000000001";

function firstCouponName(): string {
  const coupon = CART_COUPONS[0];
  if (coupon === undefined) throw new Error("クーポンの候補が無い");

  return formatMoney(-coupon.discountAmount);
}

const meta = {
  title: "Features/Checkout/Confirm/CouponChoices",
  component: CouponChoices,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "クーポンを 1 枚選ぶ radio の群です。「使わない」を先頭に置き、渡された選択肢をその後に並べます。",
          "最初はどれも選んでいません。選択は確定の送信状態と同じ器が持ち、確定でクーポンが拒まれると",
          "欄を不正と示して理由を結び、選び直すと外します。",
        ].join(""),
      },
    },
  },
  args: {
    title: "クーポン",
    children: CART_COUPONS.map((coupon) => (
      <CouponChoice couponId={coupon.id} key={coupon.id}>
        {formatMoney(-coupon.discountAmount)}
      </CouponChoice>
    )),
  },
  decorators: [
    // 選択は送信状態の器が持つ。確定の操作を並べ、拒まれた状態を作れるようにする。
    (Story) => (
      <PlaceOrderStateProvider coupons={CART_COUPONS} idempotencyKey={IDEMPOTENCY_KEY}>
        <div className="flex max-w-md flex-col gap-4">
          <Story />
          <PlaceOrderForm orderable />
        </div>
      </PlaceOrderStateProvider>
    ),
  ],
} satisfies Meta<typeof CouponChoices>;

export default meta;
type Story = StoryObj<typeof meta>;

/** まだどれも選んでいない状態。 */
export const Default: Story = {};

/** クーポンを 1 枚選んだ状態。選んだものだけに印が付く。 */
export const Chosen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("radio", { name: firstCouponName() }));
  },
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
        fieldErrors: {
          [COUPON_ID_FIELD]: ["このクーポンは使えなくなりました。選び直してください。"],
        },
        kind: ErrorKind.VALIDATION,
      }),
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("radio", { name: firstCouponName() }));
    await userEvent.click(canvas.getByRole("button", { name: "注文を確定する" }));
    await canvas.findByText("このクーポンは使えなくなりました。選び直してください。");
  },
};
