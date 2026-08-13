import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FILTER_KEY } from "../../query";
import { ProductSearch } from "./search";

const meta = {
  title: "Features/Products/List/Search",
  component: ProductSearch,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "検索条件を URL へ書き戻す client island です。**canvas では遷移しません。**",
          "送信すると URL を書き換えるだけで、一覧の再取得はサーバ側で起きるためです。",
        ].join(""),
      },
    },
  },
  args: { selection: {} },
} satisfies Meta<typeof ProductSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。条件が無い状態。 */
export const Default: Story = {};

/** 条件が付いている状態。URL から引き継いだ語を初期値に置く。 */
export const WithKeyword: Story = {
  args: { selection: { [FILTER_KEY.KEYWORD]: "イヤホン" } },
};
