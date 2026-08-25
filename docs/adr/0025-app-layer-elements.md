# app レイヤの element 構成(Route Handler / Server Action / metadata)

[0021](0021-frontend-responsibility.md) は `app` を「route / `page.tsx` = feature の画面を呼ぶ薄い driving adapter(import 先は `features` のみ)」とだけ定めていた。しかし `src/app/` には page 以外の App Router 特殊ファイル(`route.ts` / `robots.ts` 等)が同居し、それらの element 帰属が未定義だった(構造ブロッカー **S2**):

**Route Handler**(`route.ts`)/ metadata routes(`robots.ts` 等)が `adapters` / `config` を import する必要があるのに、`app → features のみ`のマトリクスと矛盾。[0030](0030-environment-variable-management.md) は「Route Handler → adapters 直 import」を前提化しており、**Accepted 同士が矛盾**していた。

本 ADR は `app` レイヤを **4 element に分割**してこれを解消する(新カーネル不要)。root layout への横断 UI / Provider mount([0026](0026-layout-shell-mount.md) S4)は、本 ADR が定める `app/route-segment` を土台にそちらで定める。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。S2 の解決を既存 ADR への追補で埋めず内容として独立させ、S ごとに 1 主題 = 1 ADR とする判断(ユーザ決定 2026-07-14)による独立起票。内容自体はこの設計討議でユーザ確定済み。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きする）

## 背景

[0021](0021-frontend-responsibility.md) は Server Action に `feature/actions.ts` という driving-adapter の家を与えたが、**Route Handler には対応する家が無かった**。また Server Action の側も、その家に住めない場合がある —— **Server Action は action id を知る者が任意の route へ POST できる公開 HTTP 口**であり、それを描いた画面の認可は前提にできない。したがって役割の断言は action の内側に要るが、`adapters/server/auth` へ触れてよいのは `app` と `adapters` だけで、`features` からは届かない。BFF 中継エンドポイント([0081](0081-observability-logging.md) テレメトリ受け・#65 health)のような**どの feature にも属さない横断エンドポイント**は、物理が framework 規約で `src/app/**/route.ts` に強制されるため、feature 内には置けず、`app → features のみ`のマトリクスでは書けなかった。metadata routes が config 値(site URL / env 別 noindex #63)へ到達する経路も同様に無かった。

## 決定: `app` を 4 element に分割(すべて App Router 特殊ファイル)

Pages Router(`pages/` / `pages/api`)は採用しない。裏取り: 公式 doc `route-handlers.md`「Route Handlers are the equivalent of API Routes … you do not need to use API Routes and Route Handlers together」+ [0040](0040-routing-rendering-strategy.md)(App Router 単独)+ AGENTS.md「Do not add Pages Router」。

| element | 対象ファイル | 許可 import 先 | 原則 |
| --- | --- | --- | --- |
| `app/route-segment` | `page.tsx` / `layout.tsx` / `loading.tsx` / `error.tsx`(App Router UI) | `features` / **入口の保護に限り** `adapters/server/auth` の `verifySession()` と `model` の述語([0079](0079-auth-frontend-seam.md) §4) | driving adapter・薄い呼び口。保護の編成は「呼ぶ・判定する・送り返す」だけで、取得も業務ロジックも持たない |
| `app/route-handler` | **`route.ts`**(= Pages API Routes の App Router 置換・**唯一の HTTP 口**) | `adapters/server`([0024](0024-adapters-server-client-split.md))/ `model` / `errors` / `logging` / feature の **`facade/` のみ**([0021](0021-frontend-responsibility.md)) | **thin proxy・業務ロジック禁止**([0011](0011-no-docker.md) / [0070](0070-backend-role-separation.md))。`actions.ts` の HTTP 版。送り先を指すのに要るのはルートの識別子だけで、それは所有する feature が `facade/` へ出している。スライスの内側まで開けると業務ロジックがここへ降りる |
| `app/server-action` | **`actions.ts`**(`"use server"` の変更口) | `adapters/server` / `features` / `model` / `errors` / `logging` | **主体の断言をここで行う**。公開 HTTP 口であり、描画した画面の認可を前提にしない |
| `app/metadata` | `robots.ts` / `sitemap.ts` / `manifest.ts` / `opengraph-image` 等 | `config` / `model` | ビルド / 描画時の framework ファイル。起動・ビルド境界の薄い例外(`instrumentation.ts` と同格) |

これで **Route Handler が `adapters/server` を import できる明示 element**ができ、[0021](0021-frontend-responsibility.md) ↔ [0030](0030-environment-variable-management.md) の矛盾が解消する。`route.ts` は `page.tsx` と同一セグメントに共存できない(Next.js 規約)ため element 判定は filename で成立する。

**`actions.ts` の置き場は、主体の断言が要るかで決まる。**要るものは `app/server-action`、要らないものは `features/<name>/<screen>/actions.ts` に留まる([0027](0027-directory-structure.md))。同じ file 名が 2 か所に現れるのは、element 判定が **path と filename の組**で成立するためで、`src/app/**/actions.ts` だけがこの element に当たる。置き場を分けるのは、`features` から `adapters/server/auth` へ届かないという依存マトリクスの帰結であり、Next.js 公式の例が `app/**/actions.ts` を採ることとも一致する。

`app/route-segment` のうち `layout.tsx` の横断 UI / Provider mount 規約は [0026](0026-layout-shell-mount.md)(S4)が定める。

## 禁止事項

- ❌ `route.ts` に業務ロジック / 重い集約を書くこと(thin proxy。[0011](0011-no-docker.md) / [0070](0070-backend-role-separation.md))
- ❌ Pages Router(`pages/` / `pages/api`)を追加すること(App Router 単独)
**この表のうち機械で強制されるのは `app/route-handler` の行だけである。** `architecture.ts` の
`APP_ELEMENTS` がファイル名で `route.ts` / `route.dev.ts` を分類し、層の許可から UI 部品・横断状態・
設定・feature の内側を削る。`route-segment` / `server-action` は `app` の粒度（層の許可の和集合）で
検査される —— 境界検査の要素はディレクトリに対応するため、同じディレクトリに居るファイルを名前で
分けるには層の許可を後から削るしかなく、その 2 つは削る側の集合が実装と合っていない（`components` /
`errors` / client 側 `config` を表が挙げていない）。**表を実態へ合わせる作業が先に要る**ため、
現時点では指針として読む。

- ❌ `app/route-handler` から `config` を直接 import すること(config は `adapters/server` 経由。metadata は例外として config 可)
- ❌ `app/server-action` から **`server config`** を直接 import すること(route-handler と同じ理由。secret を持つ runtime object は `adapters/server` の側で読む)
- ❌ `app/server-action` で主体の断言を省き、その action を描いた画面が保護されていることに依拠すること(action id を知る者は任意の route から呼べる)
- ❌ `app/route-segment` が入口の保護の名目で取得や業務ロジックを持つこと(許すのは `verifySession()` の呼び出し・`model` の述語による判定・`redirect()` だけ。[0079](0079-auth-frontend-seam.md) §4)
- ❌ `app/route-segment` から **`server config`** を直接 import すること(値は `adapters` か、全層が読める `NEXT_PUBLIC` の公開定数から受け取る。[0021](0021-frontend-responsibility.md) の「内側は値を引数で受け取る」と同じ規定)

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
