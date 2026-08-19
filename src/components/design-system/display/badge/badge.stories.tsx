import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";

import { Badge } from "./badge";
import { BADGE_VARIANT } from "./badge.definition";

const meta = {
  title: "Display/Badge",
  component: Badge,
  argTypes: {
    asChild: {
      control: false,
    },
  },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "短い分類や状態を、本文の流れを止めずに視覚的へ補助します。**意味は文言が持ち、色は補助**です。",
          "色だけで状態を区別すると、色を識別できない利用者に何も伝わりません。",
          "利用者へ対処を促す通知は `Alert`、本文より一段控えた注釈は `Marker` を使います。",
          "押せる要素ではないので、操作には `Button` を使います。",
        ].join(""),
      },
    },
  },
  args: {
    children: "有効",
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。塗りつぶした面で分類を示す。 */
export const Default: Story = {};

/** 主張を一段落とす場合。 */
export const Secondary: Story = {
  args: {
    variant: BADGE_VARIANT.SECONDARY,
  },
};

/** 成立・完了など、望ましい終端の状態。文言も合わせて変える。 */
export const Success: Story = {
  args: {
    children: "完了",
    variant: BADGE_VARIANT.SUCCESS,
  },
};

/** 失敗・無効など、注意を要する状態。文言も合わせて変える。 */
export const Destructive: Story = {
  args: {
    children: "無効",
    variant: BADGE_VARIANT.DESTRUCTIVE,
  },
};

/** 面を塗らず枠線だけで示す場合。密に並べても背景がうるさくならない。 */
export const Outline: Story = {
  args: {
    variant: BADGE_VARIANT.OUTLINE,
  },
};

/** 枠も塗りも持たない場合。数や記号を並べる領域で使う。 */
export const Ghost: Story = {
  args: {
    variant: BADGE_VARIANT.GHOST,
  },
};

/** 分類そのものを遷移先にする場合。`asChild` に単一の link 要素を渡す。 */
export const AsLink: Story = {
  render: () => (
    <Badge asChild variant={BADGE_VARIANT.LINK}>
      <Link href="/documentation">詳細</Link>
    </Badge>
  ),
};
