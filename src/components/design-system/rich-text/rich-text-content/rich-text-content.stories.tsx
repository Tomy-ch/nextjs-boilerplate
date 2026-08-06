import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SanitizedRichText } from "@/model/rich-text/sanitized-rich-text";

import { RichTextContent } from "./rich-text-content";

const FULL_HTML = `
<h2>取り扱いについて</h2>
<p>
  この段落には<strong>強調</strong>、<em>斜体</em>、<s>取り消し線</s>、<code>inline code</code> が
  含まれます。詳細は<a href="https://example.com/">案内ページ</a>をご確認ください。
</p>
<h3>使い方</h3>
<ul>
  <li>箇条書きの項目です。</li>
  <li>複数行にわたる説明も同じ rhythm で並びます。</li>
</ul>
<h4>手順</h4>
<ol>
  <li>最初に行うことです。</li>
  <li>次に行うことです。</li>
</ol>
<blockquote>引用は本文から視覚的に区別されます。</blockquote>
<hr />
<p>区切りのあとの段落です。<br />強制改行のあとに続きます。</p>
`;

const meta = {
  title: "Rich Text/RichTextContent",
  component: RichTextContent,
  parameters: { layout: "padded" },
  // 木を Controls から編集させない。sanitize を通った値だけがこの props に立つ。
  argTypes: { content: { control: false } },
  args: { content: SanitizedRichText.from(FULL_HTML) },
} satisfies Meta<typeof RichTextContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** allowlist が通すブロックとインラインの全種類。組版は `.typeset` が与える。 */
export const Default: Story = {};

/** `typeset-docs` preset を `className` で重ねた状態。既定の `.typeset` より字が小さくなる。 */
export const DocsPreset: Story = {
  args: { className: "typeset-docs" },
};

/** 本文が空の状態。空であることを伝える表示は持たず、呼び出し元が `FeedbackState` などで示す。 */
export const Empty: Story = {
  args: { content: SanitizedRichText.from("") },
};
