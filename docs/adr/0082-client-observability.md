# クライアント観測性(Web Vitals RUM / client エラー収集 / プロダクト分析 seam)

[0081](0081-observability-logging.md) が「ブラウザ側テレメトリは BFF 中継を seam とする」と器だけを定め、[0101](0101-performance-budget.md) が一次指標に Core Web Vitals を採用しながら **field 値(RUM)の収集経路** を未決に残した。本 ADR は、この 0081 seam に載せる **ブラウザ発の 3 経路 —— Web Vitals RUM(#59)/ client エラー収集(#60)/ プロダクト分析(#61)—— を確定** する。3 経路はいずれも「ブラウザから外へ出る IO」であり、送信面は [0024](0024-adapters-server-client-split.md) が明示配置した `adapters/client` に置く。

## Status

Accepted (一部 exclusion)

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。triage の観測性クラスタ(#59 / #60 / #61)を 1 主題 = 1 ADR として独立起票したもの。内容自体はこの設計討議でユーザ確定済み。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

[0081](0081-observability-logging.md)(B7)はサーバ側の構造化ログ / OTel / vendor-neutral OTLP を確定し、ブラウザ側については「クライアントで計測した値は `/api/*`(BFF)経由でサーバへ送り、サーバ側で OTLP export する(直接 SaaS へ送らない)」という **seam の宣言** までを行った。しかし何を流すか(CWV field 値 / client エラー / ユーザ行動)は 0081 本文では列挙されず、設計フェーズの遡及監査 #59 / #60 / #61 として空白に残った。

- **#59 Web Vitals RUM**: [0101](0101-performance-budget.md) は一次指標を CWV(LCP / INP / CLS)としつつ計測を lab(CI Lighthouse)に限り、**「指標はあるがフィールド値が無い」** 状態だった(triage disposition = 0081/0026 追補)。
- **#60 client エラー収集**: [0080](0080-error-handling.md) / [0081](0081-observability-logging.md) はサーバ側で完結し、ブラウザで起きたエラーはどこにも残らない **観測性の片翼欠落** だった(disposition = 0081 追補)。
- **#61 プロダクト分析 seam**: [0131](0131-cookie-consent.md) が「運用テレメトリはユーザ行動トラッキングと区別する」と線を引いた側(=行動トラッキング)。SaaS 非同梱でも、計測呼び出しがコンポーネントに直書きされるか抽象を通るかは本体の構造問題として残った(disposition = 0081 exclusion + seam 敷設)。

[0024](0024-adapters-server-client-split.md)(構造ブロッカー S1)が `adapters/client` element を立て、その「中身」列に **telemetry 送信(#59 / #60)/ analytics 送信(#61)** を明示的に割り当てたことで、3 経路の物理的な家が確定した。本 ADR はその家に載る送信内容と発火・ゲートの方針を定める。

## 決定

3 経路はすべて 0081 の **ブラウザ→BFF 中継 seam** に載せる。送信面 = `adapters/client`([0024](0024-adapters-server-client-split.md))、受け = `app/route-handler`(`route.ts` → `adapters/server` → OTLP / サーバログ。[0025](0025-app-layer-elements.md) の thin proxy)。**ブラウザから直接 SaaS / collector へ送らない**(0081 禁止事項)。

ブラウザ側の trace(§0)を加えた 4 経路は、載せる signal で分かれる。

| 経路 | signal | 中継の口 |
| --- | --- | --- |
| ブラウザ側の trace(§0) | traces | OTLP をそのまま渡す口 |
| Web Vitals RUM(§1) | metrics | このリポジトリが決めた形の報告を受ける口 |
| client エラー(§2) | logs | 同上 |
| プロダクト分析(§3) | — | exclusion。v1 では置かない |

口を 2 つに分けるのは、**契約の出所が違う**ためである —— OTLP は OTel が決めるので読み替えずに渡し、報告の形はこのリポジトリが決めるので検証して signal へ載せ替える。

### 0. ブラウザ側の trace = 採用

- ブラウザで **OTel の Web SDK** を動かし、ブラウザ発の外向き要求を span にする。export は中継経由で、collector の endpoint も資格情報もブラウザへ出さない(0081)。
- **包むのは `fetch` すべてである。** 自分で呼んでいる取得だけを包むと、router が画面遷移と先読みで出す RSC の要求が抜け、別の trace の根になる。そのぶん 1 つの trace に載る span は増える。
- **span 名は方式とパスで置く**(`GET /products/[id]` ではなく実際のパス)。計装の既定は方式だけ(`GET`)で、どの経路への要求かを持たない。クエリは名前に載せない —— 条件は要求ごとに違うので、載せると同じ経路が別の名前へ散る。
- **ブラウザは自分の trace を始めない。** 画面を組んだ要求の `traceparent` をサーバから受け取って親に取る。こうすると SSR から、その画面が後で出した取得までが 1 本の trace になる。渡らない実行(静的生成された画面)では新しい trace を始める。
- **計装は最初の描画の後に読み込む。** 計測のための資材を初期の読み込みへ載せると、[0101](0101-performance-budget.md) が一次指標に置く当の値を悪くする。
- **service 名は中継が上書きする。** 認証を要求しない口なので、ブラウザの名乗りをそのまま通すと誰でも任意の service の trace へ span を書ける。ブラウザは自分がどの service の一部かを知る必要がない。
- **vendor-independent**: OTel の SDK は CNCF の実装であって観測性 SaaS ではなく、送り先は任意の OTLP バックエンドである(§1 と同じ論理)。

### 1. Web Vitals RUM(#59)= 採用

- `useReportWebVitals`(Next.js 組込 hook)で LCP / INP / CLS 等を収集し、同一オリジン BFF 経由でサーバへ送り、**サーバ側で OTLP export**(0081)する。これで [0101](0101-performance-budget.md) の lab 計測(CI Lighthouse)に対する **field 値の欠落経路を閉じる**。
- **vendor-independent 正当性材料**([0010](0010-standards-and-non-lockin.md)): CWV は web.dev / W3C 由来の業界標準指標(0101 が既に一次指標として独立採用済み)/ 送信 transport は OTLP/OTel = vendor-neutral(0081)/ BFF 中継は secret 非露出([0030](0030-environment-variable-management.md))と lock-in 回避。**RUM 観測性 vendor SDK(Datadog RUM 等)を正当化から抜いても、CWV を OTLP/OTel で収集する構成は成立** する = 非ロックイン(0081 のスタンスは OTLP/OTel vendor-neutral・vendor SDK 非同梱であり、特定 vendor を前提としない)。`useReportWebVitals` の使用は「App Router を選んだ」既決の帰結(0010 §2)であって機能固有ロックインではない。
- **RUM 観測性 SaaS の同梱は fork 先判断(exclusion)**(0081 と一致。Collector / OTLP 経由を基本とする)。
- **サーバ側では metric(指標ごとのヒストグラム)として持つ**。求めるのは実利用者ぶんの百分位であり、1 件ずつのレコードから毎回それを組むより計器の側が分布を持つほうが、読む手数も保持のコストも小さい。公式 semantic convention が web vitals へ与えているのは `browser.web_vital` という event 名だけで metric 名を定めていないが、event で出すと 1 レコードごとに中継要求の span が付き、測定が起きていない要求と親子になる。
- これは **運用テレメトリ(パフォーマンス)** であり、[0131](0131-cookie-consent.md) が consent gate の対象とする **ユーザ行動トラッキングとは区別** される。→ **既定で consent gate の対象外**(下記 §4)。

### 2. client エラー収集(#60)= 採用

- `window.onerror` / `unhandledrejection`、および `error.tsx` / `global-error.tsx` 到達([0080](0080-error-handling.md))時のエラーを捕捉し、BFF 中継で **サーバログ**(0081)へ送る。
- **記録は画面を組んだ要求の trace へ紐づける**(§0 の `traceparent` を報告に載せて返す)。渡らなければ trace を付けない —— 中継要求の span を付けると、例外が起きていない要求と親子になる。
- エラー分類は `errors` カーネルのセンチネル([0080](0080-error-handling.md))を用い、**PII / token の redact**([0080](0080-error-handling.md) / [0081](0081-observability-logging.md) の masking と一致)・**サンプリング / レート制御** を送信前に掛ける。
- **vendor-independent**: ブラウザ側エラーの可視化は 0080 / 0081 がサーバ側で完結していた観測性の片翼を埋めるもので、収集経路は構造化ログ / OTLP(0081)= vendor-neutral。エラー監視 SaaS の同梱は fork 先判断(#59 と同じ exclusion 論理)。
- **運用テレメトリ扱い**(consent gate 対象外。0131。§4)。

### 3. プロダクト分析 seam(#61)= exclusion + 採用時の拡張点

- **SaaS 非同梱**(0081 / 0131 と一致)。やらない宣言で終えるのではなく、採用時に置くもの —— ① analytics **発火 IF** + ② ローカル **no-op sink** + ③ 明示拡張点 —— の座標を先に確定する。**ただし v1 では実使用面が無いためコードとしては置かない**(空の IF を置かない。§補足)。
- 物理配置 = `adapters/client` の **source adapter**。これは [0031](0031-policy-state-supply.md) の分解②「セマンティクス + no-op 既定」に **#61 analytics no-op sink** として既に位置づけられている家に一致する。
- **発火はコンポーネント / feature への直書きを禁止** し、必ず発火 IF を通す([0031](0031-policy-state-supply.md) 禁止事項「consent / flag の値取得を各 feature / component に直書きすること」と同型)。
- **consent gating**: プロダクト分析は 0131 の consent 対象(ユーザ行動トラッキング)そのものであるため、発火 IF は [0031](0031-policy-state-supply.md) の **純関数 gate 述語**(既定 = 「未同意で全 gate」)を参照してから sink へ渡す。gate の具体粒度・consent ソースは用途依存で fork 先 / 実装 PR(0031 と一致)。
- **vendor-independent**: 「直書き vs 抽象を通す」という構造問題は SaaS 選定と独立(0031)であり、本体が備えるのは IF + no-op 既定のみ。

### 4. consent gate の線引き(運用テレメトリ vs 行動トラッキング)

[0131](0131-cookie-consent.md) は consent gate の対象を **ユーザ行動トラッキング** に限り、[0081](0081-observability-logging.md) の運用テレメトリと区別する。本 ADR はこの線をそのまま適用する:

- **#59 RUM / #60 エラー = 運用テレメトリ → 既定で gate 対象外**(パフォーマンス / 障害の運用計測)。
- **#61 プロダクト分析 = 行動トラッキング → gate 必須**(§3。0031 述語)。
- ただし **field RUM を同意対象とする法域要件があり得る**ため、#59 / #60 に gate を掛けたい fork 先は §3 と同じ 0031 gate 述語を再利用できる拡張点を残す(本体既定は保守的に operational 扱い)。この境界の確定は用途依存で本体では固定しない(下記「補足」/ flags)。

### 5. BFF エンドポイントの物理(seam のみ確定・分割は委譲)

- 本 ADR が確定するのは **seam**(0081 中継 / `adapters/client` 送信面 / `adapters/server` 受け)のみ。3 経路が **単一 BFF エンドポイント**(例 `/api/telemetry`)を共有するか **signal 別に分ける**かの物理分割は、[0153](0153-ci-configuration.md) / 実装 PR の枠で確定する(用途依存。下記「補足」/ flags)。
- **中継エンドポイントの保護**(レート制限 / ボディサイズ上限 / 無認証エンドポイントの abuse 対策)は **本 ADR の射程外**。これは infra ドメイン寄りの境界 seam = triage **#49**(BFF レート制限・abuse 対策 seam・別 ADR〈0077〉)が所有する。本 ADR は送信経路のみを定め、保護方針は #49 を参照する(密結合のため相互参照で局所推論を保つ)。

## 禁止事項

- ❌ ブラウザから直接 SaaS へ RUM / エラー / 分析を送ること(BFF 中継 seam。[0081](0081-observability-logging.md))
- ❌ 観測性 / 分析 SaaS SDK を boilerplate 本体に同梱すること(fork 先判断。[0081](0081-observability-logging.md) / [0131](0131-cookie-consent.md))
- ❌ analytics 発火を feature / component に直書きすること(発火 IF を通す。[0031](0031-policy-state-supply.md))
- ❌ プロダクト分析を consent gate 無しで発火させること(0031 gate 述語必須。[0131](0131-cookie-consent.md))
- ❌ client エラー / RUM ペイロードに PII / token を redact せず載せること([0080](0080-error-handling.md) / [0081](0081-observability-logging.md) masking)
- ❌ ブラウザ発の送信面を `adapters/client` 以外(feature / component の生 fetch 等)に置くこと([0071](0071-bff-api-integration.md) / [0024](0024-adapters-server-client-split.md))

## 補足

- **採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**(独立起票・triage 観測性クラスタ = 1 ADR)。
- **consent 結線の現在地**: #61 は [0031](0031-policy-state-supply.md) の gate 述語で結線済み。#59 / #60 の consent 要否は **法域依存で本体では確定せず**、operational = gate 対象外の保守的既定 + 0031 述語の再利用拡張点、に留める(§4。flags)。
- **エンドポイントは 2 つに分ける**(§決定の表)。OTLP をそのまま渡す口と、このリポジトリが決めた形の報告を受ける口。
- **保護は #49(0077)へ委譲**(§5)。無防備な公開中継エンドポイントの保護は別ドメイン寄りの境界 seam であり、参照先が本 ADR 外に分散する点を明示。
- **AGENTS.md B7 TODO との関係**: 0081 の Accepted で B7 は確定済み。本 ADR は 0081 のブラウザ側 seam を 3 経路へ具体化する **従属決定** であり、AGENTS.md への追加反映は生じない(0081 の反映に含まれる)。
- 送信・redact・サンプリングの具体実装(バッチ / `sendBeacon` vs `fetch` / サンプリング率)は用途依存で実装 PR(本体は seam と発火 IF・no-op sink のみ備える)。
- **v2 採用予定(局所ライブラリ・2026-07-14)**: §3 プロダクト分析の SaaS 非同梱(exclusion + seam 敷設)本体は不変。採用マトリクス([master-plan §1.2](../plan/master-plan.md))でプロダクト分析は **v2 = 局所ライブラリ採用**(用途依存)に振り分けられた。**v1 では発火 IF / no-op sink をコードとして置かない**(プロダクト分析の実使用面が存在しないため)。本 ADR が記すのは**採用時の拡張点の座標**(発火 IF + no-op sink + consent gate 述語を `adapters/client` に置く)であり、SaaS 採用と実体化は v2(PostHog・Thin = adapter 抽象 + no-op 既定)。**consent gate 述語そのものは [0131](0131-cookie-consent.md) / [0031](0031-policy-state-supply.md) 側で v1 に実在する**(分析を繋がないだけで、ゲート機構は動く)。採用時も本体は発火 IF / no-op 既定 / consent gate を保持し、PostHog を [0010](0010-standards-and-non-lockin.md)(vendor-independent 正当化 + adapters/カーネル境界の裏で差替可能・vendor 直参照を feature/component に散らさない)/ [0004](0004-library-management.md)(exact-pin / `pnpm audit`)の枠内で置く。なお §1 RUM / §2 client エラーは運用テレメトリ(0081・OTLP)であり本注記の局所ライブラリ採用の対象外。

## 関連 ADR

- [0081-observability-logging.md](0081-observability-logging.md)(B7)— ブラウザ→BFF 中継 seam / OTLP-only / SaaS 非同梱。本 ADR はその 3 経路を具体化する
- [0101-performance-budget.md](0101-performance-budget.md)(C3)— CWV 一次指標 / lab 計測。本 ADR が field 値(RUM)収集経路を補完
- [0131-cookie-consent.md](0131-cookie-consent.md)(C9)— consent gate 対象 = 行動トラッキング(#61)/ 運用テレメトリ(#59 / #60)との区別
- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md)(S1)— `adapters/client`(telemetry / analytics 送信面の家)
- [0031-policy-state-supply.md](0031-policy-state-supply.md)(S3)— analytics no-op sink / consent gate 述語の供給(#61 の発火 IF / no-op sink)
- [0080-error-handling.md](0080-error-handling.md)(B6)— エラー分類センチネル / redact(#60 の分類・masking)
- [0071-bff-api-integration.md](0071-bff-api-integration.md)(B3)— client→BFF fetch 経路(送信の実装層)
- [0030-environment-variable-management.md](0030-environment-variable-management.md)(A7)— secret 非露出 / BFF runtime config(BFF 中継の根拠)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — 標準準拠 + vendor-independent 正当化(#59 の RUM 経路の正当性の土台)
