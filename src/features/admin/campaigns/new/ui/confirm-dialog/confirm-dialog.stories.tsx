import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  CAMPAIGN_CATEGORY_OPTIONS,
  FILLED_DISCOUNT_VALUES,
  FILLED_OWN_VALUES,
  FILLED_SCOPE_VALUES,
} from "../../campaign-new.fixture";
import { confirmationOf } from "../../campaign-summary";
import { CampaignConfirmDialog } from "./confirm-dialog";

const CONFIRMATION = confirmationOf(
  FILLED_OWN_VALUES,
  FILLED_DISCOUNT_VALUES,
  FILLED_SCOPE_VALUES,
  CAMPAIGN_CATEGORY_OPTIONS[0]?.label ?? "",
);

const meta = {
  title: "Features/Admin/Campaigns/New/ConfirmDialog",
  component: CampaignConfirmDialog,
  parameters: {
    layout: "padded",
    docs: {
      story: { inline: false, iframeHeight: 720 },
      description: {
        component: [
          "キャンペーンを定義する前の確認です。**定義した後は直せない**ため、保存される綴りのコードと",
          "配る中身を復唱します。送信は dialog の中の form が担い、押した瞬間には閉じません。",
        ].join(""),
      },
    },
  },
  args: {
    open: true,
    onDismiss: () => undefined,
    formAction: () => undefined,
    confirmation: CONFIRMATION,
    idempotencyKey: "0195f0c2-0000-7000-a000-000000000003",
    failures: [],
  },
} satisfies Meta<typeof CampaignConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 開いた状態。 */
export const Default: Story = {};

/** 狭い幅。復唱は語と値を縦に積む。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 欄を名指しされずに拒まれた状態。確認の中に文言が出る。 */
export const Failed: Story = {
  args: {
    failures: [
      "入力内容を受け付けられませんでした。期間・上限・値引きの組み合わせを確認してください。",
    ],
  },
};
