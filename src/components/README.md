---
imports-allowed: [model, errors]
forbidden: [fetch, config, capabilities, stores, business-state]
test-requirement: component
---

# components

複数 feature で使うデザインシステム的な純 UI コンポーネントを置くカーネルです。

## 受け入れるもの

- 横断 UI、表示に必要な UI 状態、アクセシブルな操作部品

## 受け入れないもの

- fetch、config、業務状態、`capabilities`・`stores` の import

## 運用

- 単一 feature 専用の UI は feature 内に置く
- 依存先は `model` と `errors` に限定する
- class 名の条件分岐と Tailwind utility の競合解消には [`cn.ts`](./cn.ts) を使う。`clsx` と `tailwind-merge` を直接利用する実装は増やさない
- 色・余白などは [`tokens/`](../../tokens/README.md) の semantic token を使う。primitive token の直接利用はしない
