import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { failedActionState, idleActionState } from "@/model/action-state";

import { INQUIRY_BODY_FIELD } from "../../../form-names";
import { InquiryComposer } from "./composer";

const IDEMPOTENCY_KEY = "00000000-0000-4000-8000-000000000001";

const meta = {
  title: "Features/Inquiry/Thread/Composer",
  component: InquiryComposer,
  parameters: {
    docs: {
      description: {
        component: [
          "送信欄です。書きかけはこの部品が持ち、**成立したときだけ片付けます** ——",
          "通らなかった送信で本文が消えると、打ち直しになります。",
          "`⌘Enter` / `Ctrl+Enter` でも送信できます。",
        ].join(""),
      },
    },
  },
  args: {
    action: () => {},
    idempotencyKey: IDEMPOTENCY_KEY,
    outcomeOpen: false,
    pending: false,
    state: idleActionState(),
  },
} satisfies Meta<typeof InquiryComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** まだ何も打っていない状態。 */
export const Default: Story = {};

/** 空のまま押した。送らずに、入力を促す文言を入力欄に紐づけて出す。 */
export const EmptySubmitted: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "送信" }));
  },
};

/** 送信中。二重に送れないよう操作を閉じる。 */
export const Pending: Story = { args: { pending: true } };

/** 前回の送信の結果が分からないあいだ。本文を書き換えさせず、理由を欄に結ぶ。 */
export const OutcomeOpen: Story = { args: { outcomeOpen: true } };

/** 本文が契約を通らなかった状態。項目に文言が付く。 */
export const Invalid: Story = {
  args: {
    state: failedActionState({
      fieldErrors: { [INQUIRY_BODY_FIELD]: ["本文を入力してください。"] },
    }),
  },
};
