# rich-text

未検査の HTML 文字列を、表示してよい範囲だけに絞った木へ変換する sanitize port です。

表示側が受け取れる値の構築経路を `SanitizedRichText.from()` だけに絞ることで、sanitize を通っていない HTML が UI へ到達しえない状態を型で保証します。

## 公開 API

- `SanitizedRichText` / `SanitizedRichText.from()` — HTML 文字列を parse・sanitize した Value Object。`root` に検査済みの hast root ノードを持つ
- `RICH_TEXT_SANITIZE_SCHEMA` — allowlist から導出した sanitize schema
- `RICH_TEXT_TAG_NAMES` / `RICH_TEXT_BLOCK_TAG_NAMES` / `RICH_TEXT_INLINE_TAG_NAMES` — 通すタグの集合
- `RICH_TEXT_LINK_PROTOCOLS` — `href` に通すプロトコル
- `RICH_TEXT_STRIPPED_TAG_NAMES` — 内容ごと取り除くタグ
- `toRichTextRoot()` — hast のノードを root ノードへ揃える正規化

## allowlist

| 区分 | 通すもの |
| --- | --- |
| ブロック | `p` `h2` `h3` `h4` `ul` `ol` `li` `blockquote` `hr` |
| インライン | `strong` `em` `s` `code` `a` `br` |
| 属性 | `a` の `href` のみ |
| `href` のプロトコル | `http` `https` `mailto` |

`h1` を通さないのは、本文の見出しが page の `h1` と競合するためです。`li` は `ul` / `ol` の中にあるときだけ残ります。

allowlist 外のタグは中身を残して展開されます。テキストの子要素がそのまま本文へ混ざる `script` / `style` だけは `RICH_TEXT_STRIPPED_TAG_NAMES` で内容ごと取り除きます。

相対 URL（`/path` `#anchor` `?query`）は `href` に残ります。プロトコルの検査は絶対 URL に対して行うという sanitize 側の仕様です。

## 利用例

```ts
import { SanitizedRichText } from "@/model/rich-text/sanitized-rich-text";

const content = SanitizedRichText.from(rawHtml);
```

構築した値は `RichTextContent` へ渡して描画します。`root` は hast のオブジェクトであり、HTML 文字列へ戻す経路を持ちません。

## 実装の要点

parse は `hast-util-from-html`（内部で `parse5`）が仕様準拠で行い、検査は `hast-util-sanitize` が木に対して行います。文字列を正規表現で書き換える sanitize と違い、parser の解釈差を検査の前後で持ち込みません。

`RICH_TEXT_SANITIZE_SCHEMA` は schema の全項目を明示します。`hast-util-sanitize` は未指定の項目を既定 schema で補完するため、明示しないと上流の既定が広がったときに通過範囲が黙って広がります。

## 実装を差し替えるとき

sanitize の実装は `hast-util-from-html` / `hast-util-sanitize` の 2 本に閉じています。**この port が守るのは「木に対して検査する」ことであり、どの実装で行うかではありません。** hast と unist は公開仕様なので、実装を替えても `SanitizedRichText` の契約は変わりません。

乗り換え先は `sanitize-html` + `html-react-parser` です。allowlist はライブラリ固有の形式へ書き直すことになりますが、HTML 文字列を経由せず React 要素へ渡す設計はそのまま組めます。

差し替えを検討する条件は一つです。**現在の 2 本のいずれかに `high` 以上の advisory が出て、上流が反応しないとき。** その場合は ADR [0004](../../../docs/adr/0004-library-management.md) の応答期限に従います。上流が更新を止めていること自体は条件になりません。この port は仕様準拠の parse を経てから木を検査するため、成熟して変更が止まることは劣化ではないからです。

`dangerouslySetInnerHTML` を使う実装へは戻しません（[`docs/rules.md`](../../../docs/rules.md) の禁止と biome `noDangerouslySetInnerHtml`）。文字列を経由する sanitizer は、sanitizer とブラウザの解釈差そのものが攻撃面になります。

## 境界

- バックエンドが所有する業務ルールを持たない
- fetch・config を参照しない
- 描画しない。React 要素への変換は `components` の `RichTextContent` が担う
- HTML 文字列を出力しない

## allowlist を広げるとき

allowlist・editor の extension 集合・test は 1 組です。「editor が出せるタグ ⊆ sanitizer が通すタグ」を保つため、片方だけを変更しません。

## 制約

`SanitizedRichText` は class instance であり serializable ではないため、Client Component の props へ直接渡せません。`root` を取り出せば渡せますが、その時点で「sanitize 済みである」ことの型保証は失われます。
