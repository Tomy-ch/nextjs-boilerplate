---
test-requirement: [unit, component]
coverage-exclusions:
  - "docs-viewer/src/main.tsx"
---

# docs-viewer

ドキュメントポータルのビューアーです。アプリ本体とは**別パッケージ**で、Next.js のランタイムには
乗らず、静的サイトとして単体でビルドされて GitHub Pages へ配信されます
（[ADR 0141](../docs/adr/0141-portal-operations.md)）。

読み込む `docs.json` は生成物で、`docs/portal/manifest.yaml` を単一ソースとして `scripts/portal/`
が組み立てます。ビューアーは内容の出所を持たず、生成物を描くだけです。

## なぜ別パッケージなのか

**無害化の許容範囲が違うからです。** アプリ本体が扱うのは利用者が投稿する内容で、
[`model/rich-text`](../src/model/rich-text/README.md) の allowlist は `table` も `pre` も `class`
属性も通しません。それが設計意図です。

一方このビューアーが描くのは、リポジトリ自身が持つコミット済みのドキュメントです。表・コード
ブロック・図が出せなければ用を成しません。同じ repo に広い allowlist と狭い allowlist を並べると、
**広い方をアプリ側から import することを止めるものが規約しか無くなります**。パッケージを分けると、
広い allowlist はアプリから到達できません。分離をパッケージ境界で担保するための構成です。

依存も共有しません。アプリ本体の `package.json` とこのパッケージの `package.json` は別物で、
ビューアーが引いた依存がアプリの供給面に乗ることはありません。

## テストの責務

frontmatter が `test-requirement: [unit, component]` と 2 つ挙げるのは、この配下が両方を抱える
ためです（[0090](../docs/adr/0090-testing-strategy.md)）。文書の解釈・整形・検索・経路は純粋
ロジックとして確かめ、描画する部品は React Testing Library で確かめます。どちらを負うかは対象が
描画を返すかで決まります。

## デザインシステムとの関係

UI は [`src/components/design-system`](../src/components/README.md) の部品で組みます。
**コピーせず、`@` alias でアプリ本体のソースを直接参照します。** コピーすると乖離した時点で、
実運用の画面でデザインシステムを検証するという目的が失われるためです。

このビューアーはデザインシステムにとって最初の実利用者であり、Storybook の中だけでは出てこない
負荷（実データ量・実文書長・実際の組み合わせ）を掛ける役割を持ちます。

## 構成

| ディレクトリ | 役割 |
| --- | --- |
| `src/docs-json/` | 生成物 `docs.json` のスキーマと読み取り。形の不一致は配信事故として例外にする |
| `src/lang-filter/` | 表示言語での絞り込み。JA の実体が無い section は EN へ落とし、section 内で言語が混ざらないようにする |
| `src/search/` | 検索コーパスの組み立て。所属する section / group 名を項目へ畳み込む |
| `src/hash-route/` | 位置ハッシュ `#/<group>/<section>` の解釈と組み立て |

## 運用

- **依存は極力単独で完結する部品に寄せる**。このビューアーは go-boilerplate 側へ輸出する前提が
  あり、引き込んだ依存はそのまま移植コストになる。対に `-native` / `-client` がある部品は、要件が
  許す限り `-native` を優先する
- 純粋ロジック（`docs-json` / `lang-filter` / `search` / `hash-route`）は zod 以外に依存させない。
  輸出時にそのまま持っていける状態を保つ
- Next.js 固有 API（`next/link` / `next/image` / Server Components）は使わない
