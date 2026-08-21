# Middleware（Proxy）方針

Next.js 16 で **Middleware から Proxy へリネームされた `proxy.ts`** の **責務範囲 / runtime 方針 / 認証 hook の置き場** を定める。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([0140](0140-documentation-operations.md))。本 ADR の内容自体はユーザ決定済み(Tier 5)。日付 2026-07-13。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

BACKLOG C6 は、`middleware.ts` の責務範囲・Edge runtime 使用是非・認証 hook の置き場を未決としていた。

本リポジトリは **Next.js 16** を採用しており、**Middleware は Next.js 16 で「Proxy」にリネーム**された(ファイル規約 = `proxy.ts`。`middleware.ts` は deprecated。移行 codemod `middleware-to-proxy` あり)。実装前に `node_modules/next/dist/docs/` を確認した結果、以下を前提とする(AGENTS.md「This is NOT the Next.js you know」):

- `proxy.ts` はリクエスト完了前にサーバで走り、rewrite / redirect / ヘッダ・cookie 変更 / 直接応答ができる
- **Next.js 公式は「Proxy は last resort。他に手段がなければ使う」**と明示。**セッション管理・完全な認可には使わず**、`optimistic checks`(権限ベースのリダイレクト等)に限る
- **遅いデータ取得に使わない**(`fetch` の cache オプションは Proxy 内で無効)。最適化時は CDN に配置されるため、共有モジュール・グローバルに依存しない
- **既定 runtime は Node.js**(proxy.md「Runtime」節)。`runtime` セグメント設定オプションは Proxy ファイルでは**使用不可**(設定するとエラー)。つまり runtime をコード側で選択する枠はなく、実際の実行環境はデプロイ先(adapter)に依存する(v15.5 で Node.js runtime が stable 化した経緯あり。「Middleware は Edge 既定」は旧 Middleware 時代の説明)
- **1 プロジェクト 1 `proxy.ts`**(ロジックはモジュールへ分割して import 可)

## 決定

### 1. `proxy.ts` = 薄い境界(thin・last resort)

- **`proxy.ts` は薄い境界に限る**。用途は rewrite / redirect / ヘッダ・cookie 操作 / optimistic な権限リダイレクト。**業務ロジック・重い処理・データ取得を書かない**([0011](0011-no-docker.md) thin proxy / [0070](0070-backend-role-separation.md) と一貫。Next.js 公式の「last resort」ガイダンスとも一致)
- **まず `proxy.ts` 以外で解けないか**を検討する(単純リダイレクトは `next.config.ts` の `redirects`、認可は各境界での検査)。Proxy は代替がない場合の最終手段
- ファイルは **`src/proxy.ts`**(`src/app/` と同階層)。これは 10 カーネルの**外側**の起動 / 境界エントリであり(`instrumentation.ts` と同類として [0021](0021-frontend-responsibility.md) の起動 / ビルド境界の例外に準ずる。ESLint boundaries の element 割当は実装 PR)、`app`(route / page)ではない

### 2. Runtime 方針(Node.js 既定・Edge 互換維持)

- **Next.js 16 の Proxy は既定で Node.js runtime** であり、`runtime` セグメント設定は Proxy ファイルでは使用できない(設定するとエラー)。runtime はコードで選択する対象ではなく、実際の実行環境はデプロイ先(adapter)に依存する。boilerplate 本体は特定のデプロイ先・runtime 前提を強制しない([0011](0011-no-docker.md))
- ただし Proxy は最適化されたデプロイでは **CDN(Edge 相当)に配置され得る**ため、`proxy.ts` のコードは **Edge Runtime 互換(Node API・共有グローバル非依存)を保つ**ことを既定とする。config を参照する場合は **Node API 非依存の config スライス**を使う([0030](0030-environment-variable-management.md) A7 の Edge 交点)。config は import 境界に従い、Proxy でも [0030](0030-environment-variable-management.md) の client/server 分割・不変 Config を守る

### 3. 認証 hook の置き場 = fork 先判断

- **認証・セッションの具体モデルは fork 先判断**([0070](0070-backend-role-separation.md) A2。Next.js 公式も「Proxy をセッション管理・認可に使うな」と明示)。boilerplate 本体は `proxy.ts` に特定の認証実装を組み込まない
- fork 先が認証を導入する場合、`proxy.ts` で行ってよいのは **optimistic なリダイレクト**(未ログインらしきリクエストのリダイレクト等)までとし、**確定的な認可はデータ境界(`adapters` / Route Handler / Server Action)** で行う([0070](0070-backend-role-separation.md) / [0071](0071-bff-api-integration.md))

### 4. 検証の割り(関数本体 = unit / matcher の選別 = e2e)

- **`proxy()` の本体は `unit`**。分岐・redirect 先・`returnUrl` の組み立ては、関数として呼べば行使できる([0090](0090-testing-strategy.md))
- **`export const config` の `matcher` の選び足りなさは `e2e` が負う**。`matcher` は Next.js が経路を選ぶ前に読む宣言であり、`proxy()` を直接呼ぶ経路を通らない。守るべき接頭辞が選別から漏れれば前捌きごと素通しになり、それは経路を開けば応答に出る
- **選び過ぎは、どのテストも観測できない**。除外している接頭辞を選別へ含めても、`proxy()` はその経路に役割を要求せずそのまま通すため、応答は変わらない。現れるのは静的資産 1 件ごとの費用としてだけである。ここを守るのは宣言の読み合わせであり、テストではない

## 禁止事項

- ❌ `proxy.ts` に業務ロジック・重い処理・データ取得を書くこと(薄い境界。last resort)
- ❌ `proxy.ts` をセッション管理・確定的な認可の主機構にすること(optimistic チェックのみ。認可はデータ境界)
- ❌ deprecated な `middleware.ts` を新規に作ること(Next.js 16 は `proxy.ts`)
- ❌ Proxy で共有モジュール・グローバル状態・Node API に依存すること(CDN 配置され得る。Edge 互換を保つ)
- ❌ `proxy.ts` に `runtime` セグメント設定を書くこと(Next.js 16 の Proxy では使用不可・エラーになる)
- ❌ 特定の認証実装・デプロイ先 runtime 前提を boilerplate 本体で強制すること(認証は fork 先判断。runtime はデプロイ先依存)

## 関連 ADR

- [0070-backend-role-separation.md](0070-backend-role-separation.md)(A2)— thin proxy / 認証は fork 先 / 確定的認可はデータ境界
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md)(A4)— App Router / driving adapter 原則
- [0030-environment-variable-management.md](0030-environment-variable-management.md)(A7)— Edge 用 Node API 非依存 config スライス(本 ADR との交点)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — 起動 / 境界エントリ(10 カーネル外)としての `proxy.ts`
- [0121-i18n-strategy.md](0121-i18n-strategy.md)(C1)— ロケール検出の seam(採用時、Proxy を使う場合)
