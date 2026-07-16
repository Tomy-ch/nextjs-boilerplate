# 採用マトリクス案(バッテリー同梱 = v2 ロードマップ)

作成: 2026-07-14 / 状態: **確定(2026-07-14)**
方針(ユーザ 2026-07-14): **(A) バッテリー同梱を既定**。ただし実使用可能性が低いもの(i18n 等)は**濃淡**(薄い採用=seam + 一部使用)。据え置き除外 = 印刷CSS / キーボードショートカット / Prettier / Renovate。
**採用時期の二段構え(ユーザ 2026-07-14 確定):**

- **v1 = 一般的な Next.js アプリケーション基盤**として **必要なライブラリはすべて入れる**(汎用・常用)。
- **v2 = 局所的に使うライブラリ**を順次同梱していく(situational・niche)。

→ 従来の「最小・用途未定」路線から **v1 で必要ライブラリを採用**へ転換。下記「v1/v2 振り分け(提案)」で分類。滑走路(seam)は v2 採用まで存続。

## v1 / v2 振り分け(2026-07-14 確定)

判定基準 = 「一般的な Next.js アプリ基盤に**必要(汎用・常用)**か / **局所的(用途依存)**か」。

**v1(必要・汎用 → 採用):**

- UI コンポーネント(shadcn/ui)+ アイコン(lucide)+ 複雑入力(shadcn 系)= 0052
- form state(react-hook-form + zod)= 0060
- グローバル状態(Zustand。既定は local・真の global に限る)= 0060
- 表示フォーマット(Intl。0120 既定)+ 日付演算(date-fns)= 0120
- 観測性/エラー(OTLP/OTel vendor-neutral。vendor SDK 非同梱・Session Replay 不要=ユーザ選択 c)= 0081
- モーション(Framer Motion。既定 CSS/View Transitions + lib)= 0051 ← **v1 採用確定**

**v2(局所・用途依存 → 順次同梱):**

- i18n(next-intl)= 0121 ／ リッチテキスト(TipTap)= 0053 ／ DnD(dnd-kit)= 0053
- 決済(Stripe)= 0075 ／ 分析(PostHog)= 0082 ／ WebSocket・SSE = 0074 ／ feature flag = 0074
- PWA(Serwist)= 0130 ／ Cookie 同意 = 0131

**据え置き除外(v1/v2 とも入れない):** 印刷CSS / キーボードショートカット / Prettier / Renovate

**プラットフォーム機能(ライブラリでない・別軸):** Cache Components / React Compiler / taint(保守=無効のまま安定化待ち)/ ④保留の hook・機構(離脱ガード等は capabilities で v1 実装可)

### 3 判断の確定(ユーザ 2026-07-14)

- **① Zustand の家 = 新カーネル `stores`(11 個目・独立 ADR 0023)**。横断(複数 feature 共有)client 状態を置く。非横断は feature 内。0021 昇格ルールに「横断 client 状態 → `stores`」の出口を追加。命名 = `stores`。
- **② CSS-in-JS = CSS Modules のみ限定許可**(Tailwind で書きづらい複雑スタイルのエスケープハッチ)。**styled-components / emotion は非採用**(ランタイム CSS-in-JS で RSC 既定 0040 と衝突)。0050 に一節追加。
- **③ モーション = Framer Motion 採用(v1)**。既定は CSS/View Transitions、複雑(exit/layout/gesture/orchestration)は Framer Motion。0051 が所有。

### v1 実行スコープ(確定)

- **新カーネル `stores`**: 0020(10→11)/ 0021(責務・マトリクス・昇格 4→5 出口)/ 0027(構造)+ 独立 ADR 0023(capabilities=0022 と同型)
- **exclusion→採用 の書き換え(v1)**: 0050(+CSS Modules escape hatch)/ 0052(shadcn+lucide+複雑入力)/ 0060(react-hook-form+zod / Zustand→stores)/ 0081(OTLP/OTel vendor-neutral・vendor SDK 非同梱)/ 0051(Framer Motion)/ 0120(date-fns+Intl)
- **v2 据え置き(seam のまま・「v2 採用予定」注記)**: 0121 i18n / 0053 TipTap・DnD / 0075 Stripe / 0082 PostHog / 0074 WebSocket・flag / 0130 PWA / 0131 consent
- **0011**: 「用途未定の表示層」→「アプリケーション基盤」に性格更新(v1・Protected)
- **並行**: 多主題 ADR(0051/0042/0044/0045/0048/0049)の厳密分割 / Storybook 採用 ADR / route-as-modal の 0040 追補
- 全採用は **0010 = vendor-independent 正当化 + adapters/seam 越しで差替可能** を必須。exact-pin + audit(0004)

## 前提の転換(v2 時点・要注意)

- **0011「用途未定の表示層」→「オピニオン付き全部入り starter」** への性格転換は **v2 時点**。0.0.x/v1 の 0011 は現状維持。
- **滑走路のライフサイクル整合**: 従来「滑走路は v1.0.0 で卒業=削除」としたが、v2 採用が視野に入るなら **滑走路(seam)は v1 を跨いで存続し v2 で採用が載る**。滑走路論の lifecycle 注記を「v1.0.0 で削除」から「v2 採用まで存続(fork は随時採用可)」に見直す必要(要ユーザ確認)。
- **0010 非ロックイン整合の条件**: 特定ベンダーを採っても **adapters / カーネル境界の裏に置き差し替え可能に保つ**(vendor 直参照を feature/component に散らさない)。exact-pin + `pnpm audit`([0004](../adr/0004-library-management.md))。
- ベンダーは**デファクト**を選ぶ(0010 §1「標準に乗る」)。下記は提案。**差し替え候補・濃淡はユーザが確定**。

## 濃淡の定義

- **Full**: 常用。深く統合し参照実装まで同梱。
- **Medium**: 統合するが既定は控えめ(必要時に使う)。
- **Thin**: seam + 配線 + 最小デモのみ(実使用は fork 次第)。

## ① ライブラリ採用マトリクス

| # | 対象 | 提案ベンダー(デファクト) | 濃淡 | 置き場 / seam | 該当 ADR(exclusion→採用) |
| --- | --- | --- | --- | --- | --- |
| UI | UI コンポーネント | **shadcn/ui**(Radix + Tailwind・copy-in) | Full | `components` | 0052 |
| ICON | アイコン | **lucide-react** | Full | `components` | 0052 |
| FORMC | 複雑入力(日付ピッカー等) | shadcn(react-day-picker 等) | Medium | `components` | 0052/0041 |
| STATE | グローバル状態 | **Zustand** | Medium(既定は 0060 local・真の global のみ) | `stores` カーネル(0023)確定 | 0060 |
| FORM | form state | **react-hook-form** + `@hookform/resolvers` + zod | Full | `features`/`components` | 0060 |
| MOTION | モーション | **Framer Motion(`motion`)** | Medium(既定は CSS/View Transitions・複雑時 lib) | `components` | 0051 |
| I18N | i18n | **next-intl** | **Thin**(seam + `[locale]` + 一部使用) | `proxy.ts`/`app`/`model` | 0121/0120 |
| DATE | 日付演算 | **date-fns**(表示 format は Intl 維持) | Thin | `model` | 0120 |
| RICH | リッチテキスト | **TipTap** | Thin(seam + sanitizer + デモ) | `components` | 0053 |
| DND | DnD | **dnd-kit**(a11y) | Thin | `components`/`capabilities` | 0053 |
| RUM | 観測性/RUM | **OTLP/OTel(vendor-neutral)**・vendor SDK 非同梱(Session Replay 不要=ユーザ選択 c) | Medium | `observability`/`adapters` | 0081 |
| ANALYTICS | プロダクト分析 | **PostHog**(adapter 抽象 + no-op 既定) | Thin | `adapters/client` | 0082 |
| PAY | 決済 | **Stripe(`@stripe/stripe-js` + Elements)** | Thin(mount seam) | `components`/`adapters` | 0075 |
| CSS | CSS-in-JS | **CSS Modules のみ限定許可**(styled-components/emotion 非採用) | Thin(escape hatch) | `components`(局所) | 0050 |

## ② 機能採用

| 対象 | 提案 | 濃淡 | ADR |
| --- | --- | --- | --- |
| PWA | **Serwist(`@serwist/next`)** | Medium | 0130 |
| Cookie 同意 | 軽量 consent 機構(adapter 抽象) | Medium | 0131 |
| WebSocket/SSE | native(EventSource/WebSocket)+ 薄い client | Medium | 0074 |
| feature flag | env 既定 + adapter(GrowthBook 等差替可) | Thin | 0074 |

## ③ 0.0.x 無効 → 有効

| 対象 | 変更 | ADR |
| --- | --- | --- |
| Cache Components(PPR) | `cacheComponents: true` 有効化 | 0041 |
| React Compiler | 有効化(babel-plugin 追加) | 0042 |
| React taint API | 有効化 | 0030 |

## ④ 保留 → 採用

離脱ガード(#14)/ オンライン・オフライン検知(#30)/ Web Worker(#58・オフロード seam)/ メンテナンスモード(#64・proxy rewrite)/ visual regression(#71・Playwright スクショ)。多くは `capabilities` の hook・機構として実装。

## 衝突の解決(2026-07-14 確定)

1. **CSS-in-JS(0050)**: **確定 = Tailwind 主・CSS Modules のみエスケープハッチとして限定許可**。styled-components / emotion は非採用(ランタイム CSS-in-JS で RSC 既定 0040 と衝突)。「3 判断の確定」② の通り。
2. **グローバル状態(Zustand)vs 0060**: 既定は local-first(0060)を維持し、Zustand は「真に横断する client 状態」に限定。0060 を「exclusion → 既定 local + Zustand 採用」に反転。
3. **STATE / feature flag / consent の置き場**: **確定 = 新カーネル `stores`(0023)**。横断(複数 feature 共有)client 状態を置く(非横断は feature 内)。capabilities は runtime 能力・hook 限定のまま。「3 判断の確定」① の通り。
4. **date-fns vs Intl(0120)**: 表示 format は Intl 維持・date-fns は日付演算に限定(二重にしない)。

## 実行方針(確定後)

規模が大きい(exclusion→採用の ADR 書き換え ≈ 0050/0012/0013/0021/0024/0031/0032/0040/0041/0042/0043/0045/0046/0047/0048/0049 + 0011 性格更新 + 0030)。**ワークフローで一括書き換え → Fable 検証**。各 ADR に 0010 の vendor-independent 正当化 + seam 越し + 差替可能性を明記。
