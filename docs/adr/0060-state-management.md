# 状態管理方針

状態管理について、**Server state の既定 / Client state の起点(local-first)/ form state ライブラリ・横断 client 状態ライブラリの採用(v1 バッテリー)** を定める。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([決定 5](../plan/pre-implementation-decisions.md))。本 ADR の内容自体はユーザ決定済み([決定 3](../plan/pre-implementation-decisions.md))。日付 2026-07-12。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

**バッテリー採用への転換(2026-07-14・v1)**: 従来の「グローバル状態・form state ライブラリ 非同梱(exclusion)」を、v1 = 一般的な Next.js アプリケーション基盤として必要なライブラリを採用する方針([adoption-matrix](../plan/adoption-matrix.md))へ転換した。form state = **react-hook-form + zod**(`@hookform/resolvers`)/ 横断 client 状態 = **Zustand**(家は [0023](0023-stores-kernel.md) `stores` カーネル)を採用する。既定の local-first(単一 feature は local / server state は RSC fetch)は維持する。

## 背景

AGENTS.md の `[TODO]`(BACKLOG B5)は、Server state(TanStack Query 等)/ Client state(Zustand / Jotai / Context)/ Form state(react-hook-form 等)/ URL state の使い分けを未決としていた。暫定運用は「グローバル状態ライブラリを勝手に導入しない / Context 濫用を避け local state(`useState` / `useReducer`)から / Server state は Server Component の `fetch` 既定」だった。

初期(0.0.x)は「用途未定の表示層」ロール([0011](0011-no-docker.md))を根拠に、グローバル状態・form state ライブラリを exclusion(非同梱)としていた。v1 で「一般的な Next.js アプリ基盤に必要なライブラリを採用する」方針へ転換したため([adoption-matrix](../plan/adoption-matrix.md))、フォーム入力・横断状態はどちらもアプリ基盤の常用要件であることから、本 ADR は該当ライブラリの採用へ反転する。既定方針(server = RSC fetch / client = local から)は据え置く。

## 決定

### Server state = Server Component fetch 既定

- サーバ由来のデータは **Server Component 内の `fetch` を既定**とする([決定 3](../plan/pre-implementation-decisions.md) / [0040](0040-routing-rendering-strategy.md))
- クライアントでのデータ取得・キャッシュ(TanStack Query 等)は boilerplate 本体で前提にしない。必要な取得の編成は feature の server 関数 / `adapters` 経由([0021](0021-frontend-responsibility.md) / [0071](0071-bff-api-integration.md))で行う。キャッシュ設計は **[0071](0071-bff-api-integration.md)(BFF / API 統合)** の責務

### Client state = local-first(既定を維持)

- クライアント状態は **local state(`useState` / `useReducer`)を起点**とする。Context は濫用せず、真に木を跨ぐ共有が必要な範囲に限る
- URL state(search params / route params)は Next.js の標準機構で扱う([0040](0040-routing-rendering-strategy.md))
- 単一 feature 内で完結する状態は feature 内 local に留める(横断性が無ければ昇格しない。[0021](0021-frontend-responsibility.md) 昇格ルール)

### form state = react-hook-form + zod(採用・v1)

- フォーム状態は **react-hook-form** を採用し、バリデーションは **zod スキーマ** を `@hookform/resolvers`(`zodResolver`)で接続する。置き場は **`features` / `components`**(各フォームは feature-local。カーネルではない)
- zod スキーマを入力契約の SSOT とし、client の `zodResolver` と server 側の検証で同一スキーマを共有できる形にする(型・契約の一元化)
- 3 系(`useState` の手書きフォーム / react-hook-form / uncontrolled `FormData` 直接)を混在させず、複数フィールド・バリデーション・エラー表示を伴うフォームは react-hook-form に寄せる。ごく単純な単一入力や Server Actions への `FormData` 直送はライブラリ不要のまま許可する

### 横断 client 状態 = Zustand(家は `stores` カーネル)

- **真に横断する(複数 feature が共有する)client 状態のみ Zustand ストアへ昇格**し、家は [0023](0023-stores-kernel.md) の **`stores` カーネル** とする([0021](0021-frontend-responsibility.md) 昇格ルールの 5 つ目の出口)
- 昇格の受入基準 = **複数 feature 参照**。単一 feature でしか使わない状態は Zustand を使わず feature 内 local に留める
- ストアは `"use client"` 固定。server state を store に二重キャッシュしない(server state は RSC fetch / `adapters`)。詳細な責務・依存・不変条件は [0023](0023-stores-kernel.md) が所有する

## 標準準拠と非ロックイン([0010](0010-standards-and-non-lockin.md))

採用する 3 ライブラリはいずれも [0010](0010-standards-and-non-lockin.md) の 2 原則(§1 デファクト準拠 / §2 vendor-independent 正当化)に沿って選ぶ。

- **react-hook-form**: React の de-facto フォームライブラリ。`register` / uncontrolled + resolver という標準形に乗る。vendor-independent = 入力契約は **zod スキーマ側が SSOT** であり、react-hook-form を抜いても「スキーマ検証されたフォーム状態を hook で扱う」構造は可搬(代替: TanStack Form / Formik)。uncontrolled による再描画抑制と RSC/Server Actions との親和性を独立根拠として選択
  - **非ロックインの担保形が他 2 者と異なる(例外注記)**: react-hook-form は hook の性質上、`useForm` / `register` を **feature コンポーネントから直接呼ぶ**構造であり、Sentry(観測境界)/ Zustand(`stores` カーネル)/ date-fns(ユーティリティ)のように **vendor 直参照を 1 箇所へ局所化する**形は字義通りには成立しない。したがって rhf の非ロックインは「境界の裏に集約」ではなく、**入力契約の SSOT を zod スキーマ側に置く**ことで担保する。zod スキーマは可搬な契約なので、rhf を抜いても契約(検証ルール・型)は残り、別フォームライブラリの resolver に載せ替えられる(= [0010](0010-standards-and-non-lockin.md) §2 の運用テスト「差し替えても契約が残るか」を満たす)。散らしてはならないのは vendor API そのものではなく、**zod を経由しない独自バリデーションロジック**である(禁止事項に同旨)
- **zod**: TypeScript-first のスキーマ検証デファクト。スキーマは可搬な契約であり、resolver 経由で他フォームライブラリにも噛む(代替: valibot / yup)。「スキーマから型と検証を導出する」構造がベンダー非依存
- **Zustand**: 軽量 store の de-facto。`create()` + hook の標準形に乗り、Zustand を抜いても「横断 client 状態を hook で読む」構造は可搬([0023](0023-stores-kernel.md) 詳述。代替: Jotai / Redux Toolkit)

差し替え可能性の担保形は 2 通りに分かれる。**Zustand は vendor 直参照を `stores` カーネルに集約**([0023](0023-stores-kernel.md))して「境界の裏」に閉じる。一方 **react-hook-form は上記の例外注記のとおり、hook を feature から直接呼ぶため「境界の裏への集約」では担保できず、zod スキーマを入力契約の SSOT に置くこと**で可搬性を保つ(rhf を抜いても契約が残る)。共通するのは、いずれも [0010](0010-standards-and-non-lockin.md) §2 の運用テスト(差し替えても契約・構造が残るか)を満たす点であり、集約の物理形ではなく可搬性の成立が判定軸である。導入は **exact-pin + `pnpm audit`**([0004](0004-library-management.md))の枠内で行う。

## 禁止事項

- ❌ TanStack Query 等のクライアント取得・キャッシュ層を本体既定として前提にすること(取得の編成は feature server 関数 / `adapters`。[0071](0071-bff-api-integration.md))
- ❌ server state を Zustand ストアに二重キャッシュすること(server state は RSC fetch / `adapters`)
- ❌ 単一 feature の状態を `stores`(Zustand)へ上げること(横断性が無ければ feature 内 local)
- ❌ Zustand ストアを feature / component に直書きして横断参照させること(横断は `stores` へ集約。[0023](0023-stores-kernel.md))
- ❌ zod を経由しない独自バリデーションロジックを各フォームに散らすこと(スキーマを SSOT にする)
- ❌ 状態ライブラリを exact-pin / `pnpm audit` を経ずに追加すること([0004](0004-library-management.md))

## 関連 ADR

- [0023-stores-kernel.md](0023-stores-kernel.md) — 横断 client 状態(Zustand)の家。責務・依存・`"use client"` 不変条件・昇格基準の SSOT
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — 標準準拠 + vendor-independent 正当化(3 ライブラリ採用の判断軸)
- [0004-library-management.md](0004-library-management.md) — exact pin / `pnpm audit`(ライブラリ採用の枠)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — Server Components 既定(Server state = fetch の土台)/ URL state
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — 昇格ルール(横断 client 状態 → `stores` の出口)/ カーネル配置・命名規律
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — クライアント側データ取得・キャッシュ設計 / server state 境界
- [0011-no-docker.md](0011-no-docker.md) — 表示層ロール(初期 exclusion の根拠。v1 でアプリ基盤へ性格更新)
- [0052-ui-component-policy.md](0052-ui-component-policy.md)(B2)— 同じく v1 バッテリー採用へ転換(shadcn/ui + lucide + 複雑入力)
- [adoption-matrix](../plan/adoption-matrix.md) — v1 バッテリー同梱の全体像(FORM / STATE 行)
