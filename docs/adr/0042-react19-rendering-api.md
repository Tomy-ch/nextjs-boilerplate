# React 19 レンダリング API 規約

React 19 のレンダリング関連 API —— **ref as prop(`forwardRef` 廃止方向)/ `use()` / `useEffect` 抑制 / React Compiler の採否** —— の使用規約を定める。本 ADR は [0040](0040-routing-rendering-strategy.md) が定めた **App Router のレンダリング機構・RSC / Client 境界の置き方** の上で、コンポーネント内部で **React そのものをどう書くか** を確定する。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。独立起票。本 ADR の内容自体はこの設計討議でユーザ確定済み。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

ADR 空白の遡及監査([docs/plan/adr-gap-audit.md](../plan/adr-gap-audit.md) #36)で、**React 19 のレンダリング関連 API の書き方規約がどの ADR にも存在しない**ことが判明した。[0040](0040-routing-rendering-strategy.md) は「Server / Client 境界を **どこに置くか**(WHERE)」を定めるルーティング ADR であり、「境界の内側で React API を **どう書くか**(HOW)」は射程外である。

本リポジトリは **React 19.2 / Next.js 16** を採用しており([0011](0011-no-docker.md) / App Router de facto の帰結)、この領域は AI エージェントの訓練データと乖離が大きい([AGENTS.md](../../AGENTS.md)「This is NOT the Next.js you know」)。規約が無いと、新旧パターン(`forwardRef` / 手書き `memo` / `useCallback` と、ref as prop / React Compiler)が実装者ごとに混在する。本 ADR はレンダリング関連 React API の使用規約を成文化する。

裏取り元(実装前確認・[0010](0010-standards-and-non-lockin.md) §1 の「乗る」先): `node_modules/react`(v19.2.4)/ `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/reactCompiler.md` / 同 `01-getting-started/06-fetching-data.md`(`use()` の Promise / Context 解決例)。

### 射程宣言(0040 と重複しない)

本 ADR は **レンダリング関連の React API に限る**。以下は本 ADR の射程外であり、既存 ADR が所有する(局所推論の起点を分けるための明示分界):

| 関心 | 所有 ADR | 本 ADR との分界 |
| --- | --- | --- |
| RSC / Client 境界を **どこに置くか**・`"use client"` の押し下げ | [0040](0040-routing-rendering-strategy.md) | 本 ADR は境界の内側の **API の書き方** のみ |
| `use()` を使った **データ取得の編成・キャッシュ・重複排除** | [0071](0071-bff-api-integration.md) | 本 ADR は `use()` を **レンダリングのプリミティブ** としてどう書くかのみ |
| `<Suspense>` / `loading.tsx` の **境界配置・粒度** | [0080](0080-error-handling.md) §3.5 | 本 ADR は `use()` が Suspense を前提にする **不変条件** のみ |
| 横断的な reactive client hook(runtime 能力)の **家** | [0022](0022-capabilities-kernel.md) | 本 ADR は `useEffect` の **書き方の抑制方針** のみ |

## 決定

### 1. ref as prop を採用し、新規コードで `forwardRef` を使わない

- React 19 では ref を **通常の prop** として関数コンポーネントで受け取れる。新規コンポーネントはこれを用い、**`forwardRef` を新規に書かない**。
- **vendor-independent 正当性材料**([0010](0010-standards-and-non-lockin.md) §2): `forwardRef` は wrapper による余分な間接層を生み、型(`ForwardRefRenderFunction` 等)を複雑化させる。ref as prop は素の関数シグネチャで済み、props と ref の型付けが一様になる。これは React の権威を抜いても成立する API 設計上の単純化根拠であり、「React が deprecate したから」に留まらない。React 19 は `forwardRef` を deprecation 方向に置いており([0010](0010-standards-and-non-lockin.md) §1 の「デファクトに乗る」= React 規約への準拠)、乗ることは車輪の再発明の回避でもある。

### 2. `use()` を条件付きの読取プリミティブとして許容する

- `use()` を **Promise / Context の読取**に用いてよい。`useContext` に代えて `use()` で Context を読むことを許容する(`use()` は条件分岐・早期 return の内側でも呼べる —— Hook のトップレベル制約を受けない読取であるため)。
- **正道**: Server Component で開始した fetch の Promise を Client Component へ **props で渡し**、`<Suspense>` 境界の下で `use()` により解決する(`fetching-data.md` の文書化パターン。0040「`"use client"` は葉へ押し下げ」と整合し、fetch 自体は server に留めつつ待機のみ client へ寄せる)。
- **委譲**: `use()` を **どのデータで使うか / キャッシュ・再検証・重複排除をどう設計するか** は [0071](0071-bff-api-integration.md)、`<Suspense>` 境界の **配置・粒度** は [0080](0080-error-handling.md) §3.5 が所有する。本 ADR は「`use()` は Suspense / error boundary を前提とする」という **不変条件** のみを敷く(裸の `use()` を境界なしで置かない)。

### 3. `useEffect` を外部システム同期に限定する(抑制)

- `useEffect` は **React 外の外部システムとの同期**(subscription / 非 React DOM 操作 / ブラウザ API 購読)に限って用いる。
- **禁止方向**: props / state から導出できる **派生値** を effect + state で同期しない(render 中の計算、または event handler で求める)。React 公式「You Might Not Need an Effect」の方針に乗る。**vendor-independent 根拠**: 派生値の effect 同期は余分な再レンダリングと同期ズレのバグ源であり、これは React の版に依らない状態管理上の一般原則である。
- **昇格**: 複数 feature から使う reactive な横断 client hook(runtime 能力)へ育つ `useEffect` は、feature 内に留めず **`capabilities` カーネル**([0022](0022-capabilities-kernel.md))へ昇格させる([0021](0021-frontend-responsibility.md) 昇格ルール)。effect は client 実行であり、RSC 既定([0040](0040-routing-rendering-strategy.md))の葉への押し下げと整合する。

### 4. React Compiler は 0.0.x では有効化しない(保守的・v1 / fork 先で再評価)

- **0.0.x の間は React Compiler を有効化しない**(`next.config.ts` の `reactCompiler` を設定しない)。あわせて **手書きの `memo` / `useMemo` / `useCallback` は「計測に基づく局所最適化」に限り、既定では書かない**(まず最適化しない)。
- **理由(保守側に倒す)**: React Compiler の有効化は自動メモ化により最適化モデルを反転させる大改変であり、(a) `next.config.ts`(保護対象のリポジトリルート config)の変更と、(b) `babel-plugin-react-compiler` の追加([0004](0004-library-management.md) の exact pin + `pnpm audit` フロー)を伴う。安定運用前の boilerplate では opt-in 側に倒す。これは [0041](0041-cache-components-decision.md) の Cache Components 判断(0.0.x 無効・v1 で再評価に**確定済み**)と同型の判断である。
- **再評価トリガー**: v1 大規模整理、または fork 先の判断。採用時は「手書き memo 系を原則禁止(Compiler に委ねる)」という**連動規約**が発生する(採否で規約が反転する。下記「補足」)。

## 禁止事項

- ❌ 新規コンポーネントで `forwardRef` を使うこと(ref as prop に乗る。決定 1)
- ❌ `use()` を `<Suspense>` / error boundary の外に裸で置くこと(決定 2 の不変条件)
- ❌ props / state から導出できる派生値を `useEffect` + `useState` で同期すること(render 中計算 or event handler。決定 3)
- ❌ 0.0.x で `next.config.ts` に `reactCompiler` を設定して React Compiler を有効化すること(保護 config 変更 + ライブラリ採否 = ユーザ判断。決定 4)
- ❌ 計測なしに `memo` / `useMemo` / `useCallback` を予防的に撒くこと(既定は書かない。決定 4)
- ❌ 本 ADR で **RSC / Client 境界の置き方**(0040)・**データ取得のキャッシュ設計**(0071)・**Suspense 境界の配置**(0080)を再決定すること(射程外)

## 補足

- **decision と rule の分界**([0140](0140-documentation-operations.md) タクソノミー): 本 ADR は React Compiler の**採否**(decision)と各 API の**採用方針**(decision)を確定する。他方、日常強制される制約 —— 「`forwardRef` を書かない」「派生値を effect 同期しない」「予防的 memo を撒かない」、および Compiler 採用時の「手書き memo 系を書かない」—— は **rule 分類**であり、`docs/rules.md` 新設([0140](0140-documentation-operations.md) 決定 3)時に `> Rationale: [ADR-0043]` 逆参照付きでそちらへ段階移行する。本 ADR 本文には rule の芯(なぜ)のみを残す。
- **React Compiler 採用時の連動規約の帰属は未確定**: 採用へ転じた場合、`compilationMode: 'annotation'`(`"use memo"` opt-in)を採るか全体適用かの選択と、それに連動する手書き memo 禁止規約の**置き場**(本 ADR 追補 vs rules.md)は、採用判断と同時にユーザが確定する(下記 flags)。
- **単一項目性への注記**: 本 ADR は #36 単独の小 ADR である。将来 [0071](0071-bff-api-integration.md) 近傍に「データ取得・レンダリング」を束ねる ADR が起こる場合、`use()` のデータ取得側面はそちらへ吸収し得る(本 ADR はレンダリング API の書き方に純化する)。この整理も v1 大規模整理で行う。
- 本 ADR の Accepted に伴う AGENTS.md への反映は不要(該当 `[TODO]` 節を持たない領域)。

## 関連 ADR

- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — App Router のレンダリング機構 / RSC・Client 境界の置き方(本 ADR の親。WHERE を所有、本 ADR は HOW を所有)
- [0020-adopted-architecture.md](0020-adopted-architecture.md) — 機能スライス × 表示層カーネル(`"use client"` 葉押し下げ・昇格の親原則)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — 昇格ルール(横断 client hook → `capabilities`)/ rule の rules.md 段階移行
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md) — reactive な横断 client hook の家(`useEffect` 昇格先)
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — `use()` を用いるデータ取得の編成・キャッシュ・重複排除(本 ADR から委譲)
- [0041-cache-components-decision.md](0041-cache-components-decision.md) — Cache Components 0.0.x 無効の確定(React Compiler 判断と同型)
- [0080-error-handling.md](0080-error-handling.md) — `<Suspense>` / `loading.tsx` 境界の配置・粒度(`use()` の前提)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — 標準準拠(React 規約に乗る)+ vendor-independent 正当性材料の必須化
- [0140-documentation-operations.md](0140-documentation-operations.md) — decision / rule タクソノミー(本 ADR = decision / 連動制約 = rule → rules.md)
- [0004-library-management.md](0004-library-management.md) — `babel-plugin-react-compiler` 導入時の exact pin + `pnpm audit` フロー
- [docs/plan/adr-gap-audit.md](../plan/adr-gap-audit.md) #36 — 由来する空白領域
