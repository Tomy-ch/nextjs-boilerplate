import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactElement } from "react";

import { PurchaseFilterDraftProvider } from "../../filter-draft";
import type { PeriodSelection } from "../../period";
import { PurchasePeriodSheet } from "./period-sheet";

/** 下書きの供給で包む。効いている期間は props と揃える。 */
function withDraft(Story: () => ReactElement, context: { args: { period: PeriodSelection } }) {
  return (
    <PurchaseFilterDraftProvider period={context.args.period}>
      <div className="min-h-96">
        <Story />
      </div>
    </PurchaseFilterDraftProvider>
  );
}

const meta = {
  title: "Features/Purchases/PeriodSheet",
  component: PurchasePeriodSheet,
  parameters: {
    layout: "fullscreen",
    docs: { story: { inline: false, iframeHeight: 520 } },
  },
  decorators: [withDraft],
} satisfies Meta<typeof PurchasePeriodSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 閉じている状態。開く操作は画面の下端に固定される。 */
export const Closed: Story = {
  args: { period: { kind: "all" } },
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 絞り込んでいる状態。効いている条件の数が操作に付く。 */
export const Filtered: Story = {
  args: { period: { kind: "recent", days: 30 } },
  globals: { viewport: { value: "mobile2", isRotated: false } },
};
