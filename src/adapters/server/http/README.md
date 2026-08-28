---
imports-allowed: [model, errors, logging, config, observability]
forbidden: [components, capabilities, stores, business-logic]
test-requirement: unit
---

# http

`server/` の要求境界が共有する、応答と本体の扱いです。

## 親と違う点

**検証の要求が親と違います。** `adapters` の宣言は `integration` ですが、それが掛かるのは**外部との
往復を持つモジュール**です（[README](../../README.md) の「運用」）。ここに置くものは要求と応答の間で
値を写すだけで、`fetch` も注入された `fetchImpl` も持ちません。境界を持たないものへ境界のテストを
課しても、確かめる相手が居ません。

**判定は「そのモジュールが外へ出るか」で行い、ディレクトリの位置では決めません。** 外へ出るものが
ここへ増えたら、そのモジュールだけが `integration` に戻ります。

| モジュール | 検証 | 理由 |
| --- | --- | --- |
| [`data-scope.ts`](data-scope.ts) | `unit` | 取得の口の分類と、キャッシュ・資格情報ヘッダの関門 |
| [`error-status.ts`](error-status.ts) | `unit` | 分類から status への表 |
| [`error-response.ts`](error-response.ts) | `unit` | 分類から応答を組む |
| [`json-request.ts`](json-request.ts) | `unit` | 受け取った要求の型と大きさを見る |
| [`request.ts`](request.ts) | `integration` | 外部 API を叩く |
| [`retry-policy.ts`](retry-policy.ts) | `unit` | status から再試行の可否を決める |
| [`search-params.ts`](search-params.ts) | `unit` | クエリを素の値へ写す |

## 受け入れるもの

- `server/` の要求境界が共有する、応答と本体の規則

## 受け入れないもの

- 業務ロジック、特定の口に固有の契約
