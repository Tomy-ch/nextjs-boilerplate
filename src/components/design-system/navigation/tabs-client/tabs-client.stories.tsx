import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TabsClient, TabsClientContent, TabsClientList, TabsClientTrigger } from "./tabs-client";

const meta = {
  title: "Navigation/TabsClient",
  component: TabsClient,
  parameters: { layout: "centered" },
  args: { className: "w-72" },
} satisfies Meta<typeof TabsClient>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。`defaultValue` で初期選択を決める非制御 component。 */
export const Default: Story = {
  render: (args) => (
    <TabsClient {...args} defaultValue="summary">
      <TabsClientList aria-label="表示する観点">
        <TabsClientTrigger value="summary">サマリ</TabsClientTrigger>
        <TabsClientTrigger value="detail">明細</TabsClientTrigger>
      </TabsClientList>
      <TabsClientContent value="summary">サマリの内容です。</TabsClientContent>
      <TabsClientContent value="detail">明細の内容です。</TabsClientContent>
    </TabsClient>
  ),
};

/** 下線で示す `line` variant。 */
export const LineVariant: Story = {
  render: (args) => (
    <TabsClient {...args} defaultValue="summary">
      <TabsClientList aria-label="表示する観点" variant="line">
        <TabsClientTrigger value="summary">サマリ</TabsClientTrigger>
        <TabsClientTrigger value="detail">明細</TabsClientTrigger>
      </TabsClientList>
      <TabsClientContent value="summary">サマリの内容です。</TabsClientContent>
      <TabsClientContent value="detail">明細の内容です。</TabsClientContent>
    </TabsClient>
  ),
};

/** 縦向き。矢印キーの移動方向も上下になる。 */
export const Vertical: Story = {
  render: (args) => (
    <TabsClient {...args} defaultValue="summary" orientation="vertical">
      <TabsClientList aria-label="表示する観点">
        <TabsClientTrigger value="summary">サマリ</TabsClientTrigger>
        <TabsClientTrigger value="detail">明細</TabsClientTrigger>
      </TabsClientList>
      <TabsClientContent value="summary">サマリの内容です。</TabsClientContent>
      <TabsClientContent value="detail">明細の内容です。</TabsClientContent>
    </TabsClient>
  ),
};
