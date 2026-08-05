import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TabsNative, TabsNativeLink, TabsNativeList } from "./tabs-native";

const meta = {
  title: "Navigation/TabsNative",
  component: TabsNative,
  parameters: { layout: "centered" },
} satisfies Meta<typeof TabsNative>;

export default meta;
type Story = StoryObj<typeof meta>;

/** URL で観点を切り替える基本構成。現在の観点に `isActive` を指定する。 */
export const Default: Story = {
  render: () => (
    <TabsNative aria-label="表示する観点">
      <TabsNativeList>
        <TabsNativeLink href="?view=summary" isActive>
          サマリ
        </TabsNativeLink>
        <TabsNativeLink href="?view=detail">明細</TabsNativeLink>
        <TabsNativeLink href="?view=history">履歴</TabsNativeLink>
      </TabsNativeList>
    </TabsNative>
  ),
};

/** 先頭以外を選択している場合。 */
export const SecondSelected: Story = {
  render: () => (
    <TabsNative aria-label="表示する観点">
      <TabsNativeList>
        <TabsNativeLink href="?view=summary">サマリ</TabsNativeLink>
        <TabsNativeLink href="?view=detail" isActive>
          明細
        </TabsNativeLink>
        <TabsNativeLink href="?view=history">履歴</TabsNativeLink>
      </TabsNativeList>
    </TabsNative>
  ),
};

/** 既存の query を保ったまま切り替える場合。URL の組み立ては呼び出し元が持つ。 */
export const WithPreservedQuery: Story = {
  render: () => (
    <TabsNative aria-label="表示する観点">
      <TabsNativeList>
        <TabsNativeLink href="?keyword=abc&view=summary" isActive>
          サマリ
        </TabsNativeLink>
        <TabsNativeLink href="?keyword=abc&view=detail">明細</TabsNativeLink>
      </TabsNativeList>
    </TabsNative>
  ),
};

/** 項目が多く、収まらない場合。横スクロールは利用側のレイアウトで扱う。 */
export const ManyItems: Story = {
  render: () => (
    <TabsNative aria-label="表示する観点" className="max-w-72 overflow-x-auto">
      <TabsNativeList className="w-max">
        {["サマリ", "明細", "履歴", "設定", "権限", "監査"].map((label, index) => (
          <TabsNativeLink href={`?view=${index}`} isActive={index === 0} key={label}>
            {label}
          </TabsNativeLink>
        ))}
      </TabsNativeList>
    </TabsNative>
  ),
};
