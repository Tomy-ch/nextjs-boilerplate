---
imports-allowed: [features, components, capabilities, stores, adapters/server, errors, logging, config, model]
forbidden: [business-logic, direct-fetch]
test-requirement: route
---

# app

App Router の driving adapter です。`page.tsx` と `layout.tsx` は feature を薄く呼び出し、route handler は `adapters/server` を介して外部接続します。

## 受け入れるもの

- route segment、route handler、metadata と layout への横断 UI / Provider の mount
- Next.js が規定する特殊ファイルと route segment

## 受け入れないもの

- 業務ロジック、画面ユースケースの編成、route segment からの直接 fetch

## 運用

- 層をまたぐ import は `@/*` alias を使う
- 役割を示さない `common`、`shared`、`utils`、`lib` 等の置き場は作らない
- 単一 feature 専用のコードは `features/<name>/` に置く
