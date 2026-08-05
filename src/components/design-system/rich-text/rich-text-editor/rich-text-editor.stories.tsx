import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useState } from "react";

import { Marker, MarkerContent } from "../../display/marker/marker";
import { RichTextEditor } from "./rich-text-editor";

const SAMPLE_HTML = [
  "<h2>用途</h2>",
  "<p>見出し・箇条書き・引用・リンクまでを、書いたとおりの形で保存できます。</p>",
  "<ul><li><p><strong>太字</strong>と<em>斜体</em>と<s>打ち消し線</s></p></li>",
  "<li><p>行内の<code>code</code></p></li></ul>",
  '<blockquote><p>引用は <a href="https://example.com">出典</a> を添えて書きます。</p></blockquote>',
  "<hr>",
  "<h3>制限</h3>",
  "<p>表・画像・コードブロック・下線は書けません。</p>",
].join("");

function RichTextEditorFixture({
  defaultValue,
  disabled,
}: {
  defaultValue?: string;
  disabled?: boolean;
}) {
  const [html, setHtml] = useState(defaultValue ?? "");
  const handleChange = useCallback((value: string) => setHtml(value), []);

  return (
    <div className="flex flex-col gap-4">
      <RichTextEditor
        defaultValue={defaultValue}
        disabled={disabled}
        label="説明"
        onChange={handleChange}
      />
      <section className="flex flex-col gap-2">
        <Marker>
          <MarkerContent>
            呼び出し元へ渡される HTML です。保存も送信もこの component は行いません。
          </MarkerContent>
        </Marker>
        <pre className="whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">{html}</pre>
      </section>
    </div>
  );
}

const meta = {
  title: "Rich Text/RichTextEditor",
  component: RichTextEditor,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "書式付きの本文を書く client island です。内容が変わるたびに HTML 文字列を呼び出し元へ渡すところまでを担い、",
          "保存・送信・検証は持ちません。各 story の HTML 表示は callback を目に見える形にするための確認用で、",
          "component の一部ではありません。",
          "書けるタグは sanitizer の allowlist に収めてあります。表示するときは `SanitizedRichText.from` を通し、",
          "`RichTextContent` で描画します。",
        ].join(""),
      },
    },
  },
  args: { label: "説明", onChange: () => undefined },
} satisfies Meta<typeof RichTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 何も書かれていない状態。toolbar の操作と入力から書き始める。 */
export const Default: Story = { render: () => <RichTextEditorFixture /> };

/** 保存済みの内容を編集する場合。書ける書式をひととおり含む。 */
export const WithContent: Story = {
  render: () => <RichTextEditorFixture defaultValue={SAMPLE_HTML} />,
};

/** 送信中や権限が無いときなど、読み取り専用にする場合。toolbar の操作も効かない。 */
export const Disabled: Story = {
  render: () => <RichTextEditorFixture defaultValue={SAMPLE_HTML} disabled />,
};

/**
 * allowlist の外にあるタグを初期値へ渡した場合。
 *
 * `h1` と `table` と `script` は読み込みの時点で落ち、中身のテキストだけが残る。
 */
export const OutsideAllowlist: Story = {
  render: () => (
    <RichTextEditorFixture
      defaultValue={
        "<h1>h1 は見出しにならない</h1><table><tr><td>表は残らない</td></tr></table><p>段落は残る</p>"
      }
    />
  ),
};
