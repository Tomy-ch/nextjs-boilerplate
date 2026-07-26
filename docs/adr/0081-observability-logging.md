# 観測性・ロギング

[0020](0020-adopted-architecture.md) / [0021](0021-frontend-responsibility.md) で枠を予約した **`logging` / `observability` カーネル** の中身を確定する。**構造化ログ / OTel(vendor-neutral OTLP)/ シグナル別 config gating / trace 相関 / ブラウザ側テレメトリの扱い** を定める。go-boilerplate の logging / observability(ADR 0054 / 0060 / 0061)を翻案する。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([0140](0140-documentation-operations.md))。本 ADR の内容自体はユーザ決定済み(go 準拠の翻案。設計フェーズの「決定不要」表 B7)。日付 2026-07-13。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

注記(2026-07-14): 観測性は **OTLP / OTel 一本(vendor-neutral)** で確定し、**特定の観測性 / RUM SaaS SDK(Sentry / Datadog 等)は本体に同梱しない**(§6)。当初 v1 で Sentry 採用を検討したが、エラー通知・アラート等の運用機能は fork が向け先に選ぶ OTLP 互換バックエンド側で足りるため、vendor-neutral(vendor SDK 非同梱)を維持する([master-plan §1.2](../plan/master-plan.md))。OTLP-only の構造・ブラウザ→BFF 中継 seam・vendor 直参照禁止は不変。

## 背景

AGENTS.md の `[TODO] Observability / Logging`(BACKLOG B7)は、構造化ログのスキーマ・出力先(ブラウザ → BFF 中継 vs 直接 SaaS)・Sentry / Datadog / OTel の採否・trace ID 伝播を未決とし、暫定運用として「観測性 SaaS SDK を勝手に足さない / `console.log` をコミットに残さない(biome `noConsole`)」を敷いていた。本 ADR がこれを確定させる。

go-boilerplate は logging を **抽象 `Logger` interface(ctx-native・zap 実装を隠蔽)** で提供し、observability を **vendor-neutral OTLP-only**(**go 側**の ADR 0060)/ **シグナル別 config gating**(**go 側**の ADR 0059)/ **公式 semconv のみ**(**go 側**の ADR 0061 = exclusion 系)で構成する。本 ADR はこれを表示層(サーバ + ブラウザ)へ翻案する。

## 決定

### 1. 構造化ログ(`logging` カーネル)

- ログは **抽象ロガー interface** 経由とし、実装(pino 等)をアプリコードから隠蔽する(go の `Logger` interface の翻案。実装ライブラリは [0004](0004-library-management.md) で確定)
- **ctx-native**: ロガーは実行コンテキスト(サーバは `AsyncLocalStorage` 等の request context)から **`trace_id` / `span_id` を自動注入**する(caller は明示的に渡さない)
- レベルは Debug / Info / Warn / Error。**出力先・format は注入で決める**(config を logging カーネルが直読しない。[0021](0021-frontend-responsibility.md)。production = JSON / development = console 相当)
- **ログキースキーマを 1 箇所に集約**する(`trace_id` / `span_id` / `error_code` / `error_message` / `latency_ms` / `request_id` 等。go `const.go` の翻案)
- **PII / token / password をログに出さない**(masking。[0080](0080-error-handling.md) の redact と一致)。`console.log` はコミットに残さない([0002](0002-formatter-linter.md) `noConsole`)

### 2. OTel(`observability` カーネル)= vendor-neutral OTLP-only

- テレメトリの export transport は **OTLP に固定**する(go ADR 0060 の翻案)。**アプリコード(`features` / `components` / `model` 等の内層)は vendor SDK を import しない**。vendor SDK を使う場合でもそれは `observability` カーネルの **OTLP / OTel exporter 実装**として境界の裏に閉じ込め(§6)、vendor-specific なルーティング / 認証は **Collector / Agent 側 or その exporter 実装内**に置く
- resource attribute は **公式 semconv のみ**(`service.name` / `deployment.environment.name` / `service.version` 等)。custom / vendor-specific キーを typed config に入れない(go ADR 0061 の翻案)
- W3C `TraceContext` + `Baggage` を伝播規約とする(サービス境界越えの trace 伝播)

### 3. シグナル別 config gating(go ADR 0059 翻案)

- traces / metrics / logs を **`OBS_*` config(例 `OBS_TRACES_EXPORTER` / `OBS_METRICS_EXPORTER` / `OBS_LOGS_EXPORTER` / `OBS_OTLP_ENDPOINT`)で個別に on/off** する。専用 enable flag は持たず、**exporter 値が non-empty かつ `none` でなければ enabled** と derive する
- gating は **構築時**に効かせる(disabled シグナルは exporter / batcher / reader を一切作らない)。config は [0030](0030-environment-variable-management.md)(A7)の型付き Config で供給し、`observability` は config を注入で受ける([0021](0021-frontend-responsibility.md))
- **`logging` は `observability` を import しない**(依存方向を逆転させない)。trace 抽出は `observability` が提供する抽出器を logging へ**注入**する(go ADR 0059 の翻案)

### 4. ログと trace の相関

- active trace context を持つログ行に `trace_id` / `span_id` を載せ、backend で同一 trace に揃える(上記 1 の ctx-native 注入 + OTLP log export)。相関は上記の signal gate が支配する

### 5. ブラウザ側テレメトリの扱い(go に対応物なし・表示層固有)

go はバックエンドのみで、**server 常駐の OTel exporter / batch goroutine / shutdown hook** を前提とする。これは Next.js のブラウザ・serverless / edge には**そのまま載らない**ため、以下へ翻案する:

- **サーバ側(Node runtime)**: 上記 1〜4 の pino + otel-js 相当を適用。serverless では長寿命 exporter を前提にせず、リクエスト境界での flush / OTLP 送信を基本とする
- **ブラウザ側テレメトリは BFF 中継を seam とする**: クライアントで計測した値は **`/api/*`(BFF)経由でサーバへ送り、サーバ側で OTLP export** する(ブラウザから直接 SaaS へ送らない)。これは [0030](0030-environment-variable-management.md) の「secret を `NEXT_PUBLIC_` に出さない」「BFF runtime config」と整合し、vendor lock-in も避ける。fork が vendor SDK を使う場合も、ブラウザ→SaaS の直送でなく **自ドメイン `/api/*` 経由のリレー**でこの seam を保つ

### 6. 観測性バックエンド = OTLP/OTel(vendor-neutral・vendor SDK 非同梱)

観測性の export transport は **OTLP / OTel 一本**(vendor-neutral)とし、**特定の観測性 / RUM SaaS SDK(Sentry / Datadog 等)を本体に同梱しない**(fork 先判断)。エラー通知・アラート等の運用機能は、fork が向け先に選ぶ **OTLP 互換バックエンド**(任意の OTLP Collector / SaaS = Grafana / Honeycomb / Datadog / Sentry 等)側で行う。本体は OTLP export の口だけを持ち、vendor 固有 SDK に依存しない。

- **差し替え可能性([0010](0010-standards-and-non-lockin.md))**: OTLP / OTel semconv は W3C / CNCF の公開標準であり、向け先を任意の OTLP バックエンドへ変えられる。vendor SDK を本体に持たないため lock-in が構造的に生じない(設計者が選択主体)。
- vendor SDK を使う fork は、それを `observability` カーネルの **OTLP / OTel exporter 実装**として境界の裏に閉じ込める(アプリコードは `observability` の公開面〈構造的型〉に依存。vendor 具象を `features` / `components` / `model` へ散らさない。[0021](0021-frontend-responsibility.md))。導入時は exact-pin + `pnpm audit`([0004](0004-library-management.md))。

## 禁止事項

- ❌ **`features` / `components` / `model` から vendor 観測性 SDK(`@sentry/*` 等)を直接 import すること**(vendor 直参照を散らさない。vendor SDK の配線は `observability` / `adapters` / 起動境界に限る = §6 / [0010](0010-standards-and-non-lockin.md) / [0021](0021-frontend-responsibility.md))
- ❌ vendor 具象へアプリコードを直結し **差し替え不能にすること**(依存先は `observability` カーネルの公開面。OTLP / OTel 骨格を迂回して vendor 固有機能へロックインしない)
- ❌ custom / vendor-specific な semconv キーを typed config に入れること(公式 semconv のみ)
- ❌ `logging` が `observability` を import すること(依存逆転。trace 抽出は注入で受ける)
- ❌ `logging` / `observability` カーネルが config を直読すること(注入で受ける。直読は config カーネルのみ = [0030](0030-environment-variable-management.md)。vendor の DSN / endpoint も typed config 経由)
- ❌ ブラウザから直接 SaaS へテレメトリを送ること(BFF 中継 seam。vendor SDK 使用時も自ドメイン経由に保つ)
- ❌ PII / token / password をログに出すこと / `console.log` をコミットに残すこと([0002](0002-formatter-linter.md))

## 補足

- 本 ADR の Accepted に伴い、AGENTS.md の `[TODO] Observability / Logging` 節の削除・書き換えを実施する(未実施 — AGENTS.md は Protected Documentation のため、変更案の提示とユーザ承認を経て適用する)
- `logging` / `observability` カーネルの物理ディレクトリ・README は本 ADR の実装時に作成する([0020](0020-adopted-architecture.md) の「B7 確定時に作成」)
- go には logging 単体の独立 ADR がなく(logging README + ADR 0054 に分散)、本 ADR が logging / observability を 1 本にまとめて定める

## 関連 ADR

- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — `logging` / `observability` カーネル(config は注入で受ける)
- [0030-environment-variable-management.md](0030-environment-variable-management.md)(A7)— `OBS_*` config の供給 / BFF runtime config / secret 非露出
- [0080-error-handling.md](0080-error-handling.md)(B6)— エラーログのレベル(5xx=error / 4xx=warn)・redact(本 ADR がスキーマ・trace 相関を定める)
- [0071-bff-api-integration.md](0071-bff-api-integration.md)(B3)— fetch wrapper のログ / trace 伝播 / ブラウザ→BFF 中継の実装層
- [0002-formatter-linter.md](0002-formatter-linter.md) — `noConsole`(console.log 抑止)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — vendor-independent 正当化 / 差し替え可能性(vendor SDK を抜いても正当・OTLP 経由で非ロックイン)
- [0004-library-management.md](0004-library-management.md) — fork が vendor 観測性 SDK を導入する場合の exact-pin + `pnpm audit`
- [0020-adopted-architecture.md](0020-adopted-architecture.md) / [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md) — `observability` / `adapters` 境界(vendor SDK を裏に閉じ込める先)
- [master-plan §1.2 採用ロードマップ](../plan/master-plan.md) — v1/v2 バッテリー採用マトリクス(観測性 = OTLP/OTel vendor-neutral・vendor SDK 非同梱)
