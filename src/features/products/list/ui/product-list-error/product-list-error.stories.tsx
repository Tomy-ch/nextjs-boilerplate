import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ProductListError } from "./product-list-error";

/** story では再試行の中身を持たない。押せることだけを見せる。 */
const noop = () => {};

const meta = {
  title: "Features/Products/ProductListError",
  component: ProductListError,
  parameters: { layout: "padded" },
  args: {
    message: "現在サービスを利用できません。しばらくしてから再試行してください。",
    onRetry: noop,
  },
} satisfies Meta<typeof ProductListError>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。正規化済みの文言と再試行だけを出し、生のエラーは見せない。 */
export const Default: Story = {};

/** 問い合わせ番号がある場合。ログと突き合わせる手掛かりとして添える。 */
export const WithDigest: Story = {
  args: { digest: "2741564515" },
};
