---
imports-allowed: [features, components, capabilities, stores, adapters, errors, logging, config, model, observability] # 生成物。`pnpm gen:architecture` で直す
forbidden: [business-logic, direct-fetch]
test-requirement: route
coverage-exclusions:
  - "src/app/**/page.dev.tsx"
  - "src/app/**/page.tsx"
  - "src/app/fonts.ts"
  - "src/app/icon.tsx"
  - "src/app/apple-icon.tsx"
  - "src/app/opengraph-image.tsx"
---

# app

App Router の driving adapter です。`page.tsx` と `layout.tsx` は feature を薄く呼び出し、route handler は `adapters/server` を介して外部接続します。

## 受け入れるもの

- route segment、route handler、metadata と layout への横断 UI / Provider の mount
- Next.js が規定する特殊ファイルと route segment
- **複数の route group の器が共有する宣言モジュール**（`fonts.ts` / `site.ts`）。route
  要素のどれにも当たらないが、器ごとに書くと片方だけが動く。テストは `unit` として扱う
- **metadata ファイル**（`sitemap.ts` / `robots.ts` / `icon.tsx` / `apple-icon.tsx` /
  `opengraph-image.tsx`）。Next.js の規約で特殊な Route Handler になる（[0044](../../docs/adr/0044-seo-metadata-strategy.md)）。
  宣言は `architecture.ts` の `app-metadata` element が持つ —— 何を挙げるか・何を断るかの判定を持つ
  `sitemap.ts` / `robots.ts` は `unit` として扱い、絵を 1 枚返すだけの 3 つは判定を持たないので単体では
  回さない（`scripts/lib/untested-modules.ts`）。
  絵として返ることと、挙げた URL が実在すること・正規 URL が自分を指すことは、起動したアプリから
  取って見る（`make e2e-metadata`）
- **root layout が mount する計装**（`telemetry.tsx`）。描画するものを持たず、ブラウザ側のシグナルを
  中継へ送り出すだけの client component である。`components` にも `capabilities` にも置けない ——
  どちらも外部への送信を持てないため（[0082](../../docs/adr/0082-client-observability.md)）。
  テストは `component` として扱う
- **root layout が mount する同意の島**（`consent.tsx`）。同意を尋ねる面（`components`）と、同意を
  要する資材のゲートを、1 つの購読の裏で束ねる client component である。`components` にも
  `capabilities` にも置けない —— どちらも `stores` を引けないため
  （[0031](../../docs/adr/0031-policy-state-supply.md)）。テストは `component` として扱う
- **同意の島の裏へ置くタグマネージャ**（`analytics.tsx`）。容器 ID を config から読み、宣言のある
  配備でだけ読み込む client component である。`components` に置けない —— `config` を引けないため。
  テストは `component` として扱う

**shell を通らない画面は、自分で `main` を置く。** route group の外に立つ画面（`not-found.tsx` や
`dev/` の下）は、route group の layout が置く landmark を持たない。包む物が無いと、支援技術
から本文へ直接跳べない。

## 受け入れないもの

- 業務ロジック、画面ユースケースの編成、route segment からの直接 fetch

## この層が持つ判断

route ごとに決まることがここにあります。**そのうちいくつかは、この README にも ADR にも書けません**
—— 画面ごとに違う答えを持つものだからです。答えを書く場所は決まっています。

| 判断 | 宣言する場所 | 答えを持つ文書 |
| --- | --- | --- |
| 殻を配れないこと（`instant = false`） | `page.tsx` / `layout.tsx` | その画面の機能要件（[`docs/spec/route/**`](../../docs/spec/README.md)） + [0041](../../docs/adr/0041-cache-components-decision.md) |
| 待ちの境界（`Suspense` をどこへ掛けるか） | `page.tsx` | 同上 |
| 失敗と不在の面 | `error.tsx` / `not-found.tsx` | 同上 + [0080](../../docs/adr/0080-error-handling.md) |
| metadata | `page.tsx` / `layout.tsx` | [0044](../../docs/adr/0044-seo-metadata-strategy.md) |
| 横断 UI と Provider の mount | `layout.tsx` **だけ** | [0026](../../docs/adr/0026-layout-shell-mount.md) |
| 外部との往復 | `api/**/route.ts` | [0071](../../docs/adr/0071-bff-api-integration.md) / [0025](../../docs/adr/0025-app-layer-elements.md) |

**描くモードを画面が宣言しません。** 殻と穴の分かれ目は器の形 —— 何を `Suspense` の外に置き、
何を内に置くか —— で決まります（[0041](../../docs/adr/0041-cache-components-decision.md)）。
`dynamic` / `revalidate` のような segment config は持ちません。**殻を配れない画面だけが
`export const instant = false` を理由つきで名乗り**、`scripts/render-mode` が prerender の結果と
突き合わせます。

**殻を配れないと判断した理由は仕様書へ書きます。** route の隣の doc コメントだけに置くと、その
画面がいつ描かれるかを文書から辿れなくなります。コードのコメントに残すのは、その場で効く注意
だけです。

**待ちの境界も同じです。** 節ごとに分けるか画面全体で 1 つにするかは、何を同時に待つかで決まる
画面の判断であり、層の既定ではありません。

### metadata の土台と差分

root layout が `metadataBase`（外から見た origin。`config/site`）と `title.template` を置き、索引させ
ない環境では `noindex` も置く。各 segment が宣言するのはそこからの差分で、置くものは決まっている。

| 画面 | 宣言するもの |
| --- | --- |
| 誰でも開け、索引させたい画面 | `title` / `description` / `alternates.canonical`（自分の経路） |
| 認証の要る画面、利用者ごとに中身が変わる画面 | 上に加えて `robots: { index: false, follow: false }`。索引させる環境でも隠す |
| 動的セグメントの画面 | `generateMetadata`。取得の分類を写す判定は feature 側の module に置き、page は薄く呼ぶ |

canonical を root に置かないのは、`alternates` が segment 単位で丸ごと差し替わるためである。root
に置くと、宣言していない画面がすべて `/` を正規 URL として名乗る。

`sitemap.ts` が挙げるのは索引させたい画面だけで、`robots.ts` が断る経路は保護の宣言（`model/authz`）
から採る。どちらも書き写しを持たない。

## boilerplate 導入時の変更点

**サイトの名乗りは `site.ts` が 1 か所で持ちます。** 初期化のコマンドはリポジトリの識別子を書き換え
ますが、ここは触りません。metadata・OG 画像・アイコンが同じ値を読むので、**書き換えないと自分の
サイトが本リポジトリの名前で名乗り続けます。**

| 何を | 既定 | 変更する箇所 |
| --- | --- | --- |
| サイト名 | リポジトリ名と同じ綴り。タイトルの雛形と OG 画像が読む | `site.ts` の `SITE_NAME`。**ラテンの綴りに限る** —— OG 画像を描く既定の書体が和文を持たず、画像の側だけが欠ける |
| サイトの説明 | 本リポジトリ自身を説明する文。root の `description` に載る | `site.ts` の `SITE_DESCRIPTION` |
| アイコンに描く印 | 1 文字 | `site.ts` の `SITE_MONOGRAM`。枠の大きさは描く側が決めるので 1 文字に限る |
| 書体 | 和文は OS 同梱のゴシック、見出しと等幅は同梱の欧文書体 | `fonts.ts` と [`tokens/README.md`](../../tokens/README.md#boilerplate-導入時の変更点) の両方 |

外から見た origin と索引の可否は環境変数で、[`env/README.md`](../../env/README.md#boilerplate-導入時の変更点) が持ちます。`site.ts` が持つのは環境に依らない名乗りだけです。

同意ゲートの裏で読み込むタグマネージャを別のものへ替えるなら、`analytics.tsx` と配信ヘッダの
許可 origin（[`src/config/README.md`](../config/README.md#boilerplate-導入時の変更点)）の両方を
動かします。

## 運用

- **`route` の宣言が掛かるのは route segment の合成（`page.tsx` / `layout.tsx`）です**。
  **Route Handler（`api/**/route.ts`）は `integration` として扱います** ——
  [0090](../../docs/adr/0090-testing-strategy.md) の層別責務表が integration を「HTTP 境界のみ
  （`adapters` の API クライアント / route handler の境界）」と定めており、器の合成ではなく境界の
  検証だからです。実際の書き方も、モジュール境界を `vi.mock` で差し替え、応答の status と形を
  確かめる形になります

- **Server Action（`actions.ts`）は `unit` として扱います** —— 器の合成でも HTTP 境界でもなく、
  **値を返す対象**だからです（[0090](../../docs/adr/0090-testing-strategy.md) の軸は subject が
  何を返すかで決まり、`正常系` / `異常系` のコメント区切りで割ります）。書き方は、主体を断言する
  session と呼び先の adapter をモジュール境界で差し替え、**返した `ActionState` の分類・成立時の
  再検証・送り先**を確かめる形になります。HTTP の往復は adapter 側のテストが持つので、ここでは
  持ちません

- **受け口の本体を隣へ出したモジュールは `unit` として扱います** —— `route.ts` / `actions.ts` が
  薄い口に留まり、判断と組み立てを隣のモジュールへ委ねた場合、そのモジュールは呼び出し元を問わず
  `unit` です。判定は**応答（`Response` とステータスコード）の組み立てを持つかどうか**で、持たずに
  値を返すならこちらに当たります（`dev/session/authorize-development-session.ts`）。`Request` を
  引数に取るかどうかでは決まりません —— 受け取っていても、返すのが値なら軸は
  `正常系` / `異常系` です

- 層をまたぐ import は `@/*` alias を使う
- 役割を示さない `common`、`shared`、`utils`、`lib` 等の置き場は作らない
- 単一 feature 専用のコードは `features/<name>/` に置く
- 横断 UI と Provider を mount してよいのは `layout.tsx` だけで、`page.tsx` は feature のみを呼ぶ。mount は**配置だけ**を意味し、layout で hook を呼んでデータを組むことは含まない
- root layout は横断通知の Provider を mount する。通知を出す側は `useToast()` を呼ぶだけでよく、queue の state も dismiss の配線も持たない。ただし 1 画面で完結する表示状態を、ここを経由してグローバルへ持ち上げない
- metadata は Metadata API で宣言する。`<head>` の手書きと `next/head` は使わない。土台と差分の割り当ては「metadata の土台と差分」が持つ
- **route segment は描画の span を持たない。** Next.js が `render route (app)` を張るので、同じ範囲を二重に持たない。画面の中の帰属は feature 層の最上位が持つ（[observability/README.md](../observability/README.md)）

## 監査の観点

| 観点 | 判定の形 | 根拠 |
| --- | --- | --- |
| `forbidden: business-logic` — どの element も、契約が返さない値の計算・業務の判定・重い集約を持たない。`error.tsx` / `not-found.tsx` / `loading.tsx` も同じ | violation。持っているのが表示のための整形か業務の判定かが読み分けられないときは suggestion | [0021](../../docs/adr/0021-frontend-responsibility.md)「カーネル受入基準」4 / [0025](../../docs/adr/0025-app-layer-elements.md) 禁止事項 / [0070](../../docs/adr/0070-backend-role-separation.md) 禁止事項 / [0080](../../docs/adr/0080-error-handling.md) 禁止事項 |
| `forbidden: direct-fetch` — route segment は `fetch` も `adapters` の取得の口も呼ばない。取得は feature が持つ。例外は入口の保護（`adapters/server/auth` の `verifySession()` を呼び、`model` の述語で判定し、`redirect()` する）だけ。Route Handler も生の `fetch` を持たず `adapters` を通す | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) 依存マトリクス / [0025](../../docs/adr/0025-app-layer-elements.md) element 表と禁止事項 / [api/README.md](api/README.md)「受け入れないもの」 |
| route segment の `observability` は計装の mount だけ —— root layout がアクティブな span の trace 相関を取り出し、mount する client component へ渡す。span を作る・記録する用途で引かない | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) 依存マトリクスの注記 / [0025](../../docs/adr/0025-app-layer-elements.md)「import 先の集合として書けないもの」。機械は届かない（`route-segment` は要素として宣言していない） |
| route segment が直に読む `config` は、Next.js の規約が route segment に置くことを要求する値だけ（metadata が読む `config/site`、画面が「いま」として読む `config/clock`）。それ以外の `*.server.ts` を route segment が import しない。本番の束に載らない `page.dev.tsx` の直読は 0025 が記録する既知の形で、対象外 | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) Enforcement / [0025](../../docs/adr/0025-app-layer-elements.md) 禁止事項 / [config/README.md](../config/README.md)「運用」。機械は届かない |
| Server Action（`src/app/**/actions.ts`）は、export する action ごとに内側で `adapters/server/auth` の断言を呼ぶ。描画した画面が保護されていることに依拠しない | 呼び出しが無ければ violation。呼んでいるが、役割・所有の判定として足りているかは suggestion | [0025](../../docs/adr/0025-app-layer-elements.md) 禁止事項 / [0021](../../docs/adr/0021-frontend-responsibility.md)「Server Action の置き場」/ [docs/rules.md](../../docs/rules.md)「認可と入口」 |
| Server Action は `server config`（`*.server.ts`）を読まない。`NEXT_PUBLIC_` の公開定数（`*.client.ts`）は読んでよい | violation | [0025](../../docs/adr/0025-app-layer-elements.md) 禁止事項と「この表のどこまでが機械で強制されるか」。機械は `config` を層の粒度でしか見ず、この区別は届かない |
| Route Handler は中継と入出力の検証だけを持つ薄い proxy で、Node runtime に留まる。分類から status と本文を組むのは `adapters/server/http` の口で、handler の中で組み立てない | runtime の宣言を変えていれば violation。応答を handler の中で組み立てていれば suggestion | [0025](../../docs/adr/0025-app-layer-elements.md) element 表 / [docs/rules.md](../../docs/rules.md)「層境界と依存」/ [api/README.md](api/README.md)「失敗の返し方」 |
| route segment の器（`layout` / `page` / `template` / `default`）に `"use client"` を置かない | violation | [docs/rules.md](../../docs/rules.md)「層境界と依存」。機械: ESLint `no-restricted-syntax`（`eslint.config.ts`） |
| 横断 UI と Provider を mount するのは `layout.tsx` だけで、mount は配置だけを意味する。`page.tsx` は feature を呼ぶだけで、layout は hook を呼んでデータを組まない | violation | [0026](../../docs/adr/0026-layout-shell-mount.md) 禁止事項 / この README「運用」 |
| segment config（`dynamic` / `revalidate` 等）を持たない。殻を配れない画面だけが `export const instant = false` を名乗る | violation | この README「この層が持つ判断」/ [0041](../../docs/adr/0041-cache-components-decision.md) |
| metadata は Metadata API で宣言し、`<head>` の手書きと `next/head` を使わない。各 segment は「metadata の土台と差分」の表が定める差分を宣言する | 手書きの `<head>` / `next/head` は violation。表が求める差分（`alternates.canonical`、認証の要る画面の `robots`）の欠落は suggestion | この README「metadata の土台と差分」「運用」/ [0044](../../docs/adr/0044-seo-metadata-strategy.md) |

## 関連する ADR

この層のコードが依存する決定です。**コメントからは ADR を直接指さず、この節を辿ります** ——
ADR は番号も節も動くので、動いたことに気づける場所を 1 つに寄せています（[docs/rules.md](../../docs/rules.md)
「コメントと文書」）。要素ごとに依存先が違うので、要素で分けます。

### 層全体

- [0025](../../docs/adr/0025-app-layer-elements.md) — この層の element（route segment / route handler / server action / metadata）と、それぞれが持てるもの
- [0090](../../docs/adr/0090-testing-strategy.md) — 層別の検証責務（`route` / `integration` / `unit` の割り当て）

### route segment（`page.tsx` / `layout.tsx` / `error.tsx` / `not-found.tsx`）

- [0040](../../docs/adr/0040-routing-rendering-strategy.md) — App Router の採用と、描画のモードを boilerplate として強制しないこと
- [0041](../../docs/adr/0041-cache-components-decision.md) — Cache Components（PPR）の採否。殻と穴の分け方
- [0026](../../docs/adr/0026-layout-shell-mount.md) — 横断 UI と Provider を mount してよいのは layout だけ
- [0079](../../docs/adr/0079-auth-frontend-seam.md) — 入口の前捌きと、画面で通す確定認可の置き場
- [0112](../../docs/adr/0112-data-classification-cache-boundary.md) — 主体に紐づく値をキャッシュ境界のどちら側へ置くか
- [0080](../../docs/adr/0080-error-handling.md) — 失敗と不在の面（`error.tsx` / `not-found.tsx`）の責務

### route handler（`dev/**/route.dev.ts`）

`api/` の下は [api/README.md](api/README.md) が持ちます。

- [0029](../../docs/adr/0029-type-design-discipline.md) — 境界での parse と、返す値の型の規律
- [0075](../../docs/adr/0075-file-upload-seam.md) — 受け口が本体を受け取るときの seam
- [0080](../../docs/adr/0080-error-handling.md) — 分類から status への対応

### server action（`actions.ts`）

- [0025](../../docs/adr/0025-app-layer-elements.md) — 主体の断言が要る action をこの層へ置く判断（`app/server-action`）
- [0075](../../docs/adr/0075-file-upload-seam.md) — アップロードの seam。受け口が最後の関所になること

### metadata（`sitemap.ts` / `robots.ts` / `icon.tsx` / `apple-icon.tsx` / `opengraph-image.tsx` と各 segment の宣言）

- [0044](../../docs/adr/0044-seo-metadata-strategy.md) — Metadata API の使い方、索引の可否と canonical
- [0045](../../docs/adr/0045-fonts-and-images.md) — 書体と画像の方針（OG 画像を含む）

### root layout が mount する島（`telemetry.tsx` / `consent.tsx` / `analytics.tsx`）

- [0031](../../docs/adr/0031-policy-state-supply.md) — 同意 / feature flag の状態をどこが供給するか
- [0082](../../docs/adr/0082-client-observability.md) — Web Vitals と client 例外の収集、送信面の置き場
- [0131](../../docs/adr/0131-cookie-consent.md) — 同意管理を採らない決定
- [0077](../../docs/adr/0077-bff-abuse-protection-boundary.md) — 認証を要求しない受け口の防御をどこが持つか
