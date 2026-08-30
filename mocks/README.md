---
test-requirement: unit
# sample:begin
coverage-exclusions:
  - "mocks/api/**"
# sample:end
---

# 契約駆動モック

`make gen-api` が契約から生成する MSW ハンドラの置き場です。**手で編集しません。**
契約が変われば自動的にモックも変わる、という一方向を保つための場所であり、
手書きのモックを足すと契約とモックが別々に動き始めます。

`src/` の外に置くのは [0027](../docs/adr/0027-directory-structure.md) の規定によります。

カタログ（Storybook）が自分で答える `/api/*` のハンドラはここには置きません。あれが返すのは
バックエンドの応答ではなく Route Handler が組み立てた表示用の形で、契約からは生成できないため
です（[0054](../docs/adr/0054-ui-catalog-storybook.md)）。置き場は `.storybook/msw/` です。

## テストの責務

frontmatter の `test-requirement: unit` が掛かるのは、取りまとめが持つ判定 —— ハンドラの並び順と、
同じ要求へ同じ応答を返させる組み立て —— です（[0090](../docs/adr/0090-testing-strategy.md)）。
生成物そのものは検査の母数から外れ、正しさは契約からの再生成が担保します。

**`setupServer` と `fetch` を使っていても `integration` ではありません。** 層別責務表の `integration`
が指すのは `adapters` の API クライアントと Route Handler の HTTP 境界で、確かめるのは契約に対する
型と形です（[0090](../docs/adr/0090-testing-strategy.md)）。ここで確かめるのは、ハンドラが同じ要求へ
同じ応答を返すかという**組み立ての決定性**で、それを外から動かす手段が `setupServer` しかないだけ
です。hook を RTL 経由で確かめてもなお `unit` であるのと同じ理由になります。

## 構成

| パス | 中身 |
| --- | --- |
| `api/endpoints.msw.ts` | 本体 API の MSW ハンドラ。response は faker で組み立てられる |
| `api/endpoints.ts` | orval が生成する HTTP client。**使いません**(下記) |
| `handlers.ts` | 生成ハンドラの取りまとめ。手書きのハンドラは足しません |
| `stable-responses.ts` | 同じ要求へ同じ応答を返させる組み立てと、口をまたぐ参照を整合させる機構(下記) |
<!-- sample:begin -->
| `references.ts` | どの項目がどの口を指すかの表。契約ごとの知識なので機構とは別に置く |
<!-- sample:end -->
| `node.ts` | Node 側の interception。Server Components からの取得もここを通ります |
| `serve.ts` | 同じハンドラを HTTP の口として立てる。プロセスをまたいで届く必要があるとき（下記） |
| `contract-conformance.test.ts` | 全ハンドラの応答を、対応する zod で検証します |

`mocks/<契約名>/` だけが生成物です。直下のファイルは手書きであり、linter の対象に残しています。

## 起動

`APP_API_MODE=mock` のとき、`src/instrumentation.ts` が Config の確定後に Node 側の interception を
立てます。テストは `vitest.setup.msw.ts` が同じハンドラを使います。dev サーバーとテストで別のスタブを
持つと、契約が変わってもテストだけが古い形のまま通り続けるためです。

**build だけは HTTP の口が要ります。** interception は立てたプロセスの中でしか効かず、`next build` の
プリレンダーは別の worker プロセスで走ります（`src/instrumentation.ts` からも `next.config.ts` からも
届かないことを実測で確かめました）。`use cache` を持つ取得は組み立て時に評価されるので
（[0071](../docs/adr/0071-bff-api-integration.md)）、`pnpm build` は mock のとき
[`serve.ts`](serve.ts) を `APP_API_BASE_URL` の口へ立ててから `next build` を回します。

**応答は interception に作らせます。** `serve.ts` は届いた要求をそのまま `fetch` へ渡すだけで、MSW が
socket へ出る前に掴みます。ハンドラを二重に持たないので、HTTP から見た応答と in-process の応答が
食い違いません。

**テスト側で interception を立てるのは、読み込んだファイルだけです。**全ファイルへ掛けると 1 ファイル
あたり約 480ms 掛かり、Vitest の setup がテスト本体より長くなります。読み込む相手は HTTP 境界を持つ
ファイル —— `adapters` の API クライアントと Route Handler ——
に限られます([0090](../docs/adr/0090-testing-strategy.md))。

**mock app は別アプリではありません。**同じアプリを `APP_API_MODE=mock` で起動したものが mock app
であり、成果物は増えません。バックエンド無しで build が通り、起動して応答を返すことは
[`smoke.yaml`](../.github/workflows/smoke.yaml)（`APP_ENV=ci` = mock モード）が見ており、
画面を通した検証（[e2e](../e2e/README.md)）もこの形の上に乗ります。

**公開はしません。**公開しているのは Storybook と portal で、どちらもこのリポジトリの
ドキュメントです。mock app は検証のための土台であって、読み手に何かを説明するものではありません。
公開すればデモに見える一方、中身は契約から生成した値で、更新の責務も持たないものが常設されます。
公開へ倒すのは、**mock app 自身が読み手へ何かを示す立場になったとき**（たとえば画面の仕様を
見せる面として使うと決めたとき）です。

`src/` から `mocks/` への import は境界検査で禁止しています。許しているのは起動境界
(`src/instrumentation*`)だけで、mock の起動はそこの仕事だからです。

## 同じ要求には同じ応答を返します

生成物は応答を faker で組み立てます。seed を与えない faker は呼ぶたび別の値を返すので、素のままだと
**同じ URL を 2 回叩くと中身も件数も変わります**。backend の振る舞いとしては誤りで、実物は書き込みが
無ければ同じものを返します。

そこで、生成物が受け取る「応答の差し替え」に **seed を与えてから生成物の応答を返す関数**を渡して
います(`stable-responses.ts`)。応答の形は生成物のままで、手で組み立てたものは 1 つもありません。

seed は **method・URL・本文**から決まります。本文まで見るのは、作成と更新が URL は同じでも本文が
違えば別の資源だからです。本文を無視すると、違う中身で 2 回作成しても同じ ID が返ります。

seed を要求ごとに与える場所はここでなければなりません。ハンドラの手前(別のハンドラや
`request:start`)で与えると、生成物の resolver が非同期であるために要求を跨いで実行が混ざり、
A の seed で B の応答が組み立てられます。差し替えの中は resolver と同じ同期の区間です。同じ理由で、
本文の読み取り(非同期)は seed より前に済ませます。

**ハンドラの並び順は生成関数の名前順です。**契約に書かれた順ではありません。`import * as` が返す
module のキーは仕様上ソート順で列挙され、宣言順に見えるかどうかは素の ESM で読むか bundler の変換を
通すかで変わります。宣言順に依存すると「テストでは通るが実行時は違う並び」を作れてしまうため、
組み立て側で名前順へ固定しています。

再現しないモックの上には、退行を判定する仕組みが載りません。画面の基準画像は撮るたび別の絵になり
([e2e](../e2e/README.md))、E2E は表示された中身を名指しで確かめられなくなります。

## 口をまたいで指し合う項目は、整合させてから返します

生成物は**口ごとに独立して**応答を組み立てます。ある口が返す識別子が、それを一覧する口の応答に
存在しない、という組み合わせがそのままでは生まれます。画面は選択肢に無い値を「選べない値が入って
いる」として扱うので、その状態が既定の姿になってしまいます。

そこで、応答を組み立て**終えてから**、参照の項目だけを参照先の口の応答から採り直します。参照先の
応答も seed から決まる純粋な関数なので、その口へ届く要求と同じ seed を与えれば、画面が実際に受け取る
のと同じ一覧が得られます。再現性は保たれます。

**機構は表を持ちません。** どの項目がどの口を指すかは契約ごとの知識であり、`stableHandlers` の
呼び出し側が渡します（`handlers.ts`）。表が指す項目が契約から消えていれば落ちます —— 黙って整合が
外れると、選択肢に無い値が入った画面へ戻るためです。

## ハンドラの無い宛先は、テストでは落とします

`vitest.setup.msw.ts` は `onUnhandledRequest: "error"` で起動します。素通しにすると、宛先を打ち間違えた
取得が本物の網へ出ていき、手元では届いて CI では時間切れになるという形でしか現れません。

**これを読み込まないファイルでも、外へは出られません。**`vitest.setup.ts` が `fetch` に番人を据え、
宛先を名指しして落とします。応答は作らないので、HTTP を止めたいテストは interception のほうを
立ててください。

dev サーバー側(`src/instrumentation.ts`)は素通しのままです。**mock が差し替えるのは API だけ**で、
画像は配信元から実物を取得するためです(下記)。テストが立てた本物のサーバへ出す要求は、宛先を
名指しして開けます(`vitest.setup.msw.ts` の `passThroughOrigin`)。

## 画像は差し替えません

mock が差し替えるのは API だけです。画像は配信元(`MEDIA_ORIGIN`)から実物を取得します。**配信は
API とは別の口が担っており、API を落としても取得できる**ためで、差し替える理由がありません。
配信元を持たない環境では `MEDIA_ORIGIN` を差し替えるか、画像の無い応答で確かめます。

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

## 認証をここでモックしない理由

**認証はこの層を通りません。** IdP との往復は OIDC Discovery が実行時に示す口へ出るもので、
契約から生成した型も MSW ハンドラも間に挟まりません([0079](../docs/adr/0079-auth-frontend-seam.md))。

手元で認証済みの状態に到達する手段は 2 つあり、どちらもここではありません。開発用 IdP を立てて
通常のログインを通すか、`/dev/session` から session を直接発行するかです
([src/features/dev-session/](../src/features/dev-session/README.md))。
