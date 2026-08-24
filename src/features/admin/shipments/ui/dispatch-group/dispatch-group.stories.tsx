import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { failedActionState, succeededActionState } from "@/model/action-state";
import { SHIPMENT_CONFLICT_MESSAGE } from "../../form-state";
import { MULTI_PURCHASE_GROUP, SINGLE_PURCHASE_GROUP } from "../../shipments.fixture";
import { DispatchGroupCard } from "./dispatch-group";

const meta = {
  title: "Features/Admin/Shipments/DispatchGroupCard",
  component: DispatchGroupCard,
  parameters: {
    docs: {
      description: {
        component: [
          "まとめて発送してよい 1 組です。**契約の発送は購入 1 件ずつ**なので、",
          "まとめる側は同じ送信に注文を並べて送ります。",
        ].join(""),
      },
    },
  },
  args: { shipAction: fn(async () => succeededActionState({ shipped: 1, refused: 0 })) },
} satisfies Meta<typeof DispatchGroupCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。同じ宛先へ 3 件たまっている便。 */
export const Default: Story = {
  args: { group: MULTI_PURCHASE_GROUP },
};

/** 1 件しかない便。まとめる操作は残るが、行の操作と同じ結果になる。 */
export const SinglePurchase: Story = {
  args: { group: SINGLE_PURCHASE_GROUP },
};

/** 送信の結果が出るまで、まとめる操作を押して待つ。 */
async function shipAll(canvasElement: HTMLElement, expected: string) {
  const canvas = within(canvasElement);

  await userEvent.click(canvas.getByRole("button", { name: "この便をまとめて発送" }));
  await expect(await canvas.findByText(expected)).toBeVisible();
}

/** 全件が通った後。 */
export const Shipped: Story = {
  args: {
    group: MULTI_PURCHASE_GROUP,
    shipAction: fn(async () => succeededActionState({ shipped: 3, refused: 0 })),
  },
  play: async ({ canvasElement }) => {
    await shipAll(canvasElement, "3 件を発送しました。");
  },
};

/** 途中まで通った後。通った分と通らなかった分を両方伝える。 */
export const PartiallyShipped: Story = {
  args: {
    group: MULTI_PURCHASE_GROUP,
    shipAction: fn(async () => succeededActionState({ shipped: 2, refused: 1 })),
  },
  play: async ({ canvasElement }) => {
    await shipAll(canvasElement, "2 件を発送しました。1 件はいまの状況では発送できませんでした。");
  },
};

/** 1 件も通らなかった後。 */
export const Refused: Story = {
  args: {
    group: MULTI_PURCHASE_GROUP,
    shipAction: fn(async () => failedActionState({ formError: SHIPMENT_CONFLICT_MESSAGE })),
  },
  play: async ({ canvasElement }) => {
    await shipAll(canvasElement, SHIPMENT_CONFLICT_MESSAGE);
  },
};
