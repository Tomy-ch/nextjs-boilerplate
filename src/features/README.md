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

エクスポートを `observability` の 2 つで包む。**どちらで包むかは置き場で決まる。**

| 置き場 | 使うもの | 既定 |
| --- | --- | --- |
| `<screen>/page-content` / `<screen>/view` | `withScreenSpan` | 有効 |
| `<screen>/ui/**` | `withPartSpan` | 無効（`OBS_RENDER_SPANS=part` で開く） |

```tsx
export const XxxPageContent = withScreenSpan(
  "features/<name>/<screen>/page-content",
  async ({ id }: XxxPageContentProps) => {
    // 取得と組み立て
  },
);
```

仕組みと span の読み方は [observability/README.md](../observability/README.md) が持つ。

- **名前は `src/` からのモジュールパスと一致させる。** span 名がそのまま置き場を指すので、ずれると trace からファイルへ戻れない。利用者の入力を混ぜない
- **client component（`"use client"` を持つファイル）は包まない。** ブラウザでの描画では span を作らないため、包んでも得られるのは server 描画の 1 回分だけである
- **取得を持つ側を包むと帰属が付く。** `page-content` が待つ通信はその span の中に入るので、外向きの `fetch` を画面へ結び付けられる
- **部品は常用しない。** `part` を開けると 1 描画の span が描く部品の数だけ増える。値打ちが出るのは、分岐した結果——どの姿を返したか——を trace から読みたいときである

## 運用

- 横断利用が必要になった要素は責務に応じて `model`、`components`、`adapters`、`capabilities`、`stores` へ昇格する
- Server Action は編成だけを担い、業務ロジックを置かない
- feature ごとにも同じ frontmatter を持つ README を置く
- **`test-requirement: feature` が掛かるのは画面の合成**（`view` / `page-content` と、その feature 専用の UI）である。値を返す対象——純関数、hook、Server Action の補助——は [0090](../../docs/adr/0090-testing-strategy.md) 層別責務表の `unit` 行（「feature 内純関数」）に従う。宣言が feature の下の全ファイルへ一律に掛かると、React のツリーを要さない対象にまで合成の観点を課すことになり、テストの側が正しいのに宣言と食い違う
