---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging]
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

## 運用

- 横断利用が必要になった要素は責務に応じて `model`、`components`、`adapters`、`capabilities`、`stores` へ昇格する
- Server Action は編成だけを担い、業務ロジックを置かない
- feature ごとにも同じ frontmatter を持つ README を置く
- **`test-requirement: feature` が掛かるのは画面の合成**（`view` / `page-content` と、その feature 専用の UI）である。値を返す対象——純関数、hook、Server Action の補助——は [0090](../../docs/adr/0090-testing-strategy.md) 層別責務表の `unit` 行（「feature 内純関数」）に従う。宣言が feature の下の全ファイルへ一律に掛かると、React のツリーを要さない対象にまで合成の観点を課すことになり、テストの側が正しいのに宣言と食い違う
