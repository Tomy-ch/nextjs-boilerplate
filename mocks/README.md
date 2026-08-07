# 契約駆動モック

`make gen-api` が契約から生成する MSW ハンドラの置き場です。**手で編集しません。**
契約が変われば自動的にモックも変わる、という一方向を保つための場所であり、
手書きのモックを足すと契約とモックが別々に動き始めます。

`src/` の外に置くのは [0027](../docs/adr/0027-directory-structure.md) の規定によります。

## 構成

| パス | 中身 |
| --- | --- |
| `api/endpoints.msw.ts` | 本体 API の MSW ハンドラ。response は faker で組み立てられる |
| `api/endpoints.ts` / `auth/endpoints.ts` | orval が生成する HTTP client。**使いません**(下記) |
| `handlers.ts` | 生成ハンドラの取りまとめ。手書きのハンドラは足しません |
| `node.ts` | Node 側の interception。Server Components からの取得もここを通ります |
| `contract-conformance.test.ts` | 全ハンドラの応答を、対応する zod で検証します |

`mocks/<契約名>/` だけが生成物です。直下のファイルは手書きであり、linter の対象に残しています。

## 起動

`APP_API_MODE=mock` のとき、`src/instrumentation.ts` が Config の確定後に Node 側の interception を
立てます。テストは `vitest.setup.ts` が同じハンドラを使います。dev サーバーとテストで別のスタブを
持つと、契約が変わってもテストだけが古い形のまま通り続けるためです。

`src/` から `mocks/` への import は境界検査で禁止しています。許しているのは起動境界
(`src/instrumentation*`)だけで、mock の起動はそこの仕事だからです。

## 画像は差し替えません

mock が差し替えるのは API だけです。商品画像は配信元(`MEDIA_ORIGIN`)から実物を取得します。
配信は backend と同じ compose に居る別コンテナ(Garage の公開エンドポイント)が行っており、
バックエンド API が起動していなくても取得できるためです。

## 契約適合の検査

生成器は `pattern` を持つ項目に `faker.helpers.fromRegExp(パターン)` を出しますが、この API は
`\d` のような短縮クラスもアンカーも解釈せず、パターンの文字列をほぼそのまま返します。そのため
値の作り方を `orval.config.ts` の `override.mock.properties` で指定しています。

指定漏れは `contract-conformance.test.ts` が捕まえます。`nullable` な項目は乱数で値と `null` を
選ぶため、seed を固定して複数回まわします(1 回だけだと `null` を引いた回だけ通ってしまう)。

## 使わない client がここにある理由

orval は client の出力先(`target`)を必須とします。一方 outbound の resilience は `adapters/server` の
手書き wrapper が所有する([0071](../docs/adr/0071-bff-api-integration.md))ため、生成された client を
本番が使うことはありません。これを `src/adapters/gen/` へ置くと「どちらで呼ぶのか」が生成物の側から
曖昧になるため、mock 生成の副産物としてこちらに寄せています。MSW ハンドラはこの client に依存しません。

## 認証のモック

mock OIDC Provider(`auth` 契約)のハンドラは生成していません。認証の配線は別途行うため、
使う当てのないハンドラを先に置かない方針です。
