---
imports-allowed: [model, errors, logging, config]
forbidden: [components, capabilities, stores, business-logic]
test-requirement: integration
---

# adapters

バックエンド API、BFF fetch、analytics など外部接続だけを置く境界アダプタです。`server/` と `client/` の 2 element に分けます。
実行文脈を持たない規則——どちらの element が送る要求にも等しく効くもの——は `http/` に置き、契約からの生成物は `gen/` に置きます。どちらも `adapters` の中からだけ import できます。

## 受け入れるもの

- 外部 API / SDK への接続、外部型から表示用型への変換
- `server/` の secret を使う接続、`client/` のブラウザ向け接続

## 受け入れないもの

- 業務ロジック、UI、local browser API

## 主体を名乗るかは、口ではなく client が決める

**`createHttpClient` に `getBearerToken` を渡さない client は、そこを通る要求のすべてが匿名になります。**
資格情報はヘッダを組む境界が付けるもので、呼び出し側の口ごとには決まりません。読み取りだけを持つ
うちは匿名で妥当ですが、**同じ client の上に書き込みを足した時点で、書き込みも匿名で出ていきます**。

公開の読み取りと主体の要る書き込みが 1 つの client に同居するときは、`getBearerToken` を渡したうえで
`allowAnonymous: true` を併せます。取れたときだけ載る形になり、未ログインの読み取りも通ります。

これを落としても型も検査も落ちません。**気づけるのはバックエンドが 401 を返したときだけ**で、症状は
「その画面の保存だけが必ず失敗する」という形で現れます。前面の役割判定は残りますが、バックエンドが
自分で認可を判断する材料が届かなくなるため、層が 1 枚に減ります。

## URL の予算

**条件を URL へ載せる要求には、1 本ぶんの予算があります。** 経路の中継——ブラウザ / CDN /
リバースプロキシ / backend——はどれも要求行の長さに上限を持ち、超えた要求は backend へ届く前に
弾かれます。契約が各条件に宣言した上限は、この 1 つの予算を食い合います。

数えるのは **request target——path とクエリ——のバイト数**です。要求行に載る部分そのもので、
接続先の違う経路どうしでも同じものを数えられます。文字数ではありません。全角 1 文字は UTF-8 で
3 バイトになり、符号化すると 9 文字へ膨らみます。

**契約の上限を広げたら、予算を計算し直してください。** 文字列条件の `maxLength`、繰り返す条件の
`maxItems`、カーソルの長さ——どれが動いても配分が変わります。ひとつの条件が伸びた分は、他の条件が
使える余地から引かれます。

<!-- sample:begin -->
同梱のサンプルで、商品一覧（`GET /v1/products`）に宣言上限をすべて張り付けた場合:

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
なります。実務上の閾値（8 KB 前後）に対して、契約を守る限りは超えられない——逆に言えば、上限を
広げた時点でこの計算は崩れます。
<!-- sample:end -->

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
  （`http/url-budget.ts` / `server/http/search-params.ts` / `server/http/retry-policy.ts` /
  `server/http/error-status.ts` など、境界の前後で値を写すだけのもの）は、その変換自体を `unit` の
  形——HTTP を模さず値を直接照合する——で検証します。境界を持たないものへ境界のテストを課しても、
  確かめる相手が無いためです。**`http/` はこの形しか置きません**——実行文脈を持たない規則の置き場
  なので、外部との往復を持つものは `server/` か `client/` に属します

- `server/` は server config を利用でき、`client/` は secret を利用しない
- 外部型・生成型はここで変換し、内側へ漏らさない
