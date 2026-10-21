> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# telemetry

ブラウザ発のシグナルを組み立てて中継へ送る面と、ブラウザ側の計装です。

**import の上限はここが宣言しません。** 境界を宣言するのは要素の根で、このディレクトリを含む要素の根は [`adapters/`](../../README.ja.md) です（[0021](../../../../docs/adr/0021-frontend-responsibility.ja.md)）。

## 親と違う点

**検証の要求が親と違います。** `adapters` の宣言は `integration` ですが、それが掛かるのは
`fetch`（または注入された `fetchImpl`）を**直接持つ**モジュールです（[README](../../README.ja.md) の
「運用」）。ここに置くものはどれもそれを持ちません —— 報告の送信は `sendBeacon` で、要求を span に
するのは OTel の計装であって、このディレクトリのコードは組み立てと登録だけを持ちます。

**判定は「そのモジュールが外へ出るか」で行い、ディレクトリの位置では決めません。**

| モジュール | 検証 | 理由 |
| --- | --- | --- |
| [`report-telemetry.ts`](report-telemetry.ts) | `unit` | 報告を組み、`sendBeacon` へ渡す |
| [`route-pattern.ts`](route-pattern.ts) | `unit` | パスから route の型を復元する |
| [`browser-tracer.ts`](browser-tracer.ts) | `unit` | OTel の provider と計装を組み立てて登録する。実送信は SDK が持つ |

**span の名前にクエリを含めません。** 要求ごとに条件が違うため、含めると同じ経路への要求が別の名前へ散ります（[0082](../../../../docs/adr/0082-client-observability.ja.md)）。クエリを含む URL はデフォルトの計装が `url.full` 属性へ残すため、1 件ずつ辿るときはそちらを読みます。

## 受け入れるもの

- 報告の組み立てと送信、ブラウザ側の計装の立ち上げ

## 受け入れないもの

- 業務ロジック、受け側の検証（`server/telemetry/` が持つ）

## 関連する ADR

この区画のコードが依存する決定です。**コメントからは ADR を直接指さず、このセクションを辿ります**
（[docs/rules.ja.md](../../../../docs/rules.ja.md#comments)）。レイヤー全体の一覧は
[親の README](../../README.ja.md) が持ちます。

- [0082](../../../../docs/adr/0082-client-observability.ja.md) — 何を測って何を送るか。span の名前に載せてよいもの
- [0077](../../../../docs/adr/0077-bff-abuse-protection-boundary.ja.md) — 受信エンドポイントが持つ上限。送る側の切り詰めはそのコピーであること
- [0090](../../../../docs/adr/0090-testing-strategy.ja.md) — レイヤー別の検証責務（`unit` として扱う理由）
