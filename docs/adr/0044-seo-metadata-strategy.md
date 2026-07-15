# SEO / メタデータ戦略

表示層 boilerplate における **メタデータの体系(App Router Metadata API)/ クローラ制御(`sitemap.ts` / `robots.ts`)/ canonical・alternates / 構造化データ(JSON-LD)/ アイコン体系** の規約を定める。Next.js 16 組込みの Metadata 機構を追認し、最小の運用ルールを敷く。具体値(タイトル文言・URL 一覧・schema.org type)は用途依存として fork 先 / 実装 PR に委ねる。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([決定 5](../plan/pre-implementation-decisions.md))。本 ADR の内容自体はユーザ決定済み(Tier 5 = C 枠の網羅性補完)。日付 2026-07-13。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

C 系(Tier 5)の当初列挙(C1〜C6 = [0121](0121-i18n-strategy.md)〜[0043](0043-middleware-policy.md))は、i18n / a11y / パフォーマンス / ブラウザサポート / フォント・画像 / Middleware を拾っていたが、**表示層 boilerplate の中心的関心事である SEO / メタデータの体系が丸ごと欠落**していた(敵対的レビューで判明。2026-07-13)。[0045](0045-fonts-and-images.md)(フォント・画像)は動的 OG 画像(`ImageResponse` / `opengraph-image`)と `public/` の favicon を**画像アセットの生成手段として断片的に**扱うが、head 要素・クローラ制御・canonical・構造化データを含む**メタデータの体系は別軸**であり未成文だった。本 ADR がその穴を埋める。

実装前に `node_modules/next/dist/docs/` を確認した結果、以下は Next.js 16 の第一級のファイル規約 / API として実在する(AGENTS.md「This is NOT the Next.js you know」):

- **Metadata API**: route セグメントで静的 `metadata` export または動的 `generateMetadata` を宣言すると、Next.js が `<head>` 要素を自動生成する
- **ファイルベース metadata**: `app/` 直下の `sitemap.(xml|ts)` / `robots.(txt|ts)` / `icon.*` / `apple-icon.*` / `manifest.*` / `opengraph-image.*` 等。特殊 Route Handler として既定でキャッシュされる(request-time API / dynamic config 使用時を除く)
- **大規模 sitemap**: `generateSitemaps` で分割生成
- **Proxy 交点(重要)**: 公式ドキュメントは「`proxy.ts` と併用する場合、メタデータファイルを Proxy の対象外とせよ」と明示。`proxy.ts`([0043](0043-middleware-policy.md))を導入する場合の交点となる(0043 は proxy を薄い境界に限る方針までを定め、除外設定の具体は実装時)

## 決定

### 1. メタデータ = App Router Metadata API を既定

- head メタデータ(title / description / OpenGraph / Twitter / robots meta 等)は **App Router の Metadata API** で宣言する。**`<head>` の手書き・`next/head` は使わない**
  - 静的に決まるものは **静的 `metadata` export**、リクエスト / パラメータ依存のものは **`generateMetadata`** を使い分ける
- ルート([`src/app/layout.tsx`](0027-directory-structure.md))に **`metadataBase` と `title.template`(サイト共通のタイトル雛形)の既定土台**を置く。各セグメントはそこからの差分だけを宣言する(重複定義を避ける)
- 具体的なタイトル文言・description・OG 画像割当は**用途依存**のため、雛形の枠のみ boilerplate 本体で持ち、値は fork 先 / feature 実装 PR で確定する

### 2. クローラ制御 = `sitemap.ts` / `robots.ts`(Next.js 規約)

- サイトマップは **`app/sitemap.(xml|ts)`**、クローラ制御は **`app/robots.(txt|ts)`** で Next.js 規約に従い生成する(独自の静的ファイル配置・手書き XML 生成を作らない)。URL 数が多い場合は **`generateSitemaps`** で分割する
- 収録 URL・`Disallow` パス・`changefreq` 等の**具体内容は用途依存**(ルート構成に従属)のため fork 先 / 実装 PR で確定。boilerplate 本体は仕組み(このファイル規約を使う方針)を定める

### 3. canonical / alternates

- 正規 URL・言語 alternates は Metadata API の **`alternates.canonical` / `alternates.languages`** で宣言する(手書き `<link rel="canonical">` を置かない)。i18n の alternates は [0121](0121-i18n-strategy.md) 採用時にこの seam へ載る

### 4. 構造化データ(JSON-LD)

- 構造化データ(schema.org / JSON-LD)は**採用可**とし、必要な feature の実装 PR で埋め込む(Next.js 推奨どおり、コンポーネント内で JSON-LD の `<script type="application/ld+json">` を描画)。**採否・schema.org type は用途依存**のため boilerplate 本体では型を固定せず、枠のみ示す

### 5. アイコン体系(`icon.*` / `apple-icon.*` と `public/` favicon の役割分担)

- **生成 / 複数解像度のアイコンは Next.js の metadata ファイル規約**(`app/icon.*` / `apple-icon.*`)を用いる。**単純な静的 favicon は `public/`**([0045](0045-fonts-and-images.md))に置く。両者の役割分担を本 ADR で明示する(0045 は「画像アセットとしての favicon」、本 ADR は「メタデータ体系としてのアイコン」)

### 6. Proxy との交点

- `proxy.ts`([0043](0043-middleware-policy.md))を導入する場合、**メタデータファイル(`sitemap` / `robots` / `icon` / `opengraph-image` 等)を Proxy の対象外とする**必要がある(Next.js 公式の good-to-know。メタデータの配信を Proxy が横取りしないため)。除外設定の具体(`proxy.ts` 側の対象パス制御)は proxy を導入する実装 PR で行う(0043 は proxy を薄い境界に限る方針を定めるに留まる)

## 責務境界(0045 との切り分け)

| 関心事 | 所在 |
| --- | --- |
| メタデータ体系(head 要素・title.template・metadataBase・canonical・robots meta) | **本 ADR(0044)** |
| クローラ制御(`sitemap.ts` / `robots.ts`)・構造化データ | **本 ADR(0044)** |
| 動的 OG 画像(`ImageResponse` / `opengraph-image`)の**生成手段** | [0045](0045-fonts-and-images.md)(本 ADR は「どの OG を割り当てるか」= Metadata 側) |
| 静的 favicon の `public/` 配置 | [0045](0045-fonts-and-images.md)(本 ADR は生成 / 複数解像度アイコン規約) |

## 禁止事項

- ❌ `<head>` の手書き / `next/head` の使用(Metadata API を使う)
- ❌ 同一メタデータを複数箇所で重複定義すること(root の `title.template` / `metadataBase` を土台に差分宣言)
- ❌ `sitemap` / `robots` を独自の静的配置・手書き生成で実装すること(Next.js のファイル規約 `app/sitemap.ts` / `app/robots.ts` を使う)
- ❌ 手書き `<link rel="canonical">` を置くこと(`alternates.canonical` を使う)
- ❌ `proxy.ts` でメタデータファイルを巻き込むこと(Proxy の対象外とする)
- ❌ 用途依存の具体値(タイトル文言・収録 URL・JSON-LD type)を boilerplate 本体で固定すること(枠のみ・値は fork 先)

## 関連 ADR

- [0045-fonts-and-images.md](0045-fonts-and-images.md)(C5)— OG 画像生成 / `public/` favicon(本 ADR と責務境界を共有)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md)(A4)— App Router / Metadata API / 特殊ファイルの土台
- [0028-naming-convention.md](0028-naming-convention.md)(A6)— `sitemap` / `robots` / `opengraph-image` 等の特殊ファイル命名
- [0043-middleware-policy.md](0043-middleware-policy.md)(C6)— `proxy.ts` 導入時にメタデータファイルを Proxy の対象外とする交点
- [0121-i18n-strategy.md](0121-i18n-strategy.md)(C1)— 言語 alternates(i18n 採用時に本 ADR の canonical/alternates seam へ載る)
- [0101-performance-budget.md](0101-performance-budget.md)(C3)— メタデータ / OG は SEO・共有体験に直結
