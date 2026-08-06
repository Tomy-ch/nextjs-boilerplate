import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TextHighlight } from "./text-highlight";

const SAMPLE_TEXT =
  "検索した語が本文のどこに当たったかを示します。language と Language のように、表記が揺れることもあります。";

const meta = {
  title: "Display/TextHighlight",
  component: TextHighlight,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-96 text-sm leading-7">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextHighlight>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 一致した区間だけを `mark` で強調する基本構成。既定では大文字小文字を区別しない。 */
export const Default: Story = {
  args: { query: "language", text: SAMPLE_TEXT },
};

/** 一致箇所が複数ある場合。本文中のすべての一致を強調する。 */
export const MultipleMatches: Story = {
  args: { query: "本文", text: SAMPLE_TEXT },
};

/** `caseSensitive` を指定した場合。表記が一致する区間だけを強調する。 */
export const CaseSensitive: Story = {
  args: { caseSensitive: true, query: "Language", text: SAMPLE_TEXT },
};

/** 複数の語を渡した場合。いずれかに一致した区間をすべて強調する。 */
export const MultipleTerms: Story = {
  args: { query: ["検索", "表記"], text: SAMPLE_TEXT },
};

/** 語に正規表現の記号を含む場合。記号は文字そのものとして扱う。 */
export const RegExpCharacters: Story = {
  args: { query: "a+b", text: "式 a+b と a*b は別のものです。a+b をそのまま探します。" },
};

/** 一致しない場合。本文をそのまま表示する。 */
export const NoMatch: Story = {
  args: { query: "該当なし", text: SAMPLE_TEXT },
};

/** 語が空の場合。強調しないことを表し、本文をそのまま表示する。 */
export const EmptyQuery: Story = {
  args: { query: "", text: SAMPLE_TEXT },
};

/** 本文の見た目を呼び出し元が指定する場合。`span` の属性はそのまま渡せる。 */
export const InheritsTextStyle: Story = {
  args: {
    className: "font-medium text-muted-foreground",
    query: "本文",
    text: SAMPLE_TEXT,
  },
};
