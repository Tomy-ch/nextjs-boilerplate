import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../../action/button/button";
import { BUTTON_VARIANT } from "../../action/button/button.definition";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

const meta = {
  title: "Display/Card",
  component: Card,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "関連する情報と補助操作を一つの視覚的なまとまりにします。**枠を付けること自体が目的ではありません。**",
          "並列に扱える内容が複数あり、境界が無いと読み手が区切りを見失う場合に使います。",
          "同型の行が縦に続くだけなら `List`、項目名と値の対なら `KeyValueList` の方が読みやすくなります。",
          "内側の構造は呼び出し元が組み、この component は面と余白だけを持ちます。",
        ].join(""),
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-96 max-w-[calc(100vw-2rem)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 見出し・説明・本文・操作を揃えた基本構成。 */
export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>設定の概要</CardTitle>
        <CardDescription>現在の状態と次にできる操作を確認できます。</CardDescription>
      </CardHeader>
      <CardContent>この設定は有効です。</CardContent>
      <CardFooter>
        <Button>設定を開く</Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * 見出しの行へ操作を置く場合。`CardAction` はまとまり全体に対する操作へ使い、本文の中の
 * 操作は `CardContent` に置く。
 */
export const WithAction: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>通知設定</CardTitle>
        <CardDescription>メールによる更新通知が有効です。</CardDescription>
        <CardAction>
          <Button size="sm" variant={BUTTON_VARIANT.GHOST}>
            変更
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>通知方法や配信頻度を変更できます。</CardContent>
    </Card>
  ),
};

/** 見出しと脚注を線で切る場合。区切りは専用の props ではなく border の class で与える。 */
export const WithSeparators: Story = {
  render: () => (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>利用状況</CardTitle>
        <CardDescription>2026 年 8 月</CardDescription>
      </CardHeader>
      <CardContent>利用回数 4 回</CardContent>
      <CardFooter className="border-t border-border">
        <Button variant={BUTTON_VARIANT.OUTLINE}>詳細を見る</Button>
      </CardFooter>
    </Card>
  ),
};

/** 見出しを持たない場合。補助情報を 1 かたまり置くだけなら本文だけで足りる。 */
export const ContentOnly: Story = {
  render: () => (
    <Card>
      <CardContent>補助情報を簡潔に表示します。</CardContent>
    </Card>
  ),
};
