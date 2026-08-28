---
imports-allowed: [features, components, capabilities, stores, adapters, errors, logging, config, model, observability]
forbidden: [business-logic, direct-fetch]
test-requirement: route
coverage-exclusions:
  - "src/app/**/page.dev.tsx"
  - "src/app/**/page.tsx"
  - "src/app/fonts.ts"
---

# app

App Router の driving adapter です。`page.tsx` と `layout.tsx` は feature を薄く呼び出し、route handler は `adapters/server` を介して外部接続します。

## 受け入れるもの

- route segment、route handler、metadata と layout への横断 UI / Provider の mount
- Next.js が規定する特殊ファイルと route segment
- **複数の route group の器が共有する宣言モジュール**（`fonts.ts` / `global-nav.ts`）。route 要素の
  どれにも当たらないが、器ごとに書くと片方だけが動く。テストは `unit` として扱う
- **root layout が mount する計装**（`telemetry.tsx`）。描画するものを持たず、ブラウザ側のシグナルを
  中継へ送り出すだけの client component である。`components` にも `capabilities` にも置けない ——
  どちらも外部への送信を持てないため（[0082](../../docs/adr/0082-client-observability.md)）。
  テストは `component` として扱う
- **root layout が mount する同意の島**（`consent.tsx`）。同意を尋ねる面（`components`）と、同意を
  要する資材のゲートを、1 つの購読の裏で束ねる client component である。`components` にも
  `capabilities` にも置けない —— どちらも `stores` を引けないため
  （[0031](../../docs/adr/0031-policy-state-supply.md)）。テストは `component` として扱う

**shell を通らない画面は、自分で `main` を置く。** route group の外に立つ画面（`not-found.tsx` や
`dev/` の下）は、`(shop)` / `admin` の layout が置く landmark を持たない。包む物が無いと、支援技術
から本文へ直接跳べない。

## 受け入れないもの

- 業務ロジック、画面ユースケースの編成、route segment からの直接 fetch

## この層が持つ判断

route ごとに決まることがここにあります。**そのうちいくつかは、この README にも ADR にも書けません**
—— 画面ごとに違う答えを持つものだからです。答えを書く場所は決まっています。

| 判断 | 宣言する場所 | 答えを持つ文書 |
| --- | --- | --- |
| 描画の時点（`dynamic` / `revalidate`） | `page.tsx` | その画面の機能要件（[`docs/spec/route/**`](../../docs/spec/README.md)） |
| 待ちの境界（`Suspense` をどこへ掛けるか） | `page.tsx` | 同上 |
| 失敗と不在の面 | `error.tsx` / `not-found.tsx` | 同上 + [0080](../../docs/adr/0080-error-handling.md) |
| metadata | `page.tsx` / `layout.tsx` | [0044](../../docs/adr/0044-seo-metadata-strategy.md) |
| 横断 UI と Provider の mount | `layout.tsx` **だけ** | [0026](../../docs/adr/0026-layout-shell-mount.md) |
| 外部との往復 | `api/**/route.ts` | [0071](../../docs/adr/0071-bff-api-integration.md) / [0025](../../docs/adr/0025-app-layer-elements.md) |

**描画の時点は画面ごとに選びます。**この層のどこかに宣言があっても、それは boilerplate 全体の
既定ではありません（[0040](../../docs/adr/0040-routing-rendering-strategy.md)）。宣言しなければ
動的な API を使わない画面は build 時に 1 度だけ描かれるので、**選ばないことも選択**になります。

**選んだ理由は仕様書へ書きます。** route の隣の doc コメントだけに置くと、その画面がいつ描かれる
かを文書から辿れなくなります。コードのコメントに残すのは、その場で効く注意だけです。

**待ちの境界も同じです。** 節ごとに分けるか画面全体で 1 つにするかは、何を同時に待つかで決まる
画面の判断であり、層の既定ではありません。

### まだ埋まっていないもの

| 対象 | 現状 | 埋まる契機 |
| --- | --- | --- |
| `metadata` の `metadataBase` | **未設定**。公開 URL を保持する config が無いため | 公開 URL を config へ足す時点 |

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
- metadata は Metadata API で宣言する。`<head>` の手書きと `next/head` は使わない。root は雛形の枠だけを持ち、各 segment はそこからの差分を宣言する
- **route segment は描画の span を持たない。** Next.js が `render route (app)` を張るので、同じ範囲を二重に持たない。画面の中の帰属は feature 層の最上位が持つ（[observability/README.md](../observability/README.md)）
