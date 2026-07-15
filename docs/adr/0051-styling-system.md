# スタイリング体系(デザイントークン・レスポンシブ・モーション・印刷)

[0050](0050-styling-strategy.md) が定めた **Tailwind 主軸 + CSS Modules 限定許可(styled-components / emotion は非採用)/ token = CSS 変数 / global と local の境界 / ダークモード = token 切替 + `prefers-color-scheme` 追従** という「器」を受けて、本 ADR はその中身 —— **デザイントークン体系(命名層とスケール)/ ブレークポイント・コンテナクエリ / モーション方針 / 印刷** —— を具体化する。0050 が「design token は CSS 変数」という枠のみを定めたのに対し、本 ADR は「その CSS 変数をどう構造化し、レスポンシブ・モーション・印刷という表現軸にどう展開するか」を定める。

[0010](0010-standards-and-non-lockin.md) の 2 原則(標準準拠 / 非ロックイン)に従い、ここで下す決定はいずれも **Tailwind を正当化から抜いても成立する CSS 標準・業界パターン**に乗る。boilerplate が固定するのは体系の「形」であって、具体的なパレット値・スケール刻み・モーションの見た目は fork 先の嗜好に委ねる。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。本 ADR は 0050 の具体化として独立起票したものであり、その内容自体はこの設計討議でユーザ確定済み。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

**バッテリー採用への転換(2026-07-14・v1)**: 従来「モーションライブラリ非同梱」としていた §3 を転換し、複雑モーション用途に Framer Motion(`motion` パッケージ)を **v1 で採用**する([docs/plan/adoption-matrix.md](../plan/adoption-matrix.md))。既定手段(CSS / View Transitions)は不変で、Framer は複雑ケースに限る。

## 背景

0050 は Tailwind v4 採用・`cn()` 置き場・design token = CSS 変数・ダークモード = token 切替を確定したが、**token の中身(命名層 semantic vs raw / spacing・typography・radius・shadow のスケール / `@theme` との対応)は「器のみで空白」**だった([adr-gap-audit.md](../plan/adr-gap-audit.md) #32)。同様に **ブレークポイント体系**(#31)・**モーション方針**(#21)・**印刷/PDF**(#28)も 0050 の射程外に残り、[adr-gap-triage.md](../plan/adr-gap-triage.md) で「0050 への追補」に仕分けられていた。本 ADR はこの 4 項目を 1 本に束ねる。

現状の `src/app/globals.css` は既に **2 層構造**(`:root` に生の色変数 → `@theme inline` で Tailwind の色トークンへ別名付け → `prefers-color-scheme: dark` で生変数を再束縛)を実装しており、本 ADR はこの de-facto を追認・一般化する。命名層を決めずに書き始めると、0050 が採用したダークモード(semantic な意味で色を参照し、テーマ切替を token 差し替えに閉じる)が破綻するため、体系の確定は最初の feature 実装に先行して効く。

## 決定

### 1. デザイントークン体系 = 2 層(primitive / semantic)

- token を **2 層**に分ける。この分離は [W3C Design Tokens](https://www.w3.org/community/design-tokens/) が標準化を進める業界パターンであり、CSS custom properties だけで成立する(**Tailwind を抜いても成立する** = 0010 §2 非ロックインの正当性材料)。
  - **primitive(生スケール)**: 意味を持たない生の値。色パレット(`--color-*` の raw ramp)・`--spacing-*`・`--text-*`(font-size / line-height)・`--font-weight-*`・`--radius-*`・`--shadow-*`。**Tailwind v4 の `@theme` に登録**し、ユーティリティを自動生成させる。
  - **semantic(意味別名)**: 用途を名指しした別名。`--color-bg` / `--color-fg` / `--color-muted` / `--color-border` / `--color-accent` 等。primitive を `var()` で参照する。**参照面(コンポーネント)の既定は semantic 層**とする。
- **色は semantic 経由でのみ参照**する(0050「色をハードコードせず token 経由」の具体化)。primitive を直接コンポーネントに撒かない。
- **テーマ切替(ライト/ダーク等)は semantic 別名の再束縛だけで完結**させる(`prefers-color-scheme` / `dark` variant で semantic の指す primitive を差し替える)。これが 0050 のダークモード決定を体系として成立させる要。既存 `globals.css` の `:root` → `@theme inline` → `dark` 再束縛の形を正典とする。
- token 定義は `globals.css`(またはそれが import する CSS)に集約する(0050 の global 集約方針を踏襲)。
- **スケールの対象軸**: color / spacing / typography(size・line-height・weight)/ radius / shadow。z-index スケールの token 化は本 ADR の 2 層モデルに乗る同型の関心だが、レイヤリング規約([adr-gap-triage.md](../plan/adr-gap-triage.md) #23)として `docs/rules.md` 側で扱う(本 ADR は「z も token 化する」土台のみ示す)。

### 2. レスポンシブ = viewport ブレークポイント(mobile-first)+ コンテナクエリ

- **Tailwind v4 の既定ブレークポイント**(`sm` 40rem / `md` 48rem / `lg` 64rem / `xl` 80rem / `2xl` 96rem)を追認する。fork 先がカスタムスケールへ差し替える場合も `@theme` の `--breakpoint-*` で行う(値の選択は fork 先の嗜好)。
- **mobile-first(min-width 基準)を明文化**する。これは Tailwind の既定挙動であると同時に CSS の一般作法であり、Tailwind 固有ではない(0010 §2)。無印がモバイル、`md:` 等で上書き加算していく。
- **コンテナクエリ(`@container`)を採用**する。これは Tailwind v4 のコア機能(プラグイン不要)であり、実体は **CSS 標準の `@container` / `container-type`**(Tailwind を抜いても成立 = 0010 §2)。
  - **使い分け**: ページ骨格・レイアウトシェル([0026](0026-layout-shell-mount.md))は **viewport ブレークポイント**、feature スライス内の再利用コンポーネントは **コンテナクエリ既定**。理由 = 機能スライスのコンポーネントは再利用文脈で割り当て幅が変わるため、viewport より「自分が置かれた器の幅」で分岐する方が局所推論に合う([0020](0020-adopted-architecture.md) の局所性原則)。

### 3. モーション = CSS / View Transitions 既定 + 複雑モーションに Framer Motion + reduced-motion 尊重

- **既定手段(不変)**: モーションの既定手段は **CSS transition / animation** と **View Transitions API**(ブラウザ標準 / Next.js は experimental フラグ〈`experimental.viewTransition`〉+ React 実験的 API で対応)とする。いずれもブラウザ標準機構であり、特定ライブラリに縛られない(0010 §2)。単純な hover / focus / enter・状態遷移・ページ遷移アニメーションはまずこの標準手段で書く。
- **複雑モーションに Framer Motion(`motion` パッケージ)を採用(v1)**: 標準の CSS / View Transitions では表現が破綻する複雑ケース —— **exit アニメーション(`AnimatePresence`)/ layout アニメーション(FLIP)/ ジェスチャ(drag・pan)/ 複数要素のオーケストレーション(stagger)/ 物理ベース(spring)** —— に限り、Framer Motion(現行パッケージ名 `motion`)を用いる。
  - **0010 §1(標準・デファクトへの準拠)**: Framer Motion は React エコシステムにおける宣言的モーションのデファクトであり、命名優先順位(React 規約 > 業界スタンダード)に沿う選択である。
  - **0010 §2(vendor-independent 正当性材料)**: 採用根拠は「Framer が推奨するから」ではない。上記の複雑ケース(特に **exit アニメーション** = 要素がアンマウントされる前の退場遷移)は **CSS / View Transitions だけでは構造的に表現できない**(React のアンマウント制御と DOM 生存期間の噛み合わせが必要)。この「標準では届かない具体的欠落を、宣言的 API で埋める」という根拠は Framer という固有ベンダーを抜いても成立する(同種の代替 = React Spring / GSAP / Motion One 等の中から、宣言的・React 統合・a11y 配慮という独立根拠で Framer を 1 要因として選択した)。既定を標準手段に置き Framer を複雑ケースに限定する境界そのものが、非ロックインの運用テスト(「Framer を抜いても既定モーションは成立するか」= Yes)を満たす。
  - **置き場 = `components`**: Framer Motion(`motion.*` コンポーネント / `AnimatePresence` / `useAnimate` 等)への **vendor 直参照は `components` 層に閉じる**。feature スライス側に `motion` を直接撒かず、モーション付き UI は再利用可能なコンポーネントとして `components` にラップして提供する(0010 §2「adapters / カーネル境界の裏に置き差し替え可能に保つ」の具体化 = vendor 差し替え時の影響面を `components` に局所化)。
  - **依存管理**: `motion` は core dep として **exact-pin**(`pnpm add -E`)し、追加時に **`pnpm audit`** を実施する([0004](0004-library-management.md))。major 更新は別 PR で扱う。
- **`prefers-reduced-motion` の尊重を必須**とする(Tailwind の `motion-reduce:` / `motion-safe:` variant、`@media (prefers-reduced-motion)`、または Framer Motion の `useReducedMotion` フックで実装)。reduced-motion の尊重は WCAG SC 2.3.3 Animation from Interactions(**Level AAA**)に対応する。AA には該当を直接義務付ける SC はないが、本プロジェクトはユーザ体験配慮として `prefers-reduced-motion` を尊重する。**この強制の根拠水準(AAA)は本 ADR で明記**し、本 ADR は「モーション実装時に reduced-motion 分岐を欠かさない」という体系側の帰結を持つ。Framer Motion を用いる場合も reduced-motion 尊重は同じく必須(退場・layout・spring も低減対象)。

### 4. 印刷 / PDF = print CSS(フロント拡張点)/ PDF 生成(backend 境界 seam)

- **境界判定(「別ドメインか?」)** により、印刷関心を 2 分する。
  - **print CSS = フロント領域の拡張点**。Tailwind の **`print:` variant / `@media print`**(CSS 標準)を、印刷体裁を与える**名前付きの拡張点**として定義する。0050 の global 集約に従い、print 用のグローバル調整が要る場合は `globals.css` に置く。
  - **PDF 生成 = backend ドメイン = 境界 seam で切る**。サーバサイド PDF レンダリング(Puppeteer / 帳票エンジン等)はバックエンド責務([0070](0070-backend-role-separation.md))であり、フロントは「印刷可能な HTML/CSS を提供する」ところまでを担い、その先は境界 seam として名前を付けて切る(表示層で PDF を生成しない)。
- print CSS の**最小実装を 0.0.x で同梱するか実装 PR に先送りするか**は用途依存で割れるため、本 ADR は**拡張点(`print:` / `@media print` という座)の定義に留め**、最小 print reset の同梱是非は実装フェーズの判断とする(下記「補足」参照)。

## 禁止事項

- ❌ semantic 層を飛ばして primitive(生スケール)や色リテラルをコンポーネントに直接撒くこと(テーマ切替が token 差し替えに閉じなくなる。§1)
- ❌ token 命名層(primitive / semantic)を無視した ad-hoc な CSS 変数を各所に増やすこと。新規 token は `@theme` の primitive か semantic 別名として定義する
- ❌ feature スライス内の再利用コンポーネントのレスポンシブを、器の幅で分岐すべき箇所で viewport ブレークポイントに固定すること(§2 の使い分けに反する)
- ❌ モーションを `prefers-reduced-motion` 分岐なしで実装すること(§3 / [0100](0100-accessibility-target.md))
- ❌ CSS transition / animation / View Transitions で足りる単純モーションに Framer Motion を持ち出すこと(既定は標準手段。Framer は exit / layout / gesture / orchestration / spring の複雑ケースに限る。§3)
- ❌ Framer Motion(`motion.*` / `AnimatePresence` 等)の vendor 直参照を feature スライスに散らすこと(vendor 参照は `components` 層に閉じ、差し替え可能に保つ。§3 / [0010](0010-standards-and-non-lockin.md))
- ❌ Framer Motion 以外の別モーションライブラリ(GSAP / React Spring 等)を勝手に併存させること(採用は Framer Motion に一本化。追加が必要なら ADR 改定でユーザ確定)
- ❌ 表示層で PDF をサーバ生成する実装を持ち込むこと(backend 境界 seam を越える。§4)

## 補足

- **Figma → CSS 変数 同期は本 ADR の射程外**。token の**体系(命名層・スケール軸)**のみを本 ADR が定め、デザインツールとの**同期方式**(Figma variables → CSS の生成/取り込み)は未 frame(実装 PR / fork 先で確定)とし、本 ADR の射程外とする。本 ADR で同期方式に踏み込むと後続決定と矛盾しうるため、意図的に体系のみへ限定した。
- **モーションライブラリ採用の帰属**は 0050 系(本 ADR)と [0052](0052-ui-component-policy.md)(UI ライブラリ)で射程が重なる。v1 バッテリー採用への転換により、モーション手段(既定 = CSS / View Transitions、複雑ケース = Framer Motion)の**採用決定は本 ADR が所有**する([docs/plan/adoption-matrix.md](../plan/adoption-matrix.md) ③)。0052 が扱う UI コンポーネントライブラリ(shadcn/ui 等)とは関心が別のため、モーションは本 ADR 側で一元管理する。両 ADR の相互参照の最終整合(0052 → 本 ADR back-link)は最終整理フェーズで付与する。
- **`prefers-reduced-motion` 必須化の根拠水準**は本 ADR で明記する。reduced-motion 尊重は WCAG SC 2.3.3(**Level AAA**)に対応し、AA には直接の該当 SC がない —— したがって 0100(a11y AA 目標)は motion 尊重を直接の義務としては持たない。本 ADR は AA 準拠とは独立に、ユーザ体験配慮として `prefers-reduced-motion` を必須とする立場を採り、その強制根拠水準(AAA)は本 ADR 側で明記して齟齬を残さない。0100 本体は Accepted の Protected Documentation のため本 ADR 作成時点では相互参照の back-link を付さない(最終整理フェーズで付与)。
- **print CSS 最小実装の同梱是非**は保留(0.0.x は拡張点の定義まで)。fork 先の帳票要件の有無で最小実装の要否が割れるため、強引に「同梱する/しない」を確定しない。
- 0050 は Accepted の Protected Documentation のため、本 ADR 作成時点では 0050 本体への追補・back-link 付与は行わない。0050 → 本 ADR の相互参照は AGENTS.md 整合・v1 大規模整理と同じ最終整理フェーズでまとめて付与する。
- 本 ADR は [0140](0140-documentation-operations.md) のタクソノミーにおいて **decision** 分類に属する(体系の決定であり、日常強制される rule = Tailwind クラス順序等は `docs/rules.md` 側 / triage #34)。

## 関連 ADR

- [0050-styling-strategy.md](0050-styling-strategy.md)(B1)— 本 ADR の親。Tailwind 主軸 + CSS Modules 限定許可(styled-components / emotion は非採用)/ token = CSS 変数 / ダークモード = token 切替という器を定める(本 ADR がその中身を具体化)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — 標準準拠 / 非ロックインのメタ判断軸(token 2 層・`@container`・View Transitions・`@media print` はいずれも Tailwind を抜いて成立する CSS 標準に乗る / Framer Motion 採用も §1 デファクト準拠 + §2 vendor-independent 正当性 + `components` 局所化で担保)
- [0004-library-management.md](0004-library-management.md) — ライブラリ方針(`motion` は exact-pin + `pnpm audit` / major 更新は別 PR。§3)
- [0100-accessibility-target.md](0100-accessibility-target.md)(C2)— a11y 目標(WCAG AA)。reduced-motion 尊重は WCAG SC 2.3.3(AAA)に対応し AA 直接義務ではないため、その根拠水準は本 ADR §3 側で明記(Framer Motion 使用時も同じく必須)
- [0052-ui-component-policy.md](0052-ui-component-policy.md)(B2)— UI コンポーネントライブラリの採用(shadcn/ui 等)。モーションライブラリの採用帰属は本 ADR 側に一元化(補足参照)
- [0020-adopted-architecture.md](0020-adopted-architecture.md) / [0026-layout-shell-mount.md](0026-layout-shell-mount.md) — 局所性原則 / レイアウトシェル(§2 の viewport vs コンテナクエリ使い分けの土台)
- [0070-backend-role-separation.md](0070-backend-role-separation.md)(A2)— PDF サーバ生成を切り出す backend 境界(§4)
- [docs/plan/adr-gap-triage.md](../plan/adr-gap-triage.md) — 本 ADR の由来項目 #32 / #31 / #21 / #28 の disposition
