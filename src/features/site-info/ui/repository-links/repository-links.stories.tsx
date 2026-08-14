import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { RepositoryLinks } from "./repository-links";

/** 補足は hover か focus でしか開かない。開いた面の幅と文量を見るため、focus まで進める。 */
async function focusFirstLink({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> {
  await userEvent.tab();
  await within(canvasElement).findByText(/このサイトそのもの/);
}

const meta = {
  title: "Features/SiteInfo/RepositoryLinks",
  component: RepositoryLinks,
  parameters: {
    docs: {
      description: {
        component: [
          "フッターへ置くリポジトリへの導線です。押した先が何かはボタンの文言だけで判るようにし、",
          "説明は補足として HoverCard に載せます。hover を持たない利用者にも届くよう、focus でも開きます。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof RepositoryLinks>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。2 つのボタンが並ぶ。 */
export const Default: Story = {};

/** 補足を開いた状態。keyboard の focus で開く経路を通る。 */
export const WithHoverCard: Story = {
  play: focusFirstLink,
};

/** スマホ幅。2 つが 1 行に収まらなければ折り返す。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};
