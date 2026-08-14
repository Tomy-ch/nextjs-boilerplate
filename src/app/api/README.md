---
imports-allowed: [features, components, capabilities, stores, adapters, errors, logging, config, model]
forbidden: [business-logic, direct-fetch]
test-requirement: integration
---

# api

Route Handler だけを置く区画です。`app` の中にありますが、検証の要求だけが親と異なります。

## 親と違う点

親（`src/app/`）は `route` を宣言しています。あれは `layout.tsx` / `page.tsx` の**合成**を確かめる
要求で、手段は React Testing Library での描画です。Route Handler は描画を持たず、確かめるのは
**HTTP 境界の型と形**（status・ヘッダ・本文）なので、[0090](../../../docs/adr/0090-testing-strategy.md)
の層別責務表では `integration` に当たります。

判定の基準は「描画を返すか、応答を返すか」です。`app` の下に新しく応答を返す区画を作るときは、
同じ基準でここと同じ宣言を持たせます。

## 受け入れるもの

- バックエンドへの中継と、その入出力の検証
- 認証の往復のように、ブラウザから直接叩けない相手との通信

## 受け入れないもの

- 業務ロジック（[0070](../../../docs/adr/0070-backend-role-separation.md)）
- 生の `fetch`（`adapters` を通す）
- 描画

## モジュール

| モジュール | 役割 |
| --- | --- |
| [`auth/`](auth) | 認証の往復。IdP との認可コード交換と session cookie の発行・破棄 |
| `products/` | 一覧の増分取得を中継する BFF |
| `addresses/` | 郵便番号からの住所補完を中継する BFF。入力中の画面が叩く |
