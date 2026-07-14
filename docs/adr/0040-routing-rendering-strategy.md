# ルーティング・レンダリング戦略

App Router の採用を追認し、**Server / Client Components の境界 / Server Actions の採否 / `page.tsx` の責務 / レンダリングモード(CSR・SSR・SSG・ISR / Next.js 16 のキャッシュ)** の方針を定める。本 ADR は [0020](0020-adopted-architecture.md) / [0021](0021-frontend-responsibility.md) が定めた層構造の上で、App Router の各機構をどう使うかを確定する。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([決定 5](../plan/pre-implementation-decisions.md))。本 ADR の内容自体はユーザ決定済み([決定 3](../plan/pre-implementation-decisions.md))。日付 2026-07-12。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

バッテリー採用への転換(2026-07-14・v1): route-as-modal(intercepting / parallel routes)を選択肢として認める追補を追加(triage #22・ユーザ採用決定)。App Router 単独・Server Components 既定は不変。

## 背景

`src/app/`(`layout.tsx` / `page.tsx` / `globals.css`)が既に存在し、App Router は事実上採用済みだが、「Server Components 既定」「`"use client"` の置き方」「Server Actions の採否」「CSR/SSR/SSG/ISR の使い分け」は未文書化だった。AGENTS.md の `[TODO] Routing & Rendering Strategy` が敷いていた暫定運用(App Router 既定挙動 = Server Components / `"use client"` 追加は最小化しコミットに理由記載 / Pages Router 不採用)を、本 ADR が確定させる。

本リポジトリは **Next.js 16 / React 19** を採用しており、レンダリング・キャッシュの既定が従来の Next.js と異なる。実装前に `node_modules/next/dist/docs/` を確認した結果、以下を前提とする:

- Server Components が既定。`"use client"` はファイル先頭で **Server / Client のモジュールグラフ境界**を宣言し、それ以下の import・子は**すべて client バンドル**に含まれる(`getting-started/server-and-client-components`)
- Server Function(Server Action)は `"use server"` ディレクティブで定義し、Server Component にインライン、または `"use server"` ファイルにまとめて Client Component から import 起動できる(`getting-started/mutating-data`)
- `fetch` は**既定でキャッシュされない**(Cache Components の有無によらず。`getting-started/fetching-data`)。`use cache` ディレクティブによる opt-in キャッシュと、`<Suspense>` / `use cache` を伴う **Partial Prerendering (PPR)** は、**Cache Components(`next.config.ts` の `cacheComponents: true`)を有効化したときの機構**である(PPR は Cache Components 有効時の既定挙動。`getting-started/caching` / `api-reference/directives/use-cache`)。無効時は従来モデル(`cache: 'force-cache'` 等の opt-in)が適用される(`guides/caching-without-cache-components`)

## 決定

### App Router + Server Components 既定

- **App Router 単独**を採用する(Pages Router は採用しない)。ルート構造・特殊ファイル・セグメント記法は Next.js 規約に従う([0028](0028-naming-convention.md))
- **Server Components を既定**とする。`"use client"` を付けないコンポーネントはサーバで実行される

### `"use client"` は feature 内の葉へ押し下げる

- `"use client"` は **feature 内の、クライアント機能(state / event / ブラウザ API)を実際に使う葉コンポーネント**にのみ付ける([0021](0021-frontend-responsibility.md)「Server Action の置き場」の規約が正。[決定 3](../plan/pre-implementation-decisions.md))
- 理由: `"use client"` 境界より内側は import・子まで丸ごと client バンドルに入るため、境界を上位(`layout.tsx` / `page.tsx`)に置くと不要に client 化が広がる。境界を葉へ下げて client バンドルを最小化する
- `page.tsx` / `layout.tsx` は Server Component のまま保つ

### Server Actions を採用する

- Server Action を**採用**し、`"use server"` で定義する。置き場は **feature 内 `actions.ts`**(controller 相当。[0021](0021-frontend-responsibility.md) が正)
- driving adapter として**編成のみ**を行い、**業務ロジックは書かない**([0011](0011-no-docker.md) thin proxy / [0020](0020-adopted-architecture.md) 設計原則 4 / [0021](0021-frontend-responsibility.md))

### `page.tsx` = 薄い driving adapter

- ルートセグメント(`app/` 配下)と `page.tsx` は **feature の画面 RSC を呼ぶ薄い呼び口**([0020](0020-adopted-architecture.md) 設計原則 4)。編成・業務ロジックを抱えない。コード分割の第一軸は route ではなく feature

### レンダリングモードは特定モードを強制しない

- 本 boilerplate は **CSR / SSR / SSG / ISR のいずれのモードも閉ざさない**。特定モードを一律強制せず、静的シェルのプリレンダーと request-time のストリーミングの**両対応を保つ**([決定 3](../plan/pre-implementation-decisions.md))
- 導出根拠: [0011](0011-no-docker.md) の想定デプロイは静的 CDN と SSR PaaS の**両方が主想定**であり、boilerplate 本体はどのモードも前提にしない
- **Next.js 16 のキャッシュ挙動**: `fetch` 既定 uncached を前提とし、キャッシュは opt-in とする(Cache Components 有効時は `use cache` / PPR、無効の間は従来モデルの `cache: 'force-cache'` 等)。ただし**具体的なキャッシュ方針(どこを `use cache` するか / `cacheLife` / `<Suspense>` 境界の切り方)は本 ADR で固定しない**。データ取得のキャッシュ・再検証設計は **B3([0071](0071-bff-api-integration.md))「データ取得のキャッシュ・再検証」節**、`loading.tsx` / Suspense 境界は **B6([0080](0080-error-handling.md))** が引き取り確定済み
- **`Cache Components`(PPR を既定化する設定)の有効化可否は保留**する。データ取得([B3])・env のプリレンダー凍結([0030](0030-environment-variable-management.md) A7)と交差するため、それらの確定後に判断する。本 ADR は「モードを強制しない」ことのみ確定する

### route-as-modal(intercepting / parallel routes)を認める

- **route をモーダルとして表示する選択肢を認める**。実現手段は Next.js ネイティブの **intercepting routes(`(.)` / `(..)` / `(..)(..)` / `(...)` 記法)+ parallel routes(`@modal` などの名前付きスロット + `default.tsx`)** の組み合わせとする。ライブラリは導入しない([0004](0004-library-management.md) の対象外 = 新規依存を増やさない。これは非ロックインの強みでもある。[0010](0010-standards-and-non-lockin.md))
- 挙動の前提: **ソフトナビゲーション**(feed 内の `<Link>` クリック等)では intercept してモーダルを重ね、URL をマスクする。**ハードナビゲーション**(共有 URL 直開き・リフレッシュ)では intercept が起きず**独立したフルページが描画**される。これにより「モーダル内容の URL 共有可能性」「リフレッシュで閉じずコンテキスト保持」「戻る/進むでの開閉」を満たす(`intercepting-routes` / `parallel-routes`)
- **モーダル境界(`Modal` コンポーネント)とモーダル内容を分離**し、内容側は Server Component のまま保てる構成を既定とする(`"use client"` は開閉制御の葉に押し下げる本 ADR の原則と整合)。未マッチのスロットには `default.tsx`(`null` 返し)を必ず置く

**[0010](0010-standards-and-non-lockin.md) 準拠(vendor-independent 正当化)**:

- intercepting / parallel routes は **Next.js 固有 API** だが、これは「App Router を選んだ」という別既決([0011](0011-no-docker.md) / App Router 単独)の帰結であって、機能固有のロックインではない([0010](0010-standards-and-non-lockin.md) §2 運用テスト)。route-as-modal を採る/採らないという **構造決定**自体は、`?modal=` 等の search-param 駆動モーダルや純クライアント状態モーダル([0053](0053-ui-component-interaction-seam.md) が既定を所有)へ**代替可能**であり、Next.js を正当化から抜いても「URL に紐づくモーダルという UI パターン」は成立する = 非ロックイン
- seam の形は **Next.js 規約(`@modal` / `(.)` file convention)にそのまま乗る**(独自発明・中立化しない。[0010](0010-standards-and-non-lockin.md) §1・命名優先順位 [0028](0028-naming-convention.md))
- 本 ADR は route-as-modal を **選択肢として認める(受け皿)**にとどめる。モーダル全体の既定手段(native `<dialog>` / focus trap / Escape / scroll lock / route-as-modal をいつ選ぶか)の方針は **[0053](0053-ui-component-interaction-seam.md) が所有**し、本節を URL 設計側の受け皿として参照する

### `loading.tsx` / `error.tsx` の配置

- App Router の `loading.tsx` / `error.tsx` / `not-found.tsx` / `global-error.tsx` の配置・責務は **B6([0080](0080-error-handling.md))が確定済み**(`error.tsx` 系 = 同 3 節 / `loading.tsx`・Suspense 境界 = 同 3.5 節)。本 ADR は特殊ファイルの命名([0028](0028-naming-convention.md))と「driving adapter に業務ロジックを置かない」原則のみを敷く

## 禁止事項

- ❌ Pages Router の追加(App Router 単独)
- ❌ `page.tsx` / `layout.tsx` / route / Server Action に業務ロジックを書くこと(薄い driving adapter。[0011](0011-no-docker.md) thin proxy)
- ❌ `"use client"` を `layout.tsx` / `page.tsx` や上位に不要に置くこと(境界は葉へ押し下げる)
- ❌ コード分割の第一軸を route にすること(第一軸は feature。[0020](0020-adopted-architecture.md))
- ❌ 特定レンダリングモード(全面 SSG / 全面 dynamic 等)を boilerplate 本体で一律強制すること
- ❌ route-as-modal を全モーダルの既定として強制すること(あくまで**選択肢**。既定手段の判断は [0053](0053-ui-component-interaction-seam.md) 管轄)
- ❌ intercepting / parallel routes の代替に独自ルーティング機構を発明・中立化すること(Next.js file convention にそのまま乗る。[0010](0010-standards-and-non-lockin.md) §1)

## 補足

- 本 ADR の Accepted に伴い、AGENTS.md の `[TODO] Routing & Rendering Strategy` 節の削除・書き換えを実施する(未実施 — AGENTS.md は Protected Documentation のため、変更案の提示とユーザ承認を経て適用する)
- 本 ADR は方針を定める。`Cache Components` 有効化・具体キャッシュ設計は B3 / B6 確定後の実装 PR で扱う

## 関連 ADR

- [0020-adopted-architecture.md](0020-adopted-architecture.md) — driving adapter 非分割軸 / `page.tsx` 薄化 / feature 第一軸(本 ADR の親原則)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — Server Action の置き場(`actions.ts`)・`"use client"` 押し下げ
- [0011-no-docker.md](0011-no-docker.md) — thin proxy(driving adapter に業務ロジックを置かない)/ 静的 CDN・SSR 両対応の想定デプロイ(モード非強制の根拠)
- [0028-naming-convention.md](0028-naming-convention.md) — App Router 特殊ファイル・route セグメントの命名
- [0030-environment-variable-management.md](0030-environment-variable-management.md) — SSG / ISR での env プリレンダー凍結(Cache Components 判断との交差)
- [0060-state-management.md](0060-state-management.md) — Server state = Server Component fetch 既定 / URL state(search params / route params は本 ADR の App Router 標準機構の上で扱う)
- [0090-testing-strategy.md](0090-testing-strategy.md)(B8)— Server Components / route handler / E2E のテスト線引き(同日 Accepted)
- [0071-bff-api-integration.md](0071-bff-api-integration.md)(B3)— データ取得のキャッシュ・再検証設計(本 ADR から引き取り確定済み)
- [0080-error-handling.md](0080-error-handling.md)(B6)— `loading.tsx` / Suspense 境界 + `error.tsx` 系の配置・責務(本 ADR から引き取り確定済み)
- [0053-ui-component-interaction-seam.md](0053-ui-component-interaction-seam.md) — モーダル/ダイアログの既定手段(native `<dialog>` / a11y 必須要件)。route-as-modal 採否を本 ADR に委譲(本節がその受け皿。triage #22)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — 標準準拠と非ロックインの判断軸(route-as-modal = Next.js 規約に乗る seam / 構造は代替可能 = vendor-independent 正当化の根拠)
- [0004-library-management.md](0004-library-management.md) — ライブラリ管理方針(route-as-modal はネイティブ機能で新規依存を増やさない = 本 ADR は同方針の対象外)
