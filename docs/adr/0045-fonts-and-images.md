# フォント・画像

フォントと画像の **`next/font` / `next/image` の使い方 / `public/` の扱い / 動的 OG 画像** の規約を定める。Next.js 組込み機構を追認し、最小の運用ルールを敷く。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([決定 5](../plan/pre-implementation-decisions.md))。本 ADR の内容自体はユーザ決定済み(Tier 5)。日付 2026-07-13。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

BACKLOG C5 は、`next/font` / `next/image` の使い方規約・`public/` の扱い・動的 OG 画像を未決としていた。本 ADR は Next.js 組込み機構を既定とする方針を定める。

## 決定

### 1. フォント = `next/font`

- Web フォントは **`next/font`** で読み込む(セルフホスト・レイアウトシフト抑制・`preload`)。外部 CDN からの直接読み込みや手動 `@font-face` は避ける
- フォント定義の適用は `src/app/layout.tsx`(ルート)を基点とする([0027](0027-directory-structure.md))

### 2. 画像 = `next/image`

- ラスター画像は **`next/image`** を用いる(最適化・遅延読み込み・レイアウトシフト抑制)。生の `<img>` は原則使わない(装飾的 SVG 等の例外は可)
- 配送前提([0011](0011-no-docker.md))に応じて画像最適化の loader を選ぶ(PaaS の組込み最適化 / 静的書き出し時の扱いは実装 PR で確定)

### 3. `public/` の扱い

- `public/` は **静的アセット(favicon / 装飾画像 / 静的ファイル)** の置き場とする([AGENTS.md](../../AGENTS.md) AI Modification Scope で追加が許可される数少ないルート外パス)。ビルドを要さず配信されるものに限る
- コンポーネントに結合する画像は **static import して `next/image` に渡す**のを推奨する(幅・高さ・`blurDataURL` が自動決定され CLS 防止に載る)。`public/` のパス文字列を `next/image` に渡す場合も最適化自体はされるが、`width` / `height` の手動指定が必要になる。`next/image` を介さない直リンク参照は最適化に載らない

### 4. 動的 OG 画像

- 動的 OG 画像は Next.js の **`ImageResponse`(`opengraph-image` 特殊ファイル)** で生成する([0028](0028-naming-convention.md) の特殊ファイル命名)。メタデータ全般は [0044](0044-seo-metadata-strategy.md) が所有する App Router の Metadata API で扱う

## 禁止事項

- ❌ Web フォントを外部 CDN 直参照 / 手動 `@font-face` で読むこと(`next/font` を使う)
- ❌ ラスター画像に生の `<img>` を使うこと(`next/image`。装飾 SVG 等は例外)
- ❌ `public/` にビルドを要する / 秘匿すべきファイルを置くこと(静的公開アセットのみ)

## 関連 ADR

- [0044-seo-metadata-strategy.md](0044-seo-metadata-strategy.md)(C7)— SEO / メタデータ戦略(OG 画像・メタデータの所有者。責務境界を共有)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md)(A4)— App Router / Metadata API / 特殊ファイル
- [0027-directory-structure.md](0027-directory-structure.md)(A5)— `src/app/` / `public/` 配置
- [0028-naming-convention.md](0028-naming-convention.md)(A6)— `opengraph-image` 等の特殊ファイル命名
- [0011-no-docker.md](0011-no-docker.md) — 配送前提(画像最適化 loader の選択)
- [0101-performance-budget.md](0101-performance-budget.md)(C3)— フォント / 画像は CWV(LCP / CLS)に直結
