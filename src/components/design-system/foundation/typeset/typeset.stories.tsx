import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "Foundation/Typeset",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Markdown から得た一般的な HTML 要素の組版例。 */
export const Docs: Story = {
  render: () => (
    <article className="typeset typeset-docs max-w-2xl">
      <h1>ドキュメントの書き方</h1>
      <p>
        このページでは、読みやすい文書を作るための基本的な要素を紹介します。詳細は
        <a href="https://github.com/">GitHub</a>をご確認ください。
      </p>
      <h2>基本方針</h2>
      <ul>
        <li>見出しで内容を区切り、必要な情報へすばやく到達できるようにします。</li>
        <li>短い段落とリストを使い、読み進める負担を抑えます。</li>
      </ul>
      <blockquote>重要な補足は引用として本文から視覚的に区別します。</blockquote>
      <pre>
        <code>{'const heading = "ドキュメントの書き方";'}</code>
      </pre>
      <div className="typeset-scroll">
        <table>
          <thead>
            <tr>
              <th>要素</th>
              <th>用途</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>見出し</td>
              <td>内容の構造化</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  ),
};

/** `not-typeset` を指定した subtree は組版の対象外にする。 */
export const OptOut: Story = {
  render: () => (
    <article className="typeset typeset-docs max-w-2xl">
      <p>この段落には typeset が適用されます。</p>
      <div className="not-typeset rounded-md border border-border p-4">
        <p>この領域とその子孫には typeset を適用しません。</p>
      </div>
    </article>
  ),
};
