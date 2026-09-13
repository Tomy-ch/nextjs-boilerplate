---
imports-allowed: [model, errors, logging, config, observability]
forbidden: [components, capabilities, stores, business-logic]
test-requirement: [unit, integration]
---

# stream

長寿命接続を**開いて読む**面です。接続を保持するのはバックエンドで、ここが持つのは購読 1 本の
状態機械と、それを組み立てる部品だけです（[親の README](../../README.md)「購読は開いて読む側だけを持つ」）。

## 親と違う点

**検証の要求が親と違います。** `adapters` の宣言は `integration` ですが、それが掛かるのは外へ出る
口を**直接持つ**モジュールです（[README](../../README.md) の「運用」）。ここでそれを持つのは
`subscription.ts` だけで、残りは位置・封筒・順序・待ち時間を扱う部品であり、確かめるのは値の
正しさそのものです。

**判定は「そのモジュールが外へ出るか」で行い、ディレクトリの位置では決めません。**

| モジュール | 検証 | 理由 |
| --- | --- | --- |
| [`subscription.ts`](subscription.ts) | `integration` | 発券の中継を叩き、`EventSource` を開く |
| [`use-stream.ts`](use-stream.ts) | `unit` | 購読を component の寿命へ束ねる。hook は React の木を介してしか呼べないので RTL の `render` / `act` で確かめる |
| [`cursor.ts`](cursor.ts) | `unit` | 位置の表し方と比較 |
| [`envelope.ts`](envelope.ts) | `unit` | 封筒と制御指示の読み取り |
| [`ordering.ts`](ordering.ts) | `unit` | 到達順の乱れを直す窓と、流した位置の記憶 |
| [`backoff.ts`](backoff.ts) | `unit` | 張り直しまでの待ち時間 |

## 受け入れるもの

- 購読 1 本の状態機械と、それを組み立てる部品

## 受け入れないもの

- 本文の形。資源ごとの module（`client/api/<資源>.ts`）が宣言します
- 接続の保持・event の採番・誰に何を配るか。バックエンドが持ちます

## 関連する ADR

この区画のコードが依存する決定です。**コメントからは ADR を直接指さず、この節を辿ります**
（[docs/rules.md](../../../../docs/rules.md)「コメントと文書」）。層全体の一覧は
[親の README](../../README.md) が持ちます。

- [0074](../../../../docs/adr/0074-runtime-communication-seam.md) — 購読 seam の選択と却下、責務分界。ticket を文言・ログ・span へ載せない制約
- [0090](../../../../docs/adr/0090-testing-strategy.md) — 層別の検証責務（`unit` と `integration` を分けて宣言する理由）
