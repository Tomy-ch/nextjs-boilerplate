# ADR 空白 74 件の仕分け(disposition)

作成: 2026-07-13 / 作成者: Opus(実装ロール)/ レビュー: Fable(予定)
入力: [adr-gap-audit.md](adr-gap-audit.md)(74 件の発散列挙)+ [go-boilerplate-feature-port-plan.md](go-boilerplate-feature-port-plan.md) 付録 A/B 節
位置づけ: 付録「進め方」ステップ1 =「74 件を **採用(ADR 追補/新規)/ exclusion 明文化 / 保留** に仕分ける」の実行。本表は各項目の **処理先(disposition)を提案**する。採否・優先度の確定はユーザ承認による(ADR 本体 = Protected / 新規 ADR = ユーザ指示前提)。

> **設計原則: out-of-scope-runway(滑走路)** — out-of-scope ≠ 沈黙の省略。別ドメイン(インフラ/バックエンド)の責務でない限り、一概に切り捨てず **"滑走路"** を敷く。滑走路 = 明示的な拡張点として名前を付けた seam。形は 2 種 —— ① ローカル代替の機構/クラス(動く最小実装を同梱)/ ② インターフェース(IF/port)定義。境界判定は **「別ドメイン(infra/backend)の責務か?」** の一問: Yes → 境界 seam を名前付きで残して切る / No(フロント領域)→ 滑走路を必ず敷く。純粋「除外」で終わってよいのは (a) 別ドメインの責務、(b) 機能 seam でない開発 tooling 選択、の 2 つのみ。**白紙(=名もなき省略)が共通の敵**であり、滑走路はそれへの構造的回答。
>
> **⚠ ライフサイクル(この原則の帰属先)**: 滑走路論は **0.0.x 期限定の過渡的な構築原則であり、最終的に v1.0.0 時点で卒業=削除される**(boilerplate が固まれば足場は役目を終える)。ゆえに恒久判断軸 ADR(`0010-standards-and-non-lockin.md`)には**含めず**、また 0021(frontend-responsibility)など**恒久として残す ADR にも書き込まない**(濁るため)。滑走路の実体・境界判定・削除の話は本ドキュメント(滑走路側)が保持する。

## disposition の定義

| コード | 意味 | 成果物の置き場 |
| --- | --- | --- |
| **済** | 既存 Accepted ADR で実質確定済み。確認のみ | (該当 ADR) |
| **判定** | トリガー成立済み。判断を下すだけ(追補は 1〜数行) | 該当 ADR |
| **追補** | 既存 ADR に節/行を追記して確定 | 該当 ADR 本体 |
| **rules.md** | 日常強制される rule。`docs/rules.md`(0140 新設方針)へ集約 | `docs/rules.md`(**要新設**) |
| **除外** | やらない宣言で終わらせない。**別ドメインの責務でない限り滑走路**(IF/ローカル機構 + 明示拡張点)を敷く。純粋な切り捨ては別ドメイン or 非機能 tooling のみ | 該当 ADR / 小 exclusion(+ 滑走路成果物) |
| **B吸収** | B 節の仕掛け(型/生成物/参照実装)で自然に確定。二重決定しない | 実装成果物 |
| **新規** | 独立 ADR を起こすべき重量級決定 | 新規 ADR(採番はユーザ) |
| **保留** | 用途依存で本 boilerplate では持たない。**フロント領域なら滑走路**(hook/IF/機構)へ格上げ可。実装 PR / fork 先 / v1 へ | (なし〜滑走路 seam) |

**最大の構造的アンブロッカー**: `docs/rules.md` の新設(0140 が方針化済み)。下表で **rules.md** 指定は約 30 件あり、これらは「rules.md を 1 本作る」ことで一括着地する(個々に ADR を増やさない)。

---

## 済 / 判定(まず消化する既存 ADR の穴・5 件)

| # | 項目 | disposition | 根拠・アクション |
| --- | --- | --- | --- |
| 2 | キャッシュ・再検証戦略 | **済** | 0071「データ取得のキャッシュ・再検証」節が opt-in・所有層(adapters/RSC)・revalidate 経路を確定済み。監査の【委】は解消済み。**確認のみ**(ただし「tag 体系の具体は実装 PR で確定」の残余保留は 0071 に残る) |
| 3 | Suspense/`loading.tsx` 境界 | **済** | 0080 §3.5 が薄い表示境界・粒度・page 全体を覆わない、を確定済み。**確認のみ**(見た目=スケルトンは #17 へ分離済み・§3.5 の保留文言と整合) |
| 4 | ミューテーション後 UI 更新 | **済** | 0071 が revalidateTag/path/`router.refresh()` を確定済み。楽観的更新は #12 へ |
| 1 | Cache Components(PPR)有効化 | **判定** | 【保】トリガー成立(0040 が「B3/B6 確定後に判断」と明記し両者 Accepted 済み)。**提案: 0.0.x は無効(`cacheComponents: false`)/ v1・fork 先で再評価**。理由=既定キャッシュモデルを反転させる大改変、安定運用前の boilerplate では opt-in 側に倒す。0040 の保留を「0.0.x=無効」に確定する 1 節を追補し、**0071・0080 §3.5 の「0040 の保留に従う」参照も連動更新** |
| 70 | RSC テスト方針 | **判定** | 0090 の保留は「**実装時に確定**(本 ADR で先取りしない)」型 = 自 ADR Accepted はトリガーにならない。ただし 0090 は living かつ**実装フェーズ直前**のため前倒し確定は妥当。**提案: async RSC は E2E/integration(MSW)側へ寄せ、unit は純粋ロジック(model/utils)に限定**。#73/#74(B3 モック)と一体 |

> **#41(サンプル feature 同梱)** は既存 ADR の穴ではなく B 吸収(→ B5 ゴールデンパス feature に昇華、ADR 化不要)。実行順もステップ 6。詳細は「B 節吸収」表を参照。

---

## rules.md 新設で一括着地(rule 分類・約 30 件)

> 前提作業: **`docs/rules.md` を新設**(0140 の rule 集約方針)。各 rule に `> Rationale: [ADR-NNNN]` 逆参照を付す。下記はその初期エントリ群。個々に ADR を増やさない。

| # | 項目 | 主 Rationale ADR | rules.md での要点(案) |
| --- | --- | --- | --- |
| 5 | リクエスト重複排除 `cache()` | 0071 | **0071 本文で決定済み**(「重複排除」行)。rules.md へは「済の転記」= React `cache()`/fetch memo で adapters 側に組込 |
| 6 | プリフェッチ方針 | 0040 | `<Link prefetch>` 既定許容 / 大量リンク一覧は明示 off |
| 8 | Route Handler 設計規約 | 0070/0029 | `/api/*`=thin proxy、Node runtime 前提、命名・ストリーミング可否 |
| 12 | 楽観的更新・二重送信防止 | 0071 | submit disabled + 冪等キー、`useOptimistic` は失敗ロールバック前提 |
| 17 | ローディング/スケルトン | 0080 | スケルトン優先・フラッシュ防止遅延(#18/#20 と B7 状態契約に接続) |
| 18 | 空状態/ゼロデータ | 0080 | 4 状態(loading/empty/error/success)必須 = B7 |
| 20 | エラー画面 UX 階層 | 0080 | `reset()` 再試行・復帰導線の標準形 |
| 23 | z-index/レイヤリング | 0050 | token 化した z スケール(dropdown/modal/toast/tooltip)。単調増加禁止 |
| 24 | スクロール制御 | — | 遷移時復元の追認、モーダル時 body ロック |
| 26 | クリップボード操作 | — | `navigator.clipboard` + フィードバック(トースト規約連動) |
| 29 | モバイル対応(viewport/safe-area/touch) | 0044/0025 | `viewport` export・`env(safe-area-inset-*)`・タッチターゲット最小 |
| 33 | アイコン/SVG 運用 | 0052/0028 | 自前 SVG 置き場・inline component 化・`currentColor` |
| 34 | Tailwind クラス運用 | 0050/0002 | **rule のみ rules.md** = class 順序・`@apply` 抑制。⚠ **`cva` 採否 = ライブラリ採用 decision → 0050 追補 + 0004 フロー**。class sort 有効化は `biome.json`(保護 root config)変更を伴う |
| 35 | コンポーネント API 設計 | 0021/0008 | props 命名(`onXxx`/`isXxx`)・`...rest` パススルー・slot 規約 |
| 38 | TypeScript 言語規約 | 0020/0002 | **rule のみ rules.md** = `type` 優先・`any`/`as` 禁止度・`satisfies` 推奨。⚠ **strict フラグ選定(`noUncheckedIndexedAccess` 等)= decision + `tsconfig.json`(保護 config)変更 → 0020 か 0002 追補**(#42/#34 と同型分割) |
| 39 | TSDoc/コメント規約 | 0140 | 公開面 TSDoc・日本語コメント(AGENTS.md 整合) |
| 42 | searchParams 型付け | 0060 | **rule のみ rules.md** = zod 検証・シリアライズ形式・既定値。⚠ **nuqs 等ヘルパ採否 = decision → 0060 追補**(0140「decision を rules.md に書かない」に抵触するため分離) |
| 43 | Web Storage 利用規約 | 0060 | SSR 安全アクセス・キー prefix・機微情報格納禁止 |
| 44 | アプリ用 cookie 規約 | 0131/0029 | SameSite/Secure/HttpOnly/Max-Age 既定・読み書き場所 |
| 47 | CSRF/origin 検証 | 0070 | Server Actions `allowedOrigins`・SameSite cookie 前提 |
| 48 | XSS/サニタイズ | 0110 | `dangerouslySetInnerHTML` 原則禁止 + sanitizer 例外(biome 強制) |
| 50 | サードパーティスクリプト | 0131 | `next/script` strategy・CSP/同意ゲート連動 |
| 53 | TZ/hydration mismatch | 0040 | 表示 TZ 既定・`suppressHydrationWarning` 可否・時刻の client 描画 |
| 54 | 相対時刻・更新 | 0040 | `Intl.RelativeTimeFormat` + client interval 更新粒度 |
| 55 | UI 文言管理 | 0121 | 文言は feature 内定数へ寄せる(i18n 移行容易性) |
| 57 | ポーリング規約 | 0060 | 許可条件・間隔・背景タブ抑制(exclusion を破らない範囲) |
| 63 | 環境別ビルド差分 | 0044/0009 | preview/staging の `noindex` 強制・環境識別 |
| 65 | build info/version 露出 | 0072/0021 | commit SHA/build time 露出先・health 規約 |
| 66 | dynamic import/コード分割 | 0101 | `next/dynamic`・`ssr:false` 可否・分割しすぎ抑制 |
| 67 | server-only/client-only 境界 | 0071 | adapters 全体に `server-only` 必須化(config 以外へ拡張) |
| 68 | version skew 対応 | 0040 | skew 時フルリロード誘導 or PaaS 機能依存 |
| 69 | typed routes/リンク規約 | 0040/0008 | `typedRoutes` 有効化・`next/link` 必須・外部リンク `rel` |

*(rules.md 着地: 32 件)*

---

## 追補(既存 ADR に節/行を追記・decision 系・約 15 件)

| # | 項目 | 追補先 ADR | disposition の要点(案) |
| --- | --- | --- | --- |
| 7 | ページネーション/無限スクロール | 0060 **+0071** | cursor 既定・searchParams でページ状態・無限スクロール=client fetch を 0060 の明示例外に。**client→BFF fetch 経路は 0071 wrapper(server 前提)がカバーしないため 0071 連名で実装経路を所有**(委譲先消失回避) |
| 10 | バリデーション UX(zod 再利用) | 0072 | 生成 zod を client 入力検証へ再利用可(型漏洩禁止との整合を明記)・検証タイミング |
| 13 | ファイルアップロード seam | 0070 | 既定=presigned URL 直 PUT / multipart proxy は thin proxy 例外として seam 明示 |
| 16 | 複雑入力 UI の帰属 | 0052 | 0052 exclusion の射程に日付ピッカー等を含める + 採用時 a11y 準拠必須 |
| 19 | トースト/通知 UI | 0080/0012 | 通知手段の使い分け(トースト/インライン/redirect)・自前実装 + live region(B7 連動) |
| 21 | アニメーション/モーション | 0050 + 0100 | Framer 等は exclusion / CSS transition・View Transitions 既定・`prefers-reduced-motion` 必須(0100) |
| 22 | モーダル/ダイアログ | 0052 + 0040 | native `<dialog>` 既定・focus trap/Escape/scroll lock 必須(0100)・route-as-modal(intercepting routes)採否は 0040 |
| 31 | ブレークポイント体系 | 0050 | Tailwind 既定追認 + mobile-first 明文化 + `@container` 採用方針 |
| 32 | デザイントークン体系 | 0050 (+B9) | semantic 命名 vs raw scale・spacing/typography/radius/shadow スケール・`@theme` 対応。Figma 同期は B9 |
| 36 | React 19 API 使用 | 0040 | ref as prop 採用・`use()` 条件・React Compiler 採否(採用時 memo 手書き禁止)。⚠ 0040 はルーティング ADR で React 一般の器ではない → 追補時に「**レンダリング関連 React API に限る**」射程宣言を付す(または独立小 ADR 化を要検討) |
| 52 | 日付・数値フォーマット | 0121 **+0021/0007** | `Intl.*` 使用規約・既定 locale。i18n 本体とは独立。⚠ 0121 は exclusion ADR で Intl 節が皆無 → **フォーマット関数の置き場は 0021/0007(カーネル管轄)で書き切る**(異質な節を 0121 に足すだけだと委譲先消失を再生産) |
| 56 | WebSocket/SSE seam | 0071 | exclusion + seam(PaaS 長寿命接続制約下でバックエンド直結 or 外部サービス) |
| 59 | Web Vitals RUM | 0081/0026 | `useReportWebVitals` → BFF 中継 → OTLP。RUM SaaS exclusion との線引き |
| 60 | client エラー収集 | 0081 | `window.onerror`/`unhandledrejection`/`error.tsx` を BFF 中継でサーバログへ・redact/サンプリング |
| 62 | feature flag/A-B seam | 0071 | server 評価既定・値受渡し・exclusion(サービス非同梱)+ seam |
| 72 | a11y 自動テスト | 0090/0025 | axe-core(vitest-axe/@axe-core/playwright)を component/e2e に組込 |

*(追補着地: 16 件)*

---

## 除外 / 滑走路(exclusion + runway・約 8 件)

> 「除外」= やらない宣言で終える、ではない。各行を **境界判定**(別ドメイン責務か?)で通し、フロント領域には **滑走路**(IF/ローカル機構 + 明示拡張点)を必ず敷く。純粋な切り捨ては別ドメイン(infra/backend)責務 or 非機能 tooling 選択のみ。

| # | 項目 | 明文化先 | 判定 | 滑走路内容 / 要点 |
| --- | --- | --- | --- | --- |
| 15 | リッチテキスト/エディタ | 0052 | **滑走路要**(フロント) | 本体非同梱 + **sanitize IF + 表示 seam**。rehype/sanitize は差し替え可能な port として名前を付ける |
| 25 | キーボードショートカット | 0100 補注 | **滑走路要(軽)** | 必要になるまで持たない + **登録機構 IF/明示拡張点**(shortcut registry の seam) |
| 27 | ドラッグ&ドロップ | 0052 | **滑走路要(軽)** | 非同梱 + WCAG 2.2 ドラッグ代替を満たす **a11y 準拠 DnD seam/IF** |
| 28 | 印刷/PDF 出力 | 0050 補注 | **分割** | print CSS = **滑走路**(フロント領域・最小実装同梱可)/ PDF サーバ生成 = backend ドメイン = **境界 seam で切る** |
| 37 | Storybook/カタログ | 0090/0019 | **tooling defer** | 機能 seam でなく開発ツール選択 → **滑走路不要・現状維持**。カタログ性は層別 README で担保 |
| 51 | 決済 UI seam | 小 exclusion | **分割** | UI mount seam = **滑走路**(フロント)/ 決済処理・PCI = backend ドメイン = **境界 seam で切る**(外部スクリプト/BFF 中継) |
| 61 | プロダクト分析 seam | 0081 | **滑走路要**(フロント) | SaaS 非同梱 + **analytics 発火 IF + ローカル no-op sink(動く最小実装同梱)+ 明示拡張点**。直書き禁止・consent gating 接続 |
| 49 | BFF レート制限・abuse 対策 seam | 0081/0015 | **境界 seam(別ドメイン寄り)** | infra(PaaS/edge)ドメインの責務 = **境界 seam を名前付きで残して切る**。0081 が「ブラウザ→BFF 中継」を seam 化した結果生じる無防備エンドポイントの保護方針を明文化・#65 health エンドポイントと連動 |

*(除外着地: 8 件。#49 を保留から一意化 = 境界 seam に確定。**内訳が 2 種に分かれる**: **真の切り捨て**(別ドメイン/tooling で滑走路不要 = #37/#49 + #28・#51 の backend 側)と **滑走路付き除外**(実質 seam 成果物を作る = #15/#25/#27/#61 + #28・#51 のフロント側)。滑走路付き項目は実装フェーズで IF/ローカル機構を成果物化する点で **B 節 seam 群と連続**する)*

---

## B 節吸収(型/生成物/参照で確定・二重決定しない・約 6 件)

| # | 項目 | 吸収先 | 備考 |
| --- | --- | --- | --- |
| 9 | 素の form 書き方 | B8(ActionState 型)+ B2(生成) | canonical パターンを型と雛形で配布。**前提: カーネル(errors/model)実装が最初の feature に先行する順序保証**(明文化推奨) |
| 11 | Server Action 戻り値契約 | B8(`ActionState<T>` をコードで同梱) | decision を型で確定。0080 sentinel と接続 |
| 40 | barrel/公開面物理表現 | B4/B13(architecture SSOT) | barrel 可否確定 → ESLint boundaries 実装をアンブロック。rules.md にも一行 |
| 41 | サンプル feature 同梱 | B5(ゴールデンパス feature) | 29 ADR の交差点を踏む実物 + 削除コマンド。ADR 化不要 |
| 73 | E2E データ・環境戦略 | B3(orval→MSW) | 契約駆動モックで確定 |
| 74 | dev モック戦略 | B3(orval→MSW) | 同上・dev/integration/e2e を 1 パイプ |
| 32 | (デザイントークン・同期)| B9(Figma→CSS 変数) | **追補(0050)と重複計上のため件数外**。体系=0050 追補 / 同期=B9 |

*(B 吸収着地: 6 件〈#9,#11,#40,#41,#73,#74〉。#32 は追補側で計上し重複回避)*

---

## 新規 ADR 候補(重量級・要ユーザ指示・2 件)

> **0110 の原則(補注)**: 0110 = CI 実行時点で払える防御を収録する **shift-left 原則**。CSP のように実行時本体を持つ関心は、CI で払える適合スライスだけを 0110 が逆参照で受け、本体は別 ADR に置いて **局所推論**(推論起点を 1 本に集約)を保つ。

| # | 項目 | 提案 | 根拠 |
| --- | --- | --- | --- |
| 45 | 認証のフロント側 seam | **新規 ADR**(認証本体は out of scope のまま宣言を冒頭で反復 / seam の**形は発明せず Next.js のデファクト = 公式 auth ガイドの文書化パターンに乗る** / fork 先に委ねるのはプロバイダ・session 実装詳細のみ) | seam=**Next.js 文書化パターンに準拠**: httpOnly session cookie(payload 最小=id/role・PII 禁止)/ 認可 2 層〈optimistic checks with Proxy(cookie のみ・DB 参照禁止・リダイレクト/UI 用・唯一の防御線にしない・Node.js runtime)+ Data Access Layer `verifySession()` を React `cache()` で memo 化(確定認可の本丸=データ源に最も近い所で検査)〉/ DTO で必要データのみ返す / layout・page・leaf・Server Actions・Route Handlers の各所チェック。**fork 先の嗜好に委ねるのはプロバイダ/ライブラリ(Auth.js/Clerk/自前 BFF/SaaS IdP)と session 実装詳細(stateless vs DB・暗号化方式)のみ**。**非ロックインの正当性材料を本体に必須化**: 「Next.js 推奨だから」で終わらせず vendor-independent な web セキュリティ根拠(httpOnly=XSS トークン窃取緩和 / データ境界認可=多層防御 / DTO・最小 payload=最小権限)を書く(=独立根拠を書くこと自体が設計者を選択主体として構成し非ロックインを証明可能にする / 「数ある標準から Next.js を 1 要因として選択した」と位置づけ)。裏取り元=`node_modules/next/dist/docs/01-app/02-guides/authentication.md`。0070/0029/0006/0010 に散った断片を 1 本に束ね局所推論の起点を 1 本化する ★ |
| 46 | CSP/セキュリティヘッダ | **新規 ADR(実行時 CSP 本体)+ 0110 に CI 適合ゲート1本を逆参照追加** | 0110 の原則は「サプライチェーン系のみ」ではなく **CI/ビルド実行時点で払える防御を収録する shift-left 原則**。この物差しで測ると CSP は 2 分される: (a) **CSP ポリシー適合チェック**(inline script 違反検出・ヘッダ well-formed 検証・回帰) = CI 時点で払える → **0110 が CI ゲートを 1 本持つ(新規 ADR を逆参照)**、(b) **CSP ポリシー内容 + nonce の実行時運用 + ヘッダ配置**(`next.config.ts` headers vs `proxy.ts` vs PaaS・per-request nonce 注入・`X-Frame-Options`/`Referrer-Policy`/`Permissions-Policy`/HSTS) = 実行時で CI では払えない → **新規 ADR**。新規化の主理由は「shift-left で払えない」ではなく **局所推論可能性**:「このリポの CSP ポリシーはどこで・どこで enforce するか」を問う読み手が 0110/0029/0010 に散らばらず **1 本で完結して読める**ことを最大化するため。したがって #46 は「新規か 0110 追補か」の二択ではなく **両方**が正(実行時本体=新規 ADR / CI 適合スライス=0110 が逆参照付きで持つ)★ |

*(新規候補: 2 件。#46 は「実行時本体=新規 ADR」+「CI 適合スライス=既存 0110 への逆参照ゲート」の複合 = 0110 ゲートは #46 の内訳であり別項目として数えない。#49 BFF レート制限は 0081/0015 追補で対応可 → 下の保留/追補側)*

---

## 保留(用途依存・実装 PR / fork 先 / v1・約 8 件)

| # | 項目 | 保留先 | 判定 | 理由 / 滑走路内容 |
| --- | --- | --- | --- | --- |
| 14 | 離脱ガード/下書き | 実装 PR | **滑走路要**(フロント) | App Router の遷移中断が素直でない → **navigation-block hook/IF** を明示拡張点として敷く。必要時 rules.md へ |
| 30 | オンライン/オフライン検知 | 実装 PR | **滑走路要**(フロント) | 軽量 UX。**connectivity hook/IF** を seam 化。必要時 rules.md |
| 58 | Web Worker | 実装 PR | **滑走路要(軽)** | INP 悪化時のオフロード拡張点(**offload seam**)。IF は必要時。必要時 rules.md |
| 64 | メンテナンスモード | 実装 PR | **滑走路要**(フロント) | **proxy rewrite 機構 + env フラグ seam** を名前付きで残す |
| 71 | visual regression | v1/fork | **tooling defer** | 機能 seam でない開発ツール選択 → **現状維持**。Playwright 内蔵/Chromatic 採否は 0090 の 4 層に後付け可 |

*(保留着地: 5 件。#49 は除外〈境界 seam〉へ一意化。うち **#14/#30/#58/#64 は滑走路付き**〈フロント領域 = 実装フェーズで hook/IF/機構を成果物化〉へ格上げ、#71 のみ純粋 tooling defer)*

> **#45/#46 の格下げ代替案**: 新規 ADR にせず既存追補にする選択肢 —(46→0110 追補 / 45→0070 追補)。
> - **#46**: 0110 の原則は「CI/ビルド実行時点で払える防御を収録する shift-left 原則」であり、CSP はこの物差しで **CI 適合チェック**(→ 0110 ゲート)と **実行時本体**(nonce 運用・ヘッダ配置)に **2 分** される。結論は「実行時本体=新規 ADR / CI 適合スライスのみ 0110 が逆参照で持つ」の複合(旧「0110 はサプライチェーン/CI のみでランタイム防御ゼロ」表現は誤り = 修正済み)。新規化の主理由は CSP の推論起点を 1 本に集約する **局所推論可能性**。
> - **#45**: 新規が妥当なのは「**単一の既存 ADR が所有者になれない=局所推論の起点が無い**」(0043/0006/0010 にまたがる実行時レンダリング seam であり、shift-left 再フレームの対象外)+「0043/0006/0010 に散った断片を『Next.js 文書化パターン』として 1 本に束ねる」ため(冒頭で「認証本体は out of scope」宣言が条件)。**旧「0070 の中立宣言と httpOnly cookie 前提の軽い緊張」という根拠は誤りとして訂正**: 0070 が守る中立は**プロバイダ中立**であって **seam の形の中立ではない**。Next.js 自身が httpOnly cookie を標準推奨している以上、それに乗るのは方式の先取りでなく**プラットフォーム標準準拠**であり 0070 と衝突しない。
> - #47 CSRF を #46 新規 ADR に同居させる案は要検討。

---

## 集計(提案ベース)

| disposition | 件数 | 主な着地 |
| --- | --- | --- |
| 済 | 3 | #2,#3,#4(0071/0020 確認のみ) |
| 判定 | 2 | #1,#70(判断を下す) |
| rules.md | 32 | **`docs/rules.md` 新設で一括**(内 #34/#38/#42 は decision 部分を追補へ分離) |
| 追補 | 16 | 既存 ADR に節追記(#32 をここで計上) |
| 除外 | 8 | exclusion 明文化(#49 を一意化)。**真の切り捨て vs 滑走路付き除外**に内訳分割(下脚注) |
| B 吸収 | 6 | B8/B3/B4/B5(#9,11,40,41,73,74) |
| 新規 | 2 | #45 認証 seam / #46 CSP(#46=実行時本体を新規 ADR 化 + 既存 0110 へ CI 適合ゲート 1 本を逆参照追加。0110 ゲートは #46 の内訳=別項目に数えない) |
| 保留 | 5 | 用途依存 → 実装 PR/fork/v1 |

**合計 = 3+2+32+16+8+6+2+5 = 74 件、全件 disposition 済み**(#32 は追補で計上・B 吸収では件数外)。本表の `#` 列が [adr-gap-audit.md](adr-gap-audit.md) の見出し順(1〜74)との対応表を兼ねる(監査本体は番号なし・サマリの「58 件」は誤記で実数 74 が正)。

> **除外 8 件の内訳**(件数の総和 74 は不変・分類の質だけを可視化): **真の切り捨て**(別ドメイン責務 or 非機能 tooling で滑走路不要)= #37(tooling)/ #49(infra ドメイン)+ #28・#51 の backend 側 / **滑走路付き除外**(やらない宣言ではなく実質 seam 成果物を作る)= #15/#25/#27/#61 + #28・#51 のフロント側。滑走路付き項目は実装フェーズで **IF/ローカル機構を成果物化**する点で **B 節 seam 群と連続**する(保留の #14/#30/#58/#64 も同様にフロント滑走路として実装フェーズ成果物になる)。out-of-scope-runway 原則(冒頭補注)により、除外・保留の大半は「名もなき省略」ではなく **名前付きの拡張点**へ着地する。

## 推奨する実行順(承認後)

1. **既存 ADR の穴を先に塞ぐ**(最小・高価値): #1・#70 の判断追補(各 ADR 1 節)+ #2/#3/#4 は確認のみ。**#1 確定時は 0071・0080 §3.5 の「0040 の保留に従う」参照も連動更新**。
2. **`docs/rules.md` を新設**し rule 32 件の初期エントリを流し込む(0140 方針の実体化。AGENTS.md からの段階移行はここに合流)。
3. **追補バッチ**(16 件)を隣接 ADR ごとにまとめて執筆(0050 に #21/#22/#31/#32、0052 に #16/#19、0121 に #52/#55…)。
4. **除外 7 件**を該当 ADR の Non-Goals/Exclusion 節へ明文化。
5. **新規 ADR 2 件**(#45/#46)= ユーザ指示のもと起票。または 0070/0023 追補に格下げ(規模判断)。
6. **B 吸収**(#9/#11/#40/#73/#74/#32)はカーネル物理実装フェーズで成果物として確定(ADR 化しない)。

> **ゲート**: ADR 本体は Protected Documentation / 新規 ADR はユーザ指示前提(AGENTS.md)。**`docs/rules.md` 新設も AI Modification Scope の許可パス外**(0140 で方針 Accepted 済みでも新設実行にはユーザ指示が要る)。本表の disposition をユーザが承認 → 上記順で執筆。
