# app レイヤの element 構成(Route Handler / metadata)

[0021](0021-frontend-responsibility.md) は `app` を「route / `page.tsx` = feature の画面を呼ぶ薄い driving adapter(import 先は `features` のみ)」とだけ定めていた。しかし `src/app/` には page 以外の App Router 特殊ファイル(`route.ts` / `robots.ts` 等)が同居し、それらの element 帰属が未定義だった(構造ブロッカー **S2**):

**Route Handler**(`route.ts`)/ metadata routes(`robots.ts` 等)が `adapters` / `config` を import する必要があるのに、`app → features のみ`のマトリクスと矛盾。[0030](0030-environment-variable-management.md) は「Route Handler → adapters 直 import」を前提化しており、**Accepted 同士が矛盾**していた。

本 ADR は `app` レイヤを **3 element に分割**してこれを解消する(新カーネル不要)。root layout への横断 UI / Provider mount([0026](0026-layout-shell-mount.md) S4)は、本 ADR が定める `app/route-segment` を土台にそちらで定める。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。S2 の解決を既存 ADR への追補で埋めず内容として独立させ、S ごとに 1 主題 = 1 ADR とする判断(ユーザ決定 2026-07-14)による独立起票。内容自体はこの設計討議でユーザ確定済み。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きする）

## 背景

[0021](0021-frontend-responsibility.md) は Server Action に `feature/actions.ts` という driving-adapter の家を与えたが、**Route Handler には対応する家が無かった**。BFF 中継エンドポイント([0081](0081-observability-logging.md) テレメトリ受け・#65 health)のような**どの feature にも属さない横断エンドポイント**は、物理が framework 規約で `src/app/**/route.ts` に強制されるため、feature 内には置けず、`app → features のみ`のマトリクスでは書けなかった。metadata routes が config 値(site URL / env 別 noindex #63)へ到達する経路も同様に無かった。

## 決定: `app` を 3 element に分割(すべて App Router 特殊ファイル)

Pages Router(`pages/` / `pages/api`)は採用しない。裏取り: 公式 doc `route-handlers.md`「Route Handlers are the equivalent of API Routes … you do not need to use API Routes and Route Handlers together」+ [0040](0040-routing-rendering-strategy.md)(App Router 単独)+ AGENTS.md「Do not add Pages Router」。

| element | 対象ファイル | 許可 import 先 | 原則 |
| --- | --- | --- | --- |
| `app/route-segment` | `page.tsx` / `layout.tsx` / `loading.tsx` / `error.tsx`(App Router UI) | `features` | driving adapter・薄い呼び口(現状維持) |
| `app/route-handler` | **`route.ts`**(= Pages API Routes の App Router 置換・**唯一の HTTP 口**) | `adapters/server`([0024](0024-adapters-server-client-split.md))/ `errors` / `logging` | **thin proxy・業務ロジック禁止**([0011](0011-no-docker.md) / [0070](0070-backend-role-separation.md))。`actions.ts` の HTTP 版 |
| `app/metadata` | `robots.ts` / `sitemap.ts` / `manifest.ts` / `opengraph-image` 等 | `config` / `model` | ビルド / 描画時の framework ファイル。起動・ビルド境界の薄い例外(`instrumentation.ts` と同格) |

これで **Route Handler が `adapters/server` を import できる明示 element**ができ、[0021](0021-frontend-responsibility.md) ↔ [0030](0030-environment-variable-management.md) の矛盾が解消する。`route.ts` は `page.tsx` と同一セグメントに共存できない(Next.js 規約)ため element 判定は filename で成立する。

`app/route-segment` のうち `layout.tsx` の横断 UI / Provider mount 規約は [0026](0026-layout-shell-mount.md)(S4)が定める。

## 禁止事項

- ❌ `route.ts` に業務ロジック / 重い集約を書くこと(thin proxy。[0011](0011-no-docker.md) / [0070](0070-backend-role-separation.md))
- ❌ Pages Router(`pages/` / `pages/api`)を追加すること(App Router 単独)
- ❌ `app/route-handler` から `config` を直接 import すること(config は `adapters/server` 経由。metadata は例外として config 可)

## 補足

- **採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**(独立起票・S ごと 1 ADR)。
- **既存 ADR への内容反映は 2026-07-14 に適用済**(ユーザ承認のもと): [0021](0021-frontend-responsibility.md) 依存マトリクスの `app` 3 element 化 / [0030](0030-environment-variable-management.md) 受け手表に metadata routes 行・Route Handler element / [0020](0020-adopted-architecture.md) / [0027](0027-directory-structure.md) の構造図。

## 関連 ADR

- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — 責務 / 依存マトリクスの SSOT(本 ADR が `app` の element を細分化)
- [0030-environment-variable-management.md](0030-environment-variable-management.md) — config 受け手表(Route Handler / metadata の config 到達)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — App Router 単独(Pages Router 除外)
- [0011-no-docker.md](0011-no-docker.md) / [0070-backend-role-separation.md](0070-backend-role-separation.md) — thin proxy(Route Handler の業務ロジック禁止)
- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md) — `adapters/server`(Route Handler の import 先)
- [0026-layout-shell-mount.md](0026-layout-shell-mount.md) — `layout.tsx` の横断 UI / Provider mount(本 ADR の route-segment が土台。S4)
