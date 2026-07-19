# nextjs-boilerplate 構成計画(master plan)

本書は、この Next.js boilerplate を実装(構成)していくための土台となる統合計画書である。役割分担は次のとおり:

- **決定の正 = ADR**(`docs/adr/00NN-*.md`)。確定した設計判断は各 ADR 本体が唯一の正であり、本書は再掲しない(ADR 番号 + 相対リンクで参照する)
- **進捗ボードの正 = [docs/adr/BACKLOG.md](../adr/BACKLOG.md)**。各 ADR / 枠 ID の「選定済み / 実装済み」ステータスは BACKLOG.md が正であり、本書は個別ステータスを再掲しない
- **本書 = ADR 外の確定事項 + 実装ロードマップ**。ADR に載らない確定事項(滑走路原則・採用ロードマップ・棄却)と、ADR を実装へ落とすための工程計画を集約する

- 生成日: 2026-07-18
- 本書は旧 `docs/plan/` 配下 9 ファイル(設計フェーズの計画・監査・仕分け文書)の統合後継である。それら 9 ファイルの決定内容は ADR 0001〜0155 へ転記済みのため破棄した。経緯・比較検討・訂正過程は git 履歴を参照のこと
- 次工程 = 本書の各項目を ADR と突き合わせ、実装ロードマップ(第 2 章)を Phase 順に着手する

---

## 1. ADR 外の確定事項

### 1.1 滑走路(out-of-scope-runway)原則 — 0.0.x 限定の構築原則

この原則はどの ADR にも存在しない。意図的に ADR の外に置いている(恒久判断軸 [0010](../adr/0010-standards-and-non-lockin.md) や恒久責務 [0021](../adr/0021-frontend-responsibility.md) を濁さないため)。**本書がこの原則の唯一の正である。**

- **定義**: out-of-scope ≠ 沈黙の省略。フロント領域の関心事なら、一概に切り捨てず **滑走路**(明示的な名前を付けた拡張点 = seam)を敷く。形は 2 種 — ① 動くローカル最小機構(local 代替のクラス / 機構)/ ② インターフェース(IF / port)定義。境界判定は **「別ドメイン(infra / backend)の責務か?」** の一問。純粋な除外で終わってよいのは (a) 別ドメインの責務、(b) 機能 seam でない非機能 tooling 選択、の 2 つのみ。**「白紙 = 名もなき省略」が共通の敵**であり、滑走路はそれへの構造的回答である
- **ライフサイクル**: 滑走路は v2 採用まで存続する(fork 先は随時採用してよい)。当初は「v1.0.0 で卒業 = 削除」としていたが、v1 / v2 二段構えの確定(2026-07-14)に伴い「v2 採用まで存続」へ改訂した

### 1.2 採用ロードマップ(v1 / v2 二段構え・2026-07-14 確定)

- **方針**: v1 = 一般的な Next.js アプリケーション基盤に必要な汎用・常用ライブラリを全採用 / v2 = 局所的(用途依存)なライブラリを順次同梱していく
- **v1 採用**(ADR 反映済みのため参照のみ): [0052](../adr/0052-ui-component-policy.md)(shadcn/ui + lucide)/ [0060](../adr/0060-state-management.md)(react-hook-form + zod + Zustand。横断 client 状態は `stores` = [0023](../adr/0023-stores-kernel.md))/ [0051](../adr/0051-styling-system.md)(Framer Motion)/ [0081](../adr/0081-observability-logging.md)(OTLP vendor-neutral)/ [0120](../adr/0120-locale-aware-formatting.md)(date-fns + Intl)/ [0050](../adr/0050-styling-strategy.md)(CSS Modules 限定許可)

#### v2 採用マトリクス(局所・用途依存 → 順次同梱)

| 対象 | ベンダー(デファクト) | 濃淡 | 置き場 / seam | 該当 ADR |
| --- | --- | --- | --- | --- |
| i18n | next-intl | Thin | `proxy.ts` / `app` / `model`(seam + `[locale]` + 一部使用) | [0121](../adr/0121-i18n-strategy.md) |
| リッチテキスト | TipTap | Thin | `components`(seam + sanitizer + デモ) | [0053](../adr/0053-ui-component-interaction-seam.md) |
| DnD | dnd-kit | Thin | `components` / `capabilities` | [0053](../adr/0053-ui-component-interaction-seam.md) |
| 決済 | Stripe(`@stripe/stripe-js` + Elements) | Thin | `components` / `adapters`(mount seam) | [0076](../adr/0076-payment-ui-seam.md) |
| プロダクト分析 | PostHog | Thin | `adapters/client`(adapter 抽象 + no-op 既定) | [0082](../adr/0082-client-observability.md) |
| WebSocket / SSE | native + 薄い client | Medium | `adapters/client` | [0074](../adr/0074-runtime-communication-seam.md) |
| feature flag | env 既定 + adapter | Thin | `adapters` | [0078](../adr/0078-dynamic-feature-flag-seam.md) |
| PWA | Serwist(`@serwist/next`) | Medium | `app/manifest.*` | [0130](../adr/0130-pwa-strategy.md) |
| Cookie 同意 | 軽量 consent 機構 | Medium | `proxy.ts` / client state | [0131](../adr/0131-cookie-consent.md) |

- **濃淡の定義**: Full = 常用・深く統合・参照実装まで同梱 / Medium = 統合するが既定は控えめ(必要時に使う)/ Thin = seam + 配線 + 最小デモのみ(実使用は fork 次第)
- **プラットフォーム機能**(ライブラリとは別軸): Cache Components([0041](../adr/0041-cache-components-decision.md))/ React Compiler([0042](../adr/0042-react19-rendering-api.md))/ React taint API([0030](../adr/0030-environment-variable-management.md))= 現状は無効のまま安定化待ち → 有効化予定
- **保留 → 採用の 5 件**(多くは `capabilities` の hook・機構として v1 実装可): 離脱ガード(navigation-block hook = [0022](../adr/0022-capabilities-kernel.md) に記載)/ オンライン・オフライン検知(`useConnectivity` = 同)/ Web Worker(**オフロード seam。どの ADR にも記載がなく本行が唯一の記録**)/ メンテナンスモード(proxy rewrite 機構 + env フラグ seam。capabilities ではなく proxy 側)/ visual regression(Playwright スクリーンショット)
- **全採用の共通条件**: [0010](../adr/0010-standards-and-non-lockin.md) の vendor-independent 正当化 + adapters / seam 越しで差し替え可能に保つ(vendor 直参照を feature / component に散らさない)+ exact-pin + `pnpm audit`([0004](../adr/0004-library-management.md))

### 1.3 棄却(据え置き除外)

- **v1 / v2 とも採用しない 4 件**: 印刷 CSS / キーボードショートカット / Prettier / Renovate
- **ADR 化済みの exclusion**(参照のみ): [0121](../adr/0121-i18n-strategy.md)(i18n 本体)/ [0130](../adr/0130-pwa-strategy.md)(PWA 本体)/ [0131](../adr/0131-cookie-consent.md)(Cookie 同意本体)等
- [0011](../adr/0011-no-docker.md) の性格転換(「用途未定の表示層」→「オピニオン付き全部入り starter」)は **v2 時点**の話。0.0.x / v1 の 0011 は「アプリケーション基盤」で現状維持とする(0011 は Protected であり、書き換えはユーザ承認を要する)

---

## 2. 実装ロードマップ

### 2.0 現在地(2026-07-18)

全 ADR は Accepted 済みであり、主戦場は実装ギャップの解消である。個別枠のステータス(選定済み / 実装済み)の正は [BACKLOG.md](../adr/BACKLOG.md) であり、本書では再掲しない。

- 実装済み: G1・G2・T1・T3・R1・D3〜D5
- 導入済みのローカル基盤: lefthook + markdownlint / mermaid-lint + biome
- 未導入: `.github/workflows/` ・ `docs/rules.md` ・ `docs/portal/` ・ `env/` ・テスト FW ・ commitlint
- `src/` は `app/` のみ(カーネル群は未実体化)

### 2.1 Phase 1 残: フック + 品質検査

lefthook(PR 1-1 の一部)と markdownlint + mermaid-lint(PR 1-2)は導入済みのため、残りのみを記す。

- **commitlint**: `@commitlint/cli` を devDependency(exact pin)で追加(mise `npm:` バックエンドではなく lefthook と同居 = [0151](../adr/0151-git-hooks.md) 整合)+ go 側 config 移植(prefix 11 種は [0150](../adr/0150-git-workflow.md) と同一)+ lefthook の commit-msg 接続 + `commitlint.mk`
- **gitleaks + trivy**: mise(aqua)へ登録 / `.gitleaks.toml` 移植 / `make secret-scan`・`make trivy-fs` / pre-push 接続。ローカル先行導入は [0151](../adr/0151-git-hooks.md) の範囲内
- **actionlint 先行移植**([0153](../adr/0153-ci-configuration.md) の受け皿)/ `make help` の未文書化警告 / setup スクリプト拡充(repo 参照書換・`package.json` name 書換)
- 保護対象パス(`package.json` / `mise.toml` / `Makefile` / `.lefthook.yaml` 等)は都度ユーザ指示を得る

### 2.2 Phase 2: CI 基盤([0153](../adr/0153-ci-configuration.md) / [0110](../adr/0110-security-operations.md) の実装)

- **PR 2-1**: `upsert-pr-comment` composite action(as-is 移植・全レポーティングの背骨)+ lint / typecheck / build / lockfile-drift + 起動スモーク(`next start` → `curl`)+ workflows README
- **PR 2-2**: CodeQL(js-ts・PR + push baseline + 週次 cron)/ gitleaks workflow / trivy 二段(dev advisory・release strict)/ `dependabot.yml`(cooldown patch 5 / minor 7 / major 30)/ `SECURITY.md`(報告窓口・前半のみ)
- **PR 2-3**: actions SHA ピン機構の TS 書換(resolve / apply / check + `actions-pin.toml` + min-age-days 検疫)+ actions-pin スキル(BACKLOG C-6 と統合)
- **完了条件**: required check の branch ruleset 反映
- **0153 スコープ外の残余候補**(採否未判断・go 側 CI からの持ち越し。Phase 2 実装時に採否を確定する): sync-versions-check(`mise.toml` SSOT ↔ CI の Node 版数 drift 検査)/ auto-generate-docs(bot による生成物更新 PR の自動作成 + 再帰防止 guard)

### 2.3 Phase 3: docs portal([0141](../adr/0141-portal-operations.md) の実装)

- portal 基盤移植(`docs/portal/manifest.yaml` + gen-portal-docs / gen-docs-json / build-portal スクリプト + React SPA。Go 結合ゼロ・manifest 中身と除外リスト差替のみ)
- deploy-docs workflow(GitHub Pages・Phase 2 後)+ portal-manifest-sync スキル復活
- deps は pnpm devDependencies([0004](../adr/0004-library-management.md) 準拠)

### 2.4 Phase 4: env / 型付き Config([0030](../adr/0030-environment-variable-management.md) の実装)

- zod ベースの型付き Config loader(`#` private + getter の不変 Config・server / client 分割)+ `env/` レイアウト + 変数表 README
- new-env スキル再設計([0155](../adr/0155-claude-skills-development.md) 記載の既知課題。go 由来パス → 実パス差替。`.claude/` 変更はユーザ指示必須)

### 2.5 Phase 5: テスト基盤([0090](../adr/0090-testing-strategy.md) / [0091](../adr/0091-test-verification-methods.md) の実装)

- Vitest + RTL + MSW + Playwright 導入 + `make test` / `test-cached` の二層(CI 厳格・キャッシュ無効 / pre-commit 高速)+ lefthook 接続
- カバレッジ 90% ゲート + PR レポートを CI に追加([0153](../adr/0153-ci-configuration.md) の枠に載せる)
- C-5(テスト scaffold スキル)移植、full-apply / node-upgrade / repo-ops スキルの `pnpm test` 条件分岐見直し

### 2.6 カーネル物理実装 + フロント実装レール(B 節 14 仕掛け)

以下は丸ごと未 ADR・未実装の計画(哲学を横断的に成立させる仕掛け 14 件)であり、要点を保持する。

- **哲学 3 本柱**: ① 考えないでもフロントが組める ② デザイン(Figma 等)+ README を見れば実装できる ③ 責務分離されていて綺麗に実装できる

| # | 仕掛け | 効く柱 | 形態 | 要点 |
| --- | --- | --- | --- | --- |
| B1 | feature README = 仕様書テンプレート | ②① | rule+decision | 必須セクション(route / 使う operationId / 状態表 × Figma フレーム / 依存カーネル / Action 戻り値契約 / テスト観点)。テンプレ置き場 = `docs/templates/feature-readme.md`。readme-review の採点基準に接続 |
| B2 | スキャフォールドジェネレータ `pnpm gen` | ①③ | tooling+decision | `gen feature/component/adapter` で命名・配置・境界・テストを生成時点で正に |
| B3 | 契約駆動モック一気通貫(orval→MSW) | ①② | decision+tooling | OpenAPI → MSW + faker を生成し dev モック / integration / e2e を 1 パイプに |
| B4 | アーキテクチャ・マニフェスト SSOT | ③ | tooling+rule | `architecture.ts` に依存マトリクス・公開面・禁止名を宣言 → 各成果物生成 + drift ゲート |
| B5 | ゴールデンパス feature 同梱 | ①② | reference | 一覧 → 詳細 → フォームで全 ADR の交差点を踏む実物 + 削除コマンド |
| B6 | 意図別プレイブック「〜したくなったら」 | ① | reference | 意図 → 置き場 → 使う型 → 模範コードの逆引き + 決定木 |
| B7 | UI 状態契約(全画面 4 状態必須)+ Figma 状態マッピング | ②③ | rule | loading / empty / error / success を README 状態表で Figma と共有契約化。欠落は差し戻し |
| B8 | `ActionState<T>` 型をシップ | ①③ | decision+reference | フォーム戻り値の標準型をカーネルにコードで同梱。型が「考えない」を強制 |
| B9 | デザイントークン同期パイプ(Figma→CSS 変数) | ② | decision+tooling | Figma Variables = SSOT → W3C Tokens JSON → Tailwind v4 `@theme`。do-not-edit + drift ゲート |
| B10 | 決定 → 機械強制トレーサビリティ台帳 | ③ | rule+tooling | 各 ADR の enforcement 方式を明記し「散文のみ」削減を v1 KPI 化 |
| B11 | 構造 CI ゲート(README 必須節・feature 完全性 lint) | ②③ | tooling | README + 必須見出し + 4 状態行の存在、README 列挙 export と実ファイル突合 |
| B12 | 実装スキル `new-feature`(全提案を束ねる AI 動線) | ①②③ | tooling | Figma + feature 名 → B6 読込 → B2 生成 → B1 README 記入 → B3 モックで実装 → B11 ゲート |
| B13 | カーネル公開面の物理規約 + per-kernel 機械可読 frontmatter | ③ | rule+tooling | barrel 可否確定 + 各 README 冒頭に `imports-allowed:` / `forbidden:` / `test-requirement:` |
| B14 | Definition of Done を PR テンプレへ焼き込む | ③② | rule | 4 状態 / a11y 手動チェック / README 更新 / カバレッジ例外記録 |

- **最重要打ち手 = B1 + B2 + B5**「仕様書付きスキャフォールド」の一体運用。理由 = スキャフォールドだけが「迷いが発生する前」に介入できる唯一の装置であり、lint / CI は事後の防波堤、プレイブックは迷子の救済にすぎない。次点 = B3(orval → MSW)・B10(kebab lint 化等)は既選定ツールの標準機能で実現でき追加コストが小さい
- **B 吸収成果物**(ADR 化せずコードで確定する主要 6 件): 素の form 書き方 + `ActionState<T>` 同梱([0061](../adr/0061-form-mutation-ux.md) / [0080](../adr/0080-error-handling.md) と接続)/ barrel・公開面の物理表現(B4 / B13 → ESLint boundaries 実装をアンブロック)/ ゴールデンパス feature(B5)/ E2E・dev モック戦略(B3 orval → MSW)
- **型生成パイプライン導入**([0072](../adr/0072-api-type-generation.md) の実装 PR・カーネル実装と同時期): setup マニフェスト + `gh` 取得 + short SHA スタンプ + `make gen-api` 相当 + 生成物 drift ゲート CI。setup スクリプトは go `scripts/setup/` の翻案、C-4(scaffold-endpoint 系スキル)移植と同時期
- **進め方**: A 節の decision で B 節が自然に決めるものは二重決定しない / tooling・reference は ADR 不要(規約に昇格するものだけ ADR 化)

### 2.7 rules.md 新設 + 初期 33 エントリ

rule クラスの規約は **ADR には書かない**(タクソノミー = [0140](../adr/0140-documentation-operations.md))。`docs/rules.md` が新設されるまでの間、**以下の一覧が rule 内容の唯一の担い手**である。

- **前提**: `docs/rules.md` の新設は [0140](../adr/0140-documentation-operations.md) で方針 Accepted 済み。ただし新設の実行は AI Modification Scope の許可パス外のためユーザ指示を要する。各 rule に `> Rationale: [ADR-NNNN]` の逆参照を付す
- #4・#5 は既決 ADR([0071](../adr/0071-bff-api-integration.md))の決定を rules.md へ転記するエントリ(新規判断なし)

| # | 項目 | 主 Rationale ADR | 要点 |
| --- | --- | --- | --- |
| 4 | ミューテーション後 UI 更新 | [0071](../adr/0071-bff-api-integration.md) | 0071 決定済の転記。`revalidateTag` / `revalidatePath` / `router.refresh()` の使い分け(楽観的更新は #12 へ) |
| 5 | リクエスト重複排除 `cache()` | [0071](../adr/0071-bff-api-integration.md) | 0071 決定済の転記。React `cache()` / fetch memoization を adapters 側に組込(呼び出し側責務にしない) |
| 6 | プリフェッチ方針 | [0040](../adr/0040-routing-rendering-strategy.md) | `<Link prefetch>` 既定許容 / `router.prefetch` の手動使用条件 / 大量リンク一覧は明示 off(BFF への投機リクエスト抑制) |
| 8 | Route Handler 設計規約 | [0070](../adr/0070-backend-role-separation.md) | `/api/*` = thin proxy、Node runtime 前提、ルート命名・ストリーミング応答可否・`waitUntil` 等の非同期後処理 |
| 12 | 楽観的更新・二重送信防止 | [0071](../adr/0071-bff-api-integration.md) | submit disabled + 冪等キーで二重 POST 防止(0071 の「POST retry は opt-in」と表裏)、`useOptimistic` は失敗時ロールバック前提 |
| 17 | ローディング / スケルトン | [0080](../adr/0080-error-handling.md) | スケルトン優先・スピナーとの使い分け・表示までの遅延(フラッシュ防止)・スケルトンと実 UI の形状一致(CLS 抑制) |
| 18 | 空状態 / ゼロデータ | [0080](../adr/0080-error-handling.md) | 4 状態(loading / empty / error / success)必須(B7 と接続)。一覧 0 件・検索ヒットなし・部分エラー(一部 widget のみ失敗)の表示パターン |
| 20 | エラー画面 UX 階層 | [0080](../adr/0080-error-handling.md) | 404 / 5xx / 権限なし各画面の文言・`reset()` 再試行・復帰導線(トップへ戻る等)の標準形 |
| 23 | z-index / レイヤリング | [0050](../adr/0050-styling-strategy.md) | レイヤー種別(dropdown / modal / toast / tooltip)ごとに token 化した z スケール。単調増加合戦の禁止 |
| 24 | スクロール制御 | — | 遷移時スクロール復元(App Router 既定の追認)・モーダル時 body ロック・アンカー / ページ内リンク・`scroll-behavior` |
| 26 | クリップボード操作 | — | `navigator.clipboard` + 成功フィードバック(トースト規約 = [0063](../adr/0063-mutation-result-notification.md) 連動)+ 権限失敗時フォールバック |
| 29 | モバイル対応(viewport / safe-area / touch) | [0044](../adr/0044-seo-metadata-strategy.md) | `viewport` export・`env(safe-area-inset-*)`・タッチターゲット最小サイズ・ホバー非依存 UI |
| 33 | アイコン / SVG 運用 | [0052](../adr/0052-ui-component-policy.md) | 自前 SVG の置き場・inline component 化の方法(SVGR 採否)・`currentColor` 等の色規約 |
| 34 | Tailwind クラス運用 | [0050](../adr/0050-styling-strategy.md) | class 順序(biome の class sort 有効化 = `biome.json` 保護対象・要ユーザ指示)・長大クラス列の分割方針・`@apply` 抑制(rule のみ。`cva` 採否は decision → 0050 追補) |
| 35 | コンポーネント API 設計 | [0021](../adr/0021-frontend-responsibility.md) | props 命名(`onXxx` / `isXxx` / `renderXxx`)・variant prop・compound component の採否・`children` vs slot props・`...rest` パススルー |
| 38 | TypeScript 言語規約 | [0020](../adr/0020-adopted-architecture.md) | `type` 優先・`enum` 可否(erasableSyntaxOnly 方向)・`satisfies` / const assertion 推奨・`any` / `as` 禁止度(strict フラグ選定は decision → 0020 / 0002 追補) |
| 39 | TSDoc / コメント規約 | [0140](../adr/0140-documentation-operations.md) | 公開面(カーネル export)への TSDoc・日本語コメント(AGENTS.md 言語規則整合)・`@deprecated` 等タグ運用 |
| 42 | searchParams 型付け | [0060](../adr/0060-state-management.md) | zod 検証・配列 / 数値 / 日付のシリアライズ形式・既定値の扱い(nuqs 等ヘルパ採否は decision → 0060 追補) |
| 43 | Web Storage 利用規約 | [0060](../adr/0060-state-management.md) | 使用可否の既定・キー命名(prefix)・SSR / RSC 安全なアクセスパターン・スキーマ変更時マイグレーション・機微情報の格納禁止 |
| 44 | アプリ用 cookie 規約 | [0131](../adr/0131-cookie-consent.md) | 同意管理とは別のアプリ状態 cookie(テーマ等)の命名・属性(SameSite / Secure / HttpOnly / Max-Age)既定・読み書き場所(`cookies()` / proxy / client) |
| 47 | CSRF / origin 検証 | [0070](../adr/0070-backend-role-separation.md) | Server Actions `allowedOrigins`・Route Handler 側の CSRF 対策方針(SameSite cookie 前提で足りるか)の明文化 |
| 48 | XSS / サニタイズ | [0110](../adr/0110-security-operations.md) | `dangerouslySetInnerHTML` 原則禁止 + sanitizer 必須の例外条件(biome 強制)・ユーザ生成コンテンツ表示の標準形・URL(`javascript:`)検証 |
| 50 | サードパーティスクリプト | [0131](../adr/0131-cookie-consent.md) | `next/script` strategy 使い分け・外部スクリプト許可条件(CSP = [0111](../adr/0111-csp-security-headers.md) / 同意ゲート連動)・`@next/third-parties` 採否 |
| 53 | TZ / hydration mismatch | [0040](../adr/0040-routing-rendering-strategy.md) | 表示 TZ の既定(ユーザローカル / 固定)・`suppressHydrationWarning` 可否・時刻はクライアントで描画する等のパターン |
| 54 | 相対時刻・更新 | [0040](../adr/0040-routing-rendering-strategy.md) | `Intl.RelativeTimeFormat` + client interval 再描画の標準形・更新粒度 |
| 55 | UI 文言管理 | [0121](../adr/0121-i18n-strategy.md) | 文言は feature 内定数へ寄せる(i18n 移行容易性)・エラーメッセージ文言の管理場所([0080](../adr/0080-error-handling.md) 接続) |
| 57 | ポーリング規約 | [0060](../adr/0060-state-management.md) | 許可条件・間隔規約・バックグラウンドタブでの抑制(server-state ライブラリを持たない既定を破らない範囲) |
| 63 | 環境別ビルド差分 | [0044](../adr/0044-seo-metadata-strategy.md) | preview / staging の `noindex` 強制・環境識別バナー・環境別に挙動を変えてよい箇所の限定([0030](../adr/0030-environment-variable-management.md) の config 経由のみ) |
| 65 | build info / version 露出 | [0072](../adr/0072-api-type-generation.md) | commit SHA / build time の露出先(meta / ヘッダ / health)・health エンドポイント規約・バックエンド契約 SHA(0072)との突合手段 |
| 66 | dynamic import / コード分割 | [0101](../adr/0101-performance-budget.md) | `next/dynamic` / `React.lazy` の使用基準・`ssr:false` 可否・分割しすぎの抑制 |
| 67 | server-only / client-only 境界 | [0071](../adr/0071-bff-api-integration.md) | `import "server-only"` を adapters 全体へ必須化(config = [0030](../adr/0030-environment-variable-management.md) 以外へ拡張)・`client-only` の使用基準 |
| 68 | version skew 対応 | [0040](../adr/0040-routing-rendering-strategy.md) | デプロイ跨ぎの Server Action ID 不一致への対処 = フルリロード誘導 or PaaS の skew protection 依存 |
| 69 | typed routes / リンク規約 | [0040](../adr/0040-routing-rendering-strategy.md) | `typedRoutes` 有効化・内部遷移は `next/link` 必須(生 `<a>` 禁止)・外部リンクの `rel` / `target`(tabnabbing 対策) |

- **decision 部分の分離 3 件**(rules.md に書かず ADR 追補へ): cva 採否 → [0050](../adr/0050-styling-strategy.md) 追補 / tsconfig strict フラグ選定 → [0020](../adr/0020-adopted-architecture.md) or [0002](../adr/0002-formatter-linter.md) 追補 / nuqs 等ヘルパ採否 → [0060](../adr/0060-state-management.md) 追補
- スキル移植 C-1〜C-6 は [BACKLOG.md](../adr/BACKLOG.md)「go-boilerplate Claude 資産 移植バックログ」が正のため参照のみ

### 2.8 フォローアップ(小粒・ユーザ指示待ち)

- `package.json` への `"license": "MIT"` 追加([0142](../adr/0142-license.md) の follow-up。ルート設定保護のためユーザ指示待ち)
- ESLint boundaries の実導入 PR(T2 ⚠️)/ typescript の caret → exact pin 修正(T4 ⚠️)は [BACKLOG.md](../adr/BACKLOG.md) の実装ギャップ節が正のため参照のみ
- **[0110](../adr/0110-security-operations.md) への CSP CI 適合ゲート 1 本の追加**([0111](../adr/0111-csp-security-headers.md) の補足に記録済み): inline 違反検出・ヘッダ well-formed 検証を 0110 の Security グループに追加し `> Rationale: 0111` で逆参照する。0110 は Protected のためユーザ承認を経た別作業。**0111(実行時本体)と 0110 ゲート(CI 適合スライス)は両輪であり、片側のみでは gap #46 は閉じない**
- **ESLint 導入 PR と連動する周辺更新**: `.claude/skills/` 4 本(repo-ops / node-upgrade / full-apply / full-verify)に残る「lint = biome 一本」前提記述の更新(`.claude/` は保護対象・ユーザ指示必須)。なお `.vscode/extensions.json` への `dbaeumer.vscode-eslint` 追加は [0002](../adr/0002-formatter-linter.md) 側に記録済み
- **Accepted ADR 本体 56 本に残る削除済み `docs/plan/` ファイルへの参照リンクの整理**(2026-07-18 の統合でリンク切れ化。ADR 本体は Protected のため、次工程「ADR 突き合わせ」でユーザ承認のうえ一括で「破棄済み(git 履歴参照)」等へ付け替える)
- **ADR と採用ロードマップの既知の不整合 2 件**(次工程「ADR 突き合わせ」で解消・ADR 本体は Protected): ① [0091](../adr/0091-test-verification-methods.md) は visual regression(#71)を「tooling defer」と記すが、本書 1.2 節(2026-07-14 確定)では採用(Playwright スクリーンショット)② [0022](../adr/0022-capabilities-kernel.md) は hook 例に keyboard shortcut registry(#25)を挙げるが、本書 1.3 節ではキーボードショートカットは据え置き除外(v1 / v2 とも採用しない)

---

## 3. 本書の運用

- **living 運用**(0.0.x): 完了した項目は [BACKLOG.md](../adr/BACKLOG.md) へ反映のうえ本書から削除する
- 判断の経緯・比較検討は本書に書かない(決定は ADR へ、rule は `docs/rules.md` へ集約する)
- **go-boilerplate 移植は one-off**: 移植後に go 側が改善されても追従は自動化しない。必要になった時点で go 側を再走査する
