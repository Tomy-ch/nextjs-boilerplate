# UI コンポーネント方針(採用)

UI コンポーネント基盤として **shadcn/ui**(Radix primitives + Tailwind の copy-in 方式)+ **lucide-react**(アイコン)+ shadcn 系の複雑入力部品(日付ピッカー等)を **boilerplate 本体に採用**する。置き場は `components` カーネル([0021](0021-frontend-responsibility.md))。

## Status

Accepted

- バッテリー採用への転換(2026-07-14・v1)

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([0140](0140-documentation-operations.md))。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない。当初は exclusion(本体非同梱)として記録していたが、v1 =「一般的な Next.js アプリケーション基盤」方針([master-plan §1.2](../plan/master-plan.md))への転換に伴い、採用へ反転した。日付 2026-07-14）

## 背景

当初 AGENTS.md の `[TODO]`(BACKLOG B2)は shadcn/ui の採否・アイコンライブラリ・form コンポーネント・Headless UI 系の扱いを未決とし、本 ADR はこれらを「用途依存ゆえ本体に同梱しない」exclusion として記録していた。

その後、boilerplate の性格を「用途未定の最小表示層」から **「一般的な Next.js アプリケーション基盤(v1)」** へ転換する方針が確定した([master-plan §1.2](../plan/master-plan.md))。UI コンポーネント・アイコン・複雑入力部品は、一般的なアプリ基盤に **汎用・常用** で必要な要素であり、v1 で採用対象とする(判定 = 汎用/常用 → v1)。

## 決定: shadcn/ui + lucide-react + 複雑入力を採用(v1)

- **UI コンポーネント = shadcn/ui**(Radix UI primitives + Tailwind、**copy-in** 方式)。生成コンポーネントは `components` カーネル([0021](0021-frontend-responsibility.md):横断 UI = デザインシステム的な純 UI)に配置する
- **アイコン = lucide-react**。同じく `components` カーネル配下の UI から参照する
- **複雑入力(日付ピッカー等)= shadcn 系部品**(`react-day-picker` などを Radix/Tailwind でラップした shadcn レシピ)。`components` に配置する。既定は控えめ(Medium)= 必要時に使う位置づけ
- boilerplate 本体の UI は、これら採用部品に加えて **Tailwind ユーティリティ**([0050](0050-styling-strategy.md))と feature 内 UI([0021](0021-frontend-responsibility.md))で構成する
- **v1 スコープの線引き**: v1 が抱えるのは上記の汎用 UI 基盤まで。より重い/局所的な UI 要件(リッチテキスト = TipTap、DnD = dnd-kit 等は [0053](0053-ui-component-interaction-seam.md))は v2 で順次同梱、それを超える要件は **fork 先で追加**する

## 0010 準拠(vendor-independent 正当性 + 非ロックイン)

本採用は [0010](0010-standards-and-non-lockin.md) の 2 原則(標準に乗る / 選択主体は設計者)を満たす。

**§1 標準・デファクトへの準拠**:

- Radix UI primitives は **WAI-ARIA Authoring Practices**(業界標準のアクセシビリティパターン)を実装した headless primitive であり、独自発明ではなく標準に乗っている
- lucide-react は SVG アイコンの事実上の標準(Feather 系譜)であり、アイコン名 API も一般的

**§2 vendor-independent 正当性材料**(「そのベンダーを正当化から抜いても成立するか?」):

- **shadcn/ui は copy-in(コードを本体に取り込む)方式**であり、npm 依存としての**バージョンロックが構造的に存在しない**。取り込んだ後は自リポジトリのコードであり、shadcn という配布元が消えても、更新を止めても、任意に改変しても成立する(可搬性 = 十分)。これは「shadcn だから」ではなく「**Radix の WAI-ARIA 準拠 primitive + Tailwind の組み合わせを、自コードとして所有できる**」という独立根拠で選んでいる(正当性材料 = 十分)
- lucide-react も、アイコンセットは他の SVG アイコン(Heroicons / Tabler 等)へ差し替え可能であり、参照は `components` カーネル内の UI に閉じる。vendor 直参照を feature に散らさないことで差替コストを局所化する
- 運用テスト(0010 §2): 「shadcn/lucide を正当化から抜いても、Radix primitive + Tailwind + SVG アイコンで純 UI を組む、というパターンは正当か?」→ Yes。乗っても縛られていない

**非ロックイン境界(adapters/カーネル境界)**:

- UI ライブラリへの依存は `components` カーネルに閉じ込める。feature / 各画面は `components` の公開 UI を参照し、Radix や lucide の import を feature 内に直接散らさない([0021](0021-frontend-responsibility.md) 昇格ルール:横断 UI → `components`)。これにより UI ライブラリの差し替えが `components` 内で完結する

**exact-pin + audit**([0004](0004-library-management.md)):

- lucide-react / react-day-picker / `@radix-ui/*` / `class-variance-authority` / `clsx` / `tailwind-merge` など、shadcn が引き込む実 npm 依存は **exact-pin** で追加(`pnpm add -E`)し、追加時に `pnpm audit` を実行する。メジャー更新は別 PR(0004)
- copy-in された shadcn コンポーネント本体はソースコードとして本体に取り込まれ、依存パッケージではない(pin 対象は上記の実依存のみ)

## 禁止事項

- ❌ Radix / lucide / react-day-picker を feature 内・各画面から直接 import すること(UI ライブラリ依存は `components` カーネルに閉じ込める。[0021](0021-frontend-responsibility.md) 昇格ルール)
- ❌ shadcn/ui 以外の UI コンポーネントライブラリ(MUI / Chakra / Ant Design 等、ランタイム同梱型)を並行採用すること([0050](0050-styling-strategy.md) の Tailwind 主軸 + CSS Modules 限定許可(ランタイム CSS-in-JS = styled-components / emotion は非採用)および copy-in 方針と衝突。必要なら ADR 改定)
- ❌ lucide-react 以外のアイコンライブラリを追加同梱すること(差し替えは可だが並行同梱はしない)
- ❌ 採用ライブラリを exact-pin / `pnpm audit` を経ずに追加すること([0004](0004-library-management.md))
- ❌ v1 スコープを超える重い UI 要件(リッチテキスト / 高度な DnD 等)を本 ADR の範囲で本体へ持ち込むこと(v2 = [0053](0053-ui-component-interaction-seam.md) / それ以上は fork)

## 関連 ADR

- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — 標準準拠 + 非ロックインの判断軸(本採用の正当化根拠)
- [0004-library-management.md](0004-library-management.md) — exact-pin / `pnpm audit` / メジャー更新は別 PR
- [0050-styling-strategy.md](0050-styling-strategy.md) — Tailwind 主軸 + CSS Modules 限定許可(styled-components / emotion は非採用。shadcn/ui のスタイル手段)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — `components` カーネル(採用 UI の配置先)・昇格規律(vendor 依存の閉じ込め)
- [0011-no-docker.md](0011-no-docker.md) — 表示層ロール(v1 でアプリケーション基盤へ性格更新)
- [0060-state-management.md](0060-state-management.md)(B5)— form state(react-hook-form + zod)採用。form 部品と対で機能する
- [0053-ui-component-interaction-seam.md](0053-ui-component-interaction-seam.md) — リッチテキスト(TipTap)/ DnD(dnd-kit)等、v2 で採用する局所 UI(本 ADR の v1 スコープ外)
