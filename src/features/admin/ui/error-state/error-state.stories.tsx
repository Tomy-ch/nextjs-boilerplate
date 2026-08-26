import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";

import { AdminScreenError } from "./error-state";

/** story では再取得の中身を持たない。押せることだけを見せる。 */
const noop = () => {};

const meta = {
  title: "Features/Admin/ErrorState",
  component: AdminScreenError,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "管理側の画面の取得に失敗したときの表示です。",
          "**どの画面が落ちたかを言いません。** 使うのは `/admin` に 1 枚だけ置かれた error 境界で、",
          "そこには落ちた画面の区別が届かないためです。",
          "見出しで対象を名指しする `Features/Products/List/ErrorState` とは、その点で使い分けます。",
        ].join(""),
      },
    },
  },
  args: {
    message: getDefaultErrorMeta(ErrorKind.INTERNAL).message,
    onRetry: noop,
  },
} satisfies Meta<typeof AdminScreenError>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。境界が渡す正規化済みの文言と再試行だけを出し、生のエラーは見せない。 */
export const Default: Story = {};

/** 問い合わせ番号がある場合。サーバ側のログと突き合わせる手掛かりとして添える。 */
export const WithDigest: Story = {
  args: { digest: "2741564515" },
};
