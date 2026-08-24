---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging, observability]
forbidden: [features]
test-requirement: feature
---

# features

画面単位の機能スライスです。各 `features/<name>/` に画面ユースケース、専用 UI、hook、Server Action をフラットに共置します。

## 受け入れるもの

- データ取得の編成、複数 API の集約、フォーム送信フロー、楽観更新
- その feature 専用の UI、hook、`actions.ts`

## 受け入れないもの

- 他 feature への直接依存
- 複数 feature で共有すべき要素、バックエンドの業務ロジック

## 描画を span に載せる

画面の最上位のエクスポート（`<screen>/page-content` と `<screen>/view`）を `observability` の `withRenderSpan` で包む。仕組みと span の読み方は [observability/README.md](../observability/README.md) が持つ。

```tsx
export const XxxPageContent = withRenderSpan(
  "features/<name>/<screen>/page-content",
  async ({ id }: XxxPageContentProps) => {
    // 取得と組み立て
  },
);
```

- **名前は `src/` からのモジュールパスと一致させる。** span 名がそのまま置き場を指すので、ずれると trace からファイルへ戻れない。利用者の入力を混ぜない
- **`ui/` の部品は包まない。** 画面ごとの帰属は最上位の 2 つで足りる。部品まで広げると 1 描画の span が部品の数だけ増え、読む側が画面の輪郭を失う
- **client component（`"use client"` を持つファイル）は包まない。** ブラウザでの描画では記録しない span になる一方で、`@opentelemetry/api` がその画面のクライアントバンドルへ入る（[0101](../../docs/adr/0101-performance-budget.md)）。span が付くのは server 描画の分だけなので、払った分は返らない
- **取得を持つ側を包むと帰属が付く。** `page-content` が待つ通信はその span の中に入るので、外向きの `fetch` を画面へ結び付けられる

## 運用

- 横断利用が必要になった要素は責務に応じて `model`、`components`、`adapters`、`capabilities`、`stores` へ昇格する
- Server Action は編成だけを担い、業務ロジックを置かない
- feature ごとにも同じ frontmatter を持つ README を置く
- **`test-requirement: feature` が掛かるのは画面の合成**（`view` / `page-content` と、その feature 専用の UI）である。値を返す対象——純関数、hook、Server Action の補助——は [0090](../../docs/adr/0090-testing-strategy.md) 層別責務表の `unit` 行（「feature 内純関数」）に従う。宣言が feature の下の全ファイルへ一律に掛かると、React のツリーを要さない対象にまで合成の観点を課すことになり、テストの側が正しいのに宣言と食い違う
