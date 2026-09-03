import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import { BUTTON_SIZE, BUTTON_VARIANT } from "./button.definition";

const meta = {
  title: "Action/Button",
  component: Button,
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
          "利用者の操作を開始する部品です。`variant` は**操作の優先度**を表し、見た目の好みでは選びません。",
          "同じ面に `default` が 2 つ並ぶと、どちらが主要な操作か伝わらなくなります。",
          "押した結果・送信中・成否の通知は持ちません。form の中では、意図しない送信を避けるため",
          "`type` を明示します。遷移には `asChild` と link 要素を組み合わせ、`Button` を押して",
          "`router.push` する実装にはしません。JavaScript が動かない状態でも遷移できるためです。",
        ].join(""),
      },
    },
  },
  args: {
    children: "続ける",
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// portal:replace-begin
const detailsHref = "https://github.com/";
// portal:replace-with
// = const detailsHref = "__PORTAL_URL__";
// portal:replace-end

/** 既定。画面の主要操作に使う。 */
export const Default: Story = {};

/** 主要操作に並ぶ副次操作。 */
export const Outline: Story = {
  args: {
    variant: BUTTON_VARIANT.OUTLINE,
  },
};

/** 周囲の情報量を増やしたくない補助操作。枠も塗りも持たない。 */
export const Ghost: Story = {
  args: {
    variant: BUTTON_VARIANT.GHOST,
  },
};

/** 取り消せない結果を伴う操作。配色だけに頼らず、文言でも何が起きるかを示す。 */
export const Destructive: Story = {
  args: {
    children: "削除する",
    variant: BUTTON_VARIANT.DESTRUCTIVE,
  },
};

/** 表や密度の高い領域へ置く場合。 */
export const Small: Story = {
  args: {
    size: BUTTON_SIZE.SMALL,
  },
};

/** 単独で目立たせる主要操作。 */
export const Large: Story = {
  args: {
    size: BUTTON_SIZE.LARGE,
  },
};

/** 操作できない状態。native の `disabled` で指定する。 */
export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

/**
 * 送信中。**文言はその場所に残し、その上へ印を重ねる。**
 *
 * 文言を進行中の語へ差し替えたり、印を隣へ足したりすると器の幅が動く。休止時と見比べて、幅が
 * 変わらないことを確かめる。
 */
export const Pending: Story = {
  args: { children: "保存する", pending: true, pendingLabel: "保存しています" },
};

/**
 * 遷移をボタンの見た目で示す場合。`asChild` に単一の link 要素を渡す。link には `disabled` が
 * 無いため、遷移させたくない状態は別の UI で表す。
 */
export const AsChild: Story = {
  render: () => (
    <Button asChild variant={BUTTON_VARIANT.OUTLINE}>
      <a href={detailsHref}>詳細を確認</a>
    </Button>
  ),
};
