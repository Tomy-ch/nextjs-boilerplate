import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import type { ComponentProps } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

import { cn } from "@/components/cn";
import type { SanitizedRichText } from "@/model/rich-text/sanitized-rich-text";

/**
 * {@link RichTextContent} が受け取る props です。
 *
 * `children` と `dangerouslySetInnerHTML` は受け取りません。本文は `content` だけが決めます。
 * `content` の名前は本文の props が占めるため、native `div` の RDFa 属性としては指定できません。
 */
export type RichTextContentProps = Omit<
  ComponentProps<"div">,
  "children" | "content" | "dangerouslySetInnerHTML"
> & {
  /** 表示するリッチテキスト。sanitize を通した値だけがこの型を持ちます。 */
  content: SanitizedRichText;
};

/**
 * sanitize 済みのリッチテキストを本文として表示する。
 *
 * @remarks
 * 受け取れるのは {@link SanitizedRichText} だけで、HTML 文字列を受け取りません。sanitize を
 * 経ていない値はこの型を構築できないため、この component が未検査の HTML の入口になりません。
 * 描画も HTML 文字列を経由せず、木から React 要素を直接作ります。
 *
 * 書く側の相方は `RichTextEditor` で、この component は表示だけを担います。editor が返した
 * HTML 文字列を検証済みとして扱わず、表示のたびに `SanitizedRichText.from` を通します。
 *
 * 組版は `typeset` の CSS 基盤が持ちます。既定は `.typeset` だけを付けるため、preset を効かせる
 * 場合は `className` へ `typeset-docs` などの preset class を渡します。
 *
 * 描画するのは `div` 一つで、`article` や `section` などの意味論は持ちません。文書としての
 * 位置付けが要る場合は呼び出し元が外側の要素で与えます。見出しは allowlist が `h1` を落とすため
 * `h2` から始まり、page の `h1` と競合しません。
 *
 * 本文中の link は native の `a` として描画されるため、内部 link でもページ全体の遷移になります。
 *
 * 本文が空の場合は空の枠を描画します。「本文がない」ことを伝える表示は持ちません。
 *
 * Server Component として使えます。hydration は不要です。`content` は serializable でないため
 * Client Component の props へは渡せず、Client Component の内側へ置く場合は描画した結果を
 * `children` として渡します。
 *
 * @example
 * ```tsx
 * import { RichTextContent } from "@/components/design-system/rich-text/rich-text-content/rich-text-content";
 * import { SanitizedRichText } from "@/model/rich-text/sanitized-rich-text";
 *
 * <RichTextContent content={SanitizedRichText.from("<p>本文</p>")} />
 * ```
 *
 * @example
 * 組版 preset を重ね、文書としての意味論を外側で与える。
 * ```tsx
 * <article aria-labelledby="body-heading">
 *   <h2 id="body-heading">説明</h2>
 *   <RichTextContent className="typeset-docs" content={SanitizedRichText.from(html)} />
 * </article>
 * ```
 *
 * @param props - `content` のほかは native `div` 属性。
 * @param props.content - 表示するリッチテキスト。
 *
 * @see Storybook `Rich Text/RichTextContent`
 */
export function RichTextContent({ content, className, ...props }: RichTextContentProps) {
  return (
    <div className={cn("typeset", className)} data-slot="rich-text-content" {...props}>
      {toJsxRuntime(content.root, { Fragment, jsx, jsxs })}
    </div>
  );
}
