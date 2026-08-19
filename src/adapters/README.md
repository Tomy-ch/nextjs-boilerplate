---
imports-allowed: [model, errors, logging, config]
forbidden: [components, capabilities, stores, business-logic]
test-requirement: integration
---

# adapters

バックエンド API、BFF fetch、analytics など外部接続だけを置く境界アダプタです。`server/` と `client/` の 2 element に分けます。
実行文脈を持たない規則——どちらの element が送る要求にも等しく効くもの——は `http/` に置き、`adapters` の中からだけ import できます。

## 受け入れるもの

- 外部 API / SDK への接続、外部型から表示用型への変換
- `server/` の secret を使う接続、`client/` のブラウザ向け接続

## 受け入れないもの

- 業務ロジック、UI、local browser API

## URL の予算

**条件を URL へ載せる要求には、1 本ぶんの予算があります。** 経路の中継——ブラウザ / CDN /
リバースプロキシ / backend——はどれも要求行の長さに上限を持ち、超えた要求は backend へ届く前に
弾かれます。契約が各条件に宣言した上限は、この 1 つの予算を食い合います。

数えるのは **request target——path とクエリ——のバイト数**です。要求行に載る部分そのもので、
接続先の違う経路どうしでも同じものを数えられます。文字数ではありません。全角 1 文字は UTF-8 で
3 バイトになり、符号化すると 9 文字へ膨らみます。

現行の契約で、商品一覧（`GET /v1/products`）に宣言上限をすべて張り付けた場合:

| 条件 | 上限の根拠 | バイト |
| --- | --- | --- |
| `categoryCodes` × 32 | `maxItems: 32` / 値は最大 5 桁 | 640 |
| `statusCodes` × 32 | 同上 | 576 |
| `keyword` | `maxLength: 255`。全角は 1 文字 9 バイトへ膨らむ | 2,304 |
| `minPrice` / `maxPrice` | `maxLength: 40` × 2 | 100 |
| `minQuantity` / `maxQuantity` | int32 10 桁 × 2 | 46 |
| `sort` / `first` | enum と 3 桁 | 28 |
| `after` | `maxLength: 512` | 519 |
| **計** | | **約 4.2 KB** |

`keyword` を 4 バイト文字（絵文字など）で埋めた場合は 1 文字が 12 文字へ膨らみ、合計は約 5.0 KB に
なります。

**契約の上限を広げたら、この表を計算し直してください。** `keyword` の `maxLength`、`after` の長さ、
`maxItems` のどれが動いても配分が変わります。

閾値は `NEXT_PUBLIC_HTTP_MAX_URL_BYTES` が持ちます（[env/README](../../env/README.md)）。直値で
持たないのは、経路のどこが最初に弾くかが配信構成で決まるためです。fork は自分の経路の最小値へ
書き換えてください。`NEXT_PUBLIC_` はビルド時にリテラルへ置換されるため、変更には再ビルドが要ります。

判定は `http/url-budget.ts` の 1 つで、呼ぶのは 2 つの要求境界——`server/http/request.ts` と
`client/http/request.ts`——だけです。**画面ごとの事前チェックは置きません。** 閾値は画面からは
原理的に分からず、置けば画面の数だけ当て推量の定数が増えます。超過は `uri-too-long` として落ち、
画面には `errors` の分類 1 つとして現れます（[0080](../../docs/adr/0080-error-handling.md)）。

## 運用

- **`integration` の宣言が掛かるのは、外部との往復を持つモジュールです**。`fetch`（または注入された
  `fetchImpl`）を直接持つものが対象で、そこでは HTTP 境界だけを対象に、内側を mock して型と形を
  確かめます（[0090](../../docs/adr/0090-testing-strategy.md)）。**外部 IO を持たない純粋な変換**
  （`http/search-params.ts` / `http/retry-policy.ts` / `http/error-status.ts` など、境界の前後で値を
  写すだけのもの）は、その変換自体を `unit` の形——HTTP を模さず値を直接照合する——で検証します。
  境界を持たないものへ境界のテストを課しても、確かめる相手が無いためです

- `server/` は server config を利用でき、`client/` は secret を利用しない
- 外部型・生成型はここで変換し、内側へ漏らさない
