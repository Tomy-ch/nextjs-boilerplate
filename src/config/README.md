---
imports-allowed: []
forbidden: [ui, fetch, business-logic]
test-requirement: unit
---

# config

型付き設定を目的別に提供するカーネルです。server config と `NEXT_PUBLIC_` の client config を分離します。

## 受け入れるもの

- 環境変数の検証、目的別 config、設定値の不変な公開面

## 受け入れないもの

- UI、fetch、業務ロジック

## 運用

- `process.env` の直読はこのカーネルだけに置く
- server config は `adapters/server` と起動・ビルド境界だけが利用する
