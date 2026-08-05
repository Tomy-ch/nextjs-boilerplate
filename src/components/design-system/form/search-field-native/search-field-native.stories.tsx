import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SearchFieldNative } from "./search-field-native";

const meta = {
  title: "Form/SearchFieldNative",
  component: SearchFieldNative,
  parameters: { layout: "centered" },
  args: { action: "/", label: "項目を検索" },
  decorators: [
    (Story) => (
      <div className="w-[28rem] max-w-[calc(100vw-2rem)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchFieldNative>;

export default meta;
type Story = StoryObj<typeof meta>;

/** JavaScript を必要としない既定の検索欄。 */
export const Default: Story = {};

/** 入力例を補助文で示す場合。名前は `label` が担うため placeholder は補助に留める。 */
export const WithPlaceholder: Story = { args: { placeholder: "キーワードを入力" } };

/** 現在の検索条件を反映する場合。呼び出し元が `searchParams` から渡す。 */
export const WithCurrentKeyword: Story = { args: { defaultValue: "標準" } };

/** 並び順など、検索し直しても保ちたい query を引き継ぐ場合。 */
export const WithCarriedParams: Story = {
  args: { defaultValue: "標準", hiddenParams: { sort: "newest", view: "compact" } },
};

/** 送信ボタンの文言を変える場合。 */
export const WithSubmitLabel: Story = { args: { submitLabel: "絞り込む" } };

/** query の名前を変える場合。既定は `q`。 */
export const WithCustomName: Story = { args: { name: "keyword" } };
