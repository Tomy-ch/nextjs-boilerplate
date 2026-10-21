> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# adapters

バックエンド API、BFF fetch、telemetry の送信など外部接続だけを置く境界アダプタです。実行文脈で
`server/` と `client/` に分けます —— **これは置き場の分けであって、境界検査の要素の分けではありません**
（要素の分かれ目は下記「このレイヤーの要素」）。

**このアプリが送信を組み立てないものは、ここを通りません。** 同梱のタグマネージャはコンテナを読み込むだけで、送信はコンテナの中身が行うため、`app` の client island が受け持ちます（[0082](../../docs/adr/0082-client-observability.ja.md)）。
実行文脈を持たない規則——どちらの面が送る要求にも等しく効くもの——は `http/` に置き、契約からの生成物は `gen/` に置きます。どちらも `adapters` の中からだけ import できます。

## 受け入れるもの

- 外部 API / SDK への接続、外部型から表示用型への変換
- `server/` の secret を使う接続、`client/` のブラウザ向け接続

## 受け入れないもの

- 業務ロジック、UI、local browser API

## このレイヤーの要素

境界検査が見る単位です。**`server/` と `client/` はここに出てきません** —— 実行文脈の分けであって、
import の許可はどちらも同じ `adapters` のものだからです。分かれているのは区画で、**区画はレイヤーの許可を
継ぎません** —— レイヤーの許可は要素の型に当たるため、切り出した時点で届かなくなります。だから区画は
自分の依存を自分で宣言します。

| 要素 | 位置 | 切り出す理由 |
| --- | --- | --- |
| `adapters-gen` | `gen/` | 契約から生成した wire 型。レイヤーのまま置くと、`adapters` を引ける `app` / `features` へ素通しで届く |
| `adapters-http` | `http/` | 両方の面が従う要求の形の規則。片方の面へ置くともう片方から届かず、規則が 2 つに割れる |
| `adapters-auth` | [`server/auth`](server/auth) | session の封緘と復元。エントリポイントの楽観判定がここだけを必要とするため、`proxy` へ `adapters` 全体を開けずに済ませる |

**依存の値はここにコピーしません。** 正は `architecture.ts` の `RESTRICTED_AREAS` で、各区画の README の
`imports-allowed` はそこから生成されます（`pnpm gen:architecture`）。区画でないディレクトリ
——`server/http/` や `client/telemetry/` のように、このレイヤーの中で置き場を分けているだけのもの——は
境界を宣言せず、この README の宣言を継ぎます。

## 取得エンドポイントの形

`server/api/<資源>.ts` が 1 つの資源のエンドポイントを持ちます。1 つのエンドポイントは 3 つのコンポーネントでできています。

| コンポーネント | 形 | 役目 |
| --- | --- | --- |
| wire 型 | `type Wire<資源> = z.infer<typeof <Operation>Response>` | 契約の形。**module の外へ出しません** |
| マッパー | `function to<資源>(wire: Wire<資源>): <資源>` | 契約の形から `model` の表示用の型へ。`Date` への変換、識別子の branded 型への変換、表示に使わない項目を落とすのはここ |
| エンドポイント | `export const get<資源> = cache(async (...) => to<資源>(await get<分類>Client().request({ ... })))` | 接続ポイントを引いてマッピングした値を返す。公開面はこれだけ |

- **読むエンドポイントは `react` の `cache()` で包み、書くエンドポイントは包みません**（[0071](../../docs/adr/0071-bff-api-integration.ja.md)、重複排除）。
  同じレンダリングの中で外枠と画面が同じ値を読むことは普通で、呼び出し側へ「1 回だけ呼ぶ」規律を要求すると、
  ツリーを組み替えるたびに取得の回数が変わります。
- **無いことの表し方は接頭辞で分けます。** 無いことが正常なエンドポイント（契約が空や `404` をそう定めている）は
  `find*` で `null` か空を返し、無いことが失敗のエンドポイントは `get*` で `not-found` を投げます。`find*` が畳むのは
  `not-found` だけです —— 通信の失敗まで「無い」へ倒すと、障害が未登録に見えます。
- **添え物の値は `read*` のエンドポイントが 1 度だけ畳みます。** 無くても画面が成り立つ値（本題に添える参考値など）は、投げるエンドポイントの
  上に「読めなければ記録して `null`」のエンドポイントを重ね、画面はそちらだけを引きます。落として良いかを画面ごとに
  決めさせると、同じ判断が画面の数だけ増え、片方だけ落ちる画面が生まれます。読めなかった事実は `logging` の
  `reportQuietly` で残します。
- **路の可変区間は `encodeURIComponent` で包みます。** 要求境界は `.` / `..` の区間を弾きますが、それ以外は
  包んだ側が持ちます。
- **契約上のヘッダは要求ごとに `headers` で渡します**（冪等キー、契約が独自に持つ識別子）。優先順位を契約が
  定めているものは、こちらで選ばず両方載せます —— 選ぶと同じ規則が 2 か所に生まれます。
- **並びは契約が決めます。** 契約が順序を宣言している一覧は写すときに並べ替えず、並び順のためだけの番号は
  落とします。
- **内側の識別子を公開面へ出しません。** 更新や削除が対象を指すのに使う値は、`export` しない memo 化したエンドポイント
  （同じレンダリングの中で読みと書きが共有する）で解決し、画面へ渡す型には含めません。
- **契約の語彙に無い条件は受け取りません。** 期間なら瞬時の半開区間（`model` の `TimeWindow`）だけを受け、
  「今日」「今月」を暦の上で解くのは画面の側です。

**契約が定めた上限・enum・書式は、数や綴りを書き写さず生成物から再輸出します**
（[0072](../../docs/adr/0072-api-type-generation.ja.md)、[docs/rules.ja.md](../../docs/rules.ja.md#url)）。
`export const <資源>_MAX: number = <生成された定数>` の形で、外へ渡すのはこのレイヤーです —— `gen/` を引けるのは
ここまでだからです。綴りの表（並び順の名前など）は
`as const satisfies Readonly<Record<string, Wire<資源>Query["sort"]>>` のように生成スキーマの型へ照らします。
契約から値が消えると宣言が型エラーになり、手でコピーした一覧が再生成のあとも黙って古いまま残ることがありません。

## 書き込みのエンドポイント

- **本文は生成型へ `satisfies` で照らします**（`body: { ... } satisfies <Operation>Request`）。マッパーと同じく、
  契約が動いたときに型で気づくためです。
- **自然キーを持たない作成は、冪等キーを必ず受け取ります。** 契約が任意としていても、付けない再送はそのまま
  2 件目になります。キーを作るのは呼び出し側（画面を開いた地点）です —— 送信のたびに作ると二重送信が 2 件に
  なり、キーは「1 つの試み」に結び付いていなければなりません。キーを渡したエンドポイントだけが `idempotent: true` を宣言
  します。宣言しない `POST` / `PATCH` は wrapper が再試行しません
  （[0071](../../docs/adr/0071-bff-api-integration.ja.md)）。キーの無い `idempotent: true` は型も検査も落としません。
- **再送できない操作は再送しません。** 自然キーの無い作成、加算（相対更新）、multipart の保存、状態遷移は
  いずれも 2 度届くと 2 度起きるか `conflict` になります。応答が返らなかったときに成立したかは、取り直して
  確かめる以外にありません。
- **状態遷移の応答は内層へ渡しません。** 遷移の応答が画面の形に足りないなら、エンドポイントが受け持つのは「契約どおりの
  応答が返ったか」の検証までで、変わった後の値は画面が取り直します。
- **バージョンを添える更新と相対更新を混ぜません。** 全項目の置換は `version` を添え、食い違いは wrapper が
  `conflict` へ正規化します。加算はバージョンを添えません —— 並行しても失われないため、競合を検出して拒む理由が
  ありません。
- **部分更新で「触らない」と「消す」を分けるなら、[`server/http/patch-payload.ts`](server/http/patch-payload.ts)
  の `PatchPayload<T>` を通します。** `JSON.stringify` は `undefined` のキーを落とすため、`{ name: undefined }`
  と `{}` は wire 上で同じです。触らないならキーを含めず、消すなら `null` を明示します。

## URL の条件を契約に照らす

倒すか落とすかの決め方は [docs/rules.ja.md](../../docs/rules.ja.md#url) が持ちます。ここが持つのは、
契約に照らして落とすエンドポイントの形です。

1. Route Handler が [`server/http/search-params.ts`](server/http/search-params.ts) の `toRawQuery()` で
   `URLSearchParams` を素の形（同じキーの繰り返しは並び）に写す。値の解釈はしない
2. エンドポイントの `parse<資源>Query(raw)` が、契約が数・真偽・並びで宣言しているキーだけを直す。URL の値は常に
   文字列なので、直さないと整数の宣言に当たって落ちる。**真偽は `"true"` / `"false"` だけを直し、読めない
   綴りは文字列のまま残す** —— 寄せると打ち間違いが黙って片方へ倒れる。並びは、1 つだけ選ばれた条件が
   単一の文字列で届くので並びへ揃え、重複は畳む
3. 生成スキーマ（`<Operation>QueryParams`）の `safeParse` へ通す。契約が非推奨の別名を残していて後継と
   同時に送ると落ちる関係なら、`.omit()` で窓口を 1 つにする
4. `{ ok: true, query } | { ok: false, invalidKeys }` を返す。外れたキーは検証ライブラリの型ではなく素の
   名前で返し、どう見せるかは画面が決める

**キーは利用者が決めます。** 空の object へ添字で書くと `__proto__` が代入の対象になるため、並びを組んで
から `Object.fromEntries` で畳みます。

**一致する対象を決める条件の一式は、一覧と件数で共有します。** 取り出す位置と並び順は件数に効かないので
含めません。片方だけに条件を足すと、出ている件数と一覧の中身が食い違います。

## 値の分類は取得エンドポイントが宣言する

**`createHttpClient` は分類を必ず受け取ります**（[0112](../../docs/adr/0112-data-classification-cache-boundary.ja.md)）。
client を組むのは分類ごとに 1 つの接続ポイント（[`server/http/`](server/http/README.ja.md) の `getPublicClient()` /
`getUserScopedClient()`）で、取得エンドポイントは分類に合う接続ポイントを引きます。

| 分類 | 何を運ぶか | 持てるもの |
| --- | --- | --- |
| `scope: "public"` | 主体を名乗らずに取れるもの | `cache` / `tags`。資格情報の口は**型として持ちません** |
| `scope: "user-scoped"` | 主体に紐づくもの | 資格情報。`cache` / `tags` は**型として持ちません** |

**資格情報を載せうるエンドポイントは、載せなかった回も含めて user-scoped です。** `allowAnonymous: true` を立てても
動きません。分類はエンドポイントの性質であって要求ごとの結果ではなく、だから静的に決まり、型で塞げます。

**主体を指す値は資格情報とは限りません。** 契約が独自に持つ識別子のヘッダも主体を指します。
そういう値を載せるエンドポイントも user-scoped です —— 判定は「認証されているか」ではなく「応答が主体で
変わるか」です。

分類が塞ぐのは「PII が共有キャッシュへ入る」経路です。入れ物は server 側で共有され、キーは URL・
method・ヘッダ・本文なので、主体ごとに割れた値がそこへ載ると、ある主体の応答が別の主体へ渡ります。
**注意書きではなく引数の不在**にしてあるのは、注意書きが守るのは読んだ人だけだからです。

user-scoped な値をキャッシュしたいときの手段は `use cache: private`（サーバへ保存されず、ブラウザの
メモリにのみ載る）に限ります。**これは明示的な例外能力であって一般許可ではありません。**

## リクエストをまたいで残すのは `use cache` の側

**寿命を持つのは取得エンドポイントです**（[0071](../../docs/adr/0071-bff-api-integration.ja.md)）。残すエンドポイントの中で
`use cache` を宣言し、寿命は `cacheLife`、捨てるマーカーは `cacheTag` が持ちます。呼ぶ側（feature / page）へ
置くと、同じ取得が呼び出しの数だけ別の寿命を持ち、マーカーの付け先が散ります。

**内側の `fetch` には寿命を持たせません。** `use cache` の内側の取得はまとめて外側の寿命に従うので、
二重に持つと内側が切れないぶん、外側が取り直しても同じ古い応答を掴みます。

**捨てるマーカーは、変わる契機ごとに分けます。** マーカーの綴りは [docs/rules.ja.md](../../docs/rules.ja.md#data-classification)
が持ちます。集計や順位は別の事象で変わるので、資源のマーカーへ相乗りさせると、資源を触らない限り古い
集計が残り続けます —— そういうエンドポイントはマーカーを持たず、キャッシュにも入れません。**落ちているときの形を含む応答も
残しません。** 外部の lookup が落ちたことを空の候補で表す契約では、残すと戻ったあとも空を配り続けます。
分類が同じ public でも、寿命の考え方はエンドポイントごとに違います。

**寿命は profile の名前で名乗り、秒数は `next.config.ts` の `cacheLife` が持ちます。** エンドポイントの側は「何の
寿命か」だけを言い、エンドポイントを触らずに値を動かせます。**シェルへ載る取得の profile に `expire` を置きません**
—— `expire` はその時間トラフィックが途絶えた直後の 1 要求へ同期の取り直しを課すので、そこで取得先へ届かないと
シェルを配れていたはずの route が丸ごと失敗へ倒れます。

**確実に残るのは、組み立て時にシェルへ焼かれた分だけです。** `use cache` のデフォルトの入れ物はプロセスのメモリなので、
serverless では要求ごとに別のインスタンスへ着地しえて再利用が起きない回があり、デプロイをまたぐとキーごと
捨てられます。`fetch` の `cache: "force-cache"` が持っていた「デプロイとインスタンスをまたいで残る」性質は
ここで失われるもので、**request 時の再利用を保証と読まないでください**。必要になったら
`cacheHandlers` か `use cache: remote` を選びます（デプロイ先に依存するので本体は選びません）。

**`use cache` を持つモジュールは `createHttpClient` を直に引けません。** 直に引けるモジュールは
user-scoped な client も組める状態にあり、`project-rules/no-user-scoped-in-cached-module` が止めます。
代わりに、**公開の分類だけを作る接続ポイント**（`getPublicClient()`）を引きます —— そのエンドポイントが作れるのは
公開の client だけなので、キャッシュの下で分類を取り違えようがありません。検査が読むのは直接の import と
その 1 段先までなので（[docs/rules.ja.md](../../docs/rules.ja.md#data-classification)）、user-scoped の接続ポイントを
引く module も `use cache` の下からは引けません。同じ資源を主体を名乗らずに読むエンドポイントが要るなら（一覧を末尾まで
辿るサイトマップなど）、公開の接続ポイントだけを引く別 module に置きます。

接続ポイントが分類ごとに 1 つである理由はもう 1 つあります。retry budget と circuit breaker は client の中に
状態として載るため、同じ downstream へ client を分けると、劣化したかどうかの判断が分けた数だけ割れます。
**user-scoped 側も同じ理由で `getUserScopedClient()` 1 つに寄せてあり、帰結として user-scoped のエンドポイントは
すべて遮断器を共有します** —— あるエンドポイントで失敗が続いて遮断されると、同じ module graph の中の他の
user-scoped のエンドポイントも接続せずに落ちます（[0071](../../docs/adr/0071-bff-api-integration.ja.md)、fetch wrapper の
resilience）。

**client を組めるのは接続ポイント（`architecture.ts` の `CONNECTION_PORTS`）だけです。** 外で組むと
`project-rules/no-client-outside-connection-port` が落とします。接続先を呼び出しごとに受け取る IdP への
要求のように寄せられない箇所は、`eslint-disable-next-line` に理由を書いて名乗ります。

## 資格情報を載せるかは接続ポイントが、送ってよいかは要求が決める

**資格情報の取得口（`getBearerToken`）を渡すのは user-scoped の接続ポイントだけです。** 取得エンドポイントごとに
渡させると、1 つ渡し忘れたエンドポイントの要求はすべて匿名で出ていき、型も検査も落ちません。

**資格情報が取れなかったときに送ってよいかは、要求が `allowAnonymous` で宣言します。** 契約は認証の
要否を operation ごとに宣言する（OpenAPI の `security`）ので、client の単位では粗すぎます。立てるのは、
契約がその operation の `security` に `{}` を含めているものだけです。`security: []` の operation は
公開の接続ポイントを引きます。立てても、取れた資格情報は載せます。立てていない要求は、資格情報が取れなければ
送らずに `unauthenticated` で落ちます。

**渡すのは import した口だけです。** `Authorization` を組む値をその場で掴むと、要求のたびに
`cookies()` を読む形が崩れ、cached scope の防御（`next-request-in-use-cache`）が何も言わずに外れます。
cookie がまだ無い session 確立の 1 往復だけは `bearerToken` という別の綴りで渡します。

`allowAnonymous` を付け間違えても型も検査も落ちません。認証が要る operation に立てると、資格情報が
取れなかった回も匿名で送られ、**気づけるのはバックエンドが 401 を返したときだけ**です。

**接続先とオリジンが違う宛先には載せません。** 絶対 URL を渡された要求は接続先を離れるため、載せると
資格情報がその宛先へ渡ります。宛先は Discovery のような外の応答から来ることがあり、相対パスしか渡さない
慣習では止まらないので、要求境界が origin を比べて判定します。

## バックエンドが発行した識別子を cookie に預かる

認証とは別に、バックエンドが発行した識別子（未認証でも持てるもの）をブラウザへ預けるエンドポイントを置くときの形です。

- **属性は [`server/auth/session-cookie.ts`](server/auth/session-cookie.ts) の `baseCookieOptions()` を
  借ります。** 用途を接頭辞に含める規則と属性のデフォルトは [docs/rules.ja.md](../../docs/rules.ja.md#data-classification)
が持ち、エンドポイントごとに書くのは固有の判断だけです。認証の cookie と別に置くのは、寿命も主体も session と
  一致しないためです。
- **寿命は発行元の期限に合わせます。** 期限が判らなければブラウザを閉じるまでとし、こちらで年数を決めません。
  先に消えた対象を指す cookie は、何も指さない値になります。
- **空の値は持っていないものとして扱います。** cookie は残っているが中身が空という状態は起こりえて、そのまま
  送るとバックエンドが形の違反として拒みます。
- **発行された値を受け取れるのは、それを作る操作の応答だけです。** 載っていない応答で手元の cookie を消さない
  のは、既に持っている識別子が生きているためです。
- **ログアウトの teardown で破棄します。** 次に画面を開いた利用者へ、前の利用者のものが見えないようにします。
- **ブラウザから読める形には置きません。** その値だけが到達手段である以上、露出はそのまま他人のものへの
  到達経路になります。

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
なります。実務上のしきい値（8 KB 前後）に対して、契約を守る限りは超えられない——逆に言えば、上限を
広げた時点でこの計算は崩れます。
<!-- sample:end -->

**しきい値は経路が最初に弾く長さで、実務上は 8 KB 前後です。** 値は `NEXT_PUBLIC_HTTP_MAX_URL_BYTES` が
持ちます（[env/README](../../env/README.ja.md)）。直値で持たないのは、経路のどこが最初に弾くかが配信構成で
決まるためです。自分の経路の最小値へ書き換えてください。`NEXT_PUBLIC_` は
ビルド時にリテラルへ置換されるため、変更には再ビルドが要ります。

判定は `http/url-budget.ts` の 1 つで、呼ぶのは 2 つの要求境界——`server/http/request.ts` と
`client/http/request.ts`——だけです。**画面ごとの事前チェックは置きません。** しきい値は画面からは
原理的に分からず、置けば画面の数だけ当て推量の定数が増えます。超過は `uri-too-long` として落ち、
画面には `errors` の分類 1 つとして現れます（[0080](../../docs/adr/0080-error-handling.ja.md)）。

## ブラウザ発の取得エンドポイント

`client/api/<資源>.ts` が持つのは、同一オリジンの BFF（`app/api/**`）を
[`client/http/request.ts`](client/http/request.ts) の `request()` で叩くエンドポイントと、購読が運ぶ本文の形だけです
（[0073](../../docs/adr/0073-pagination-fetch-boundary.ja.md)）。

- **検証スキーマは手で書きます。** この経路が受け取るのはバックエンドの応答ではなく BFF が組んだ表示用の
  形なので、契約の生成物は形が違って通りません。それでも検証するのは、応答を検証せずに UI へ流さない原則が
  client 側にも等しく効くためです。
- **増分取得が受け取る形は、JSON で運べる形に server 側のエンドポイントが落としておきます。** 初回ページ（RSC 経由）と
  続き（JSON）で `Date` や省略可能な値の有無が違うと、積み上げた一覧の途中から表示が壊れます。JSON を経由して
  文字列へ落ちた日時は `z.coerce.date()` でこちらが戻します。
- **`client/` は `zod/mini` を使います。** `request()` が受けるのは `zod/v4/core` の `$ZodType` なので、
  流儀は問いません —— 共有レイヤーが片方の流儀を要求すると、呼び出し側の移行がその 1 箇所のために止まります。
- **本文を載せるエンドポイントを持ちません。** ブラウザから状態を作る操作は Server Action が持ちます。ここを通るのは
  取得と、発券のように引数を持たない `POST` だけです。
- **timeout・再試行・遮断を持ちません。** それは `adapters/server` が BFF の向こうで持っており、ここにも
  持つと同じ要求に 2 つの再試行が別々の勘定で走ります。
- **`401` / `403` / `404` を内部の失敗へ畳みません**（[0080](../../docs/adr/0080-error-handling.ja.md)）。
  読み進めている最中に session が切れた画面は入り直しを促す必要があり、張り直しを繰り返す購読は直らない
  相手を見分けられないと止まりません。
- **失敗を握り潰すエンドポイントは、投げるエンドポイントとは別名で置きます。** 引けなくても「何もしない」が正しい補完のようなエンドポイントだけで、
  その場合も投げられた失敗を「機構が壊れている」のような別の意味へ読み替えません —— 判らないものは
  判らないままにします。
- **client が読むだけの定数は、検証スキーマを持つ module と分けて置きます**
  （[docs/rules.ja.md](../../docs/rules.ja.md#url)）。`const` を 1 つ読む import が、zod のスキーマ一式を
  ブラウザのバンドルへ載せます。

## ブラウザ発のテレメトリの中継

**ブラウザから collector を直接叩かせません**（[0081](../../docs/adr/0081-observability-logging.ja.md)）。
endpoint も資格情報もブラウザへ出さず、同一オリジンの BFF が受けて OTLP へ載せます。この経路は
3 つに分かれ、境界ごとに持ち物が違います。

| 置き場 | 持つもの |
| --- | --- |
| `http/telemetry-report.ts` | 送る側と受ける側が共有する報告の形。型と、送る前に切り詰める長さだけ |
| `client/telemetry/report-telemetry.ts` | 測定と例外を報告へ組み、`sendBeacon` で送る |
| `client/telemetry/browser-tracer.ts` | ブラウザ側の計装。動的な import でだけ読まれる |
| `server/telemetry/browser-telemetry.ts` | 報告を検証し、signal へ載せる |
| `server/telemetry/browser-traces.ts` | ブラウザが作った span を collector へ渡す |

**検証は受け側にしかありません。** 送る側にも同じ長さの宣言がありますが、それは通信量を抑える
ためのもので、送信者は差し替えられます。認証を要求しないエンドポイントなので、受け側が自分で確かめます
（[0077](../../docs/adr/0077-bff-abuse-protection-boundary.ja.md)）。

**`observability` を import できるのは受け側だけです。** Web Vitals は指標ごとのヒストグラムとして
出すため OTel の Metrics API へ、例外は返ってきた `traceparent` の文脈で記録するため trace 相関の口へ
触ります（[0082](../../docs/adr/0082-client-observability.ja.md)）。
**この許可は `client/` にも機械的に及びます。** 境界検査は `server/` と `client/` を区別しません ——
要素を分けているのは実行文脈ではなく区画で、`server/` も `client/` も同じ `adapters` の要素に居ます
（下記「このレイヤーの要素」）。効いているのは **`observability` の側が module ごとに `server-only` を
名乗っていること**で、client から引いた時点でビルドが落ちます。**名乗っていないのは
`render-span.ts` の 1 本だけ**で、それは feature が import する面なので意図的にブラウザのバンドルへ入ります
（[observability/README.md](../observability/README.ja.md)）—— **そこはレイヤー検査も `server-only` も止めません。**
同じ形は `config` にもあります —— ADR 0021 は server config を `adapters/server` だけに許しますが、
機械強制はレイヤーの粒度で当たります。

**ブラウザ側の計装は動的な import でだけ読みます。** 要求境界（`client/http/request.ts`）は画面を
開いた時点で読まれるので、そこから OTel へ辺を張ると計装の重さが初期の読み込みに乗ります。要求を
span にするのは `fetch` を包む計装のほうで、要求境界のコードは計装を知りません。

**包むのは自分が呼んでいる要求だけではありません。** router が画面遷移と先読みで出す RSC の要求も
対象です。自分で呼んでいる場所だけを包むと、client 遷移が trace から抜けて別の trace の根になります。
そのぶん 1 つの trace に載る span は増えます —— 先読みは見えている画面ぶんだけ出るためです。

## 購読は開いて読む側だけを持つ

長寿命接続を**保持する側**はバックエンドで、このレイヤーは**開いて読む側**です
（[0074](../../docs/adr/0074-runtime-communication-seam.ja.md)）。持つのは下の置き場だけで、接続の保持も
event の採番も、誰に何を配るかも持ちません。

| 置き場 | 持つもの |
| --- | --- |
| `client/stream/subscription.ts` | 購読 1 本の状態機械。発券・接続・張り直し・打ち切りの分岐 |
| `client/stream/ordering.ts` | 到達順の乱れを直すウィンドウと、流した位置の記憶 |
| `client/stream/backoff.ts` | 張り直しまでの待ち時間 |
| `client/stream/envelope.ts` | エンベロープと制御指示の読み取り。**本文の形は持たない** |
| `client/stream/cursor.ts` | 位置の表し方と比較 |
| `client/stream/use-stream.ts` | 購読を component の寿命へ束ねる |

**本文の形は資源ごとの module が宣言します**（`client/api/<資源>.ts`）。エンベロープは feature に依らず
同じで、中身は event の種別ごとに違うためです。契約に無い種別はその検証で落ち、上へ流れません。

**ブラウザは backend の stream へ直接繋ぎます。** `EventSource` は任意のヘッダを載せられないため、
資格情報は同一オリジンの中継（`app/api/**/stream-ticket`）が発券した短命の ticket を query に載せた
**繋ぎ先の URL** として届きます。ticket を値として渡さないのは、ブラウザ側で組み立てと取り回しが
増えるほど、文言やログへコピーする経路が増えるためです。

**契約駆動モックが表せない往復は、発券のエンドポイントで断ります**（[mocks/README.md](../../mocks/README.ja.md#購読sseは差し替えません)
「購読（SSE）は差し替えません」）。発券だけが成功すると、ブラウザは実在しない接続先へ張り直しを繰り返し
ます。`getApiConfig().mode === "mock"` のとき発券のエンドポイントが `not-found` を投げ、購読する対象が無いのと同じ姿で
画面を止めます。

**`integration` の宣言は掛かりません。** 購読が持つ外部との往復は、時計・乱数・待機・接続として
引数で受け取る形にしてあり、確かめるのは状態機械の分岐です。HTTP 境界を模す相手がいないので、
`unit` の形——入力（逆順・重複・ウィンドウを越えた遅延・制御指示）を与えて遷移を直接照合する——で検証します。

## client へ渡してはいけないものを登録する

`server/taint/taint.ts` が [0030](../../docs/adr/0030-environment-variable-management.ja.md) の口です。
汚した object や値を Client Component へ渡すと、**レンダリングが実行時に落ちます**。

| 汚すもの | 例 | 登録する場所 | 寿命 |
| --- | --- | --- | --- |
| 資格情報を含む server の object | session の記録（Access Token / ID Token を持つ） | その object が生まれる場所 | object 自身 |
| PII を含む取得結果 | 連絡先・住所・生年月日を持つ主体の詳細 | 取得エンドポイント（契約の形から表示の型へマッピングした直後） | object 自身 |
| 文字列の秘密 | 署名鍵・外部サービスのキー | その値を**読む側**（`config` は react を持ち込めない） | 値を持つ singleton |

**何が PII かはここが決めません。** 分類とその置き場は
[0112](../../docs/adr/0112-data-classification-cache-boundary.ja.md) が持ち、ここはその分類を実行時の
関所へ写すだけです。

### 参照実装

取得エンドポイントで、マッピングし終えた値を汚します。**呼び出し側では汚しません** —— エンドポイントが増えるたびに同じ 1 行が
要り、書き忘れた経路がそのまま穴になります。

```ts
export const getAccount = cache(async (): Promise<Account> => {
  const account = toAccount(
    await getUserScopedClient().request({ path: "/v1/accounts/me", schema: GetAccountResponse }),
  );

  taintObjectReference(
    "主体の詳細には連絡先が含まれます。Client Component へ渡すのは画面が使う項目だけにしてください",
    account,
  );

  return account;
});
```

文字列の秘密は、値そのものを登録します。参照で追えないためで、登録の寿命はその値を持つ singleton
に握らせます。

```ts
taintUniqueValue("署名鍵は server 専用です", config, config.sessionSecret);
```

**メッセージは落ちた人が読む唯一の手掛かりです。** 「渡すな」だけでなく、代わりに何を渡すのかまで
書きます。落ちる場所は渡した側で、そこに居る人は何を選べばよいかを知りません。

**主機構ではありません。** 参照でしか追えないので、コピー（`{ ...record }`）にも派生値
（`` `Bearer ${token}` ``）にも及びません。主防御は取得範囲と Client DTO の最小化で、これはそこを
抜けた誤送信を実行時に捕まえる補助です（[0112](../../docs/adr/0112-data-classification-cache-boundary.ja.md)）。

**`react` を直接呼ばず、この口を通します。** テストはこのモジュール境界を差し替え、本物が効くことは
`taint/taint.test.ts` が RSC の直列化器で確かめます。防御の中に「口があれば呼ぶ」分岐を置かないため
です —— 置くと、口が消えた日に検査ごと黙って外れます。

## 運用

- **`integration` の宣言が掛かるのは、外部との往復を持つモジュールです**。`fetch`（または注入された
  `fetchImpl`）を直接持つものが対象で、そこでは HTTP 境界だけを対象に、内側を mock して型と形を
  確かめます（[0090](../../docs/adr/0090-testing-strategy.ja.md)）。**外部 IO を持たない純粋な変換**
  （`http/url-budget.ts` / `server/http/search-params.ts` / `server/http/retry-policy.ts` /
  `server/http/error-status.ts` / `server/http/error-response.ts` / `server/http/json-request.ts` /
  `client/telemetry/route-pattern.ts` / `server/telemetry/browser-telemetry.ts` など、境界の前後で
  値を写すだけのもの）は、その変換自体を `unit` の
  形——HTTP を模さず値を直接照合する——で検証します。境界を持たないものへ境界のテストを課しても、
  確かめる相手が無いためです。**`http/` はこの形しか置きません**——実行文脈を持たない規則の置き場
  なので、外部との往復を持つものは `server/` か `client/` に属します
- **`use cache` を持つエンドポイントでは、寿命 profile の名前と `cacheTag` の引数も観測の対象に含めます**。HTTP
  境界の外側にある宣言ですが、綴りを取り違えても型検査も lint も落ちず、実行時に「無効化したのに古いまま」
  という形でしか現れません。`next/cache` をモジュール境界で差し替え、エンドポイントが何を名乗ったかを確かめます。
  **確かめられるのはそこまでです** —— 名乗った profile 名が `next.config.ts` に実在するか、実際に
  キャッシュが効くかは、このレイヤーでは分かりません（前者は build、後者はシェルの実測が持ちます）
- **HTTP 境界を模すのは MSW です**（`vitest.setup.msw` を import したファイルだけ。
  [docs/testing-conventions.md](../../docs/testing-conventions.ja.md)）。`serveJson` / `serveStatus` /
  `serveWrite` が応答を割り当て、`watchFetch` が wrapper へ渡った `fetch` の引数を見ます。資格情報は
  `../auth/session` を、設定は `@/config/environment` を `PARSED_ENVIRONMENT` で、モジュール境界で
  差し替えます。client 側のエンドポイントは `vi.stubGlobal("fetch", ...)` で済みます
- **`<口>.contract.test.ts` は応答を割り当てず、契約から生成したハンドラそのものを相手にします**
  （[`scripts/lib/untested-modules.ts`](../../scripts/lib/untested-modules.ts)）。マッパーが公開する項目は
  `Object.keys(...).sort()` を並びごと照合します —— 生成ハンドラは契約の全項目を返すため、数項目だけを見ると
  マッピング漏れも wire の項目の漏れ出しも通ります。マッパーの分岐そのものを見るケースだけ応答を割り当てます。
  抽選結果に頼ると、モックの値域を変えるたびに seed の消費列がずれて落ちます

- `server/` は server config を利用でき、`client/` は secret を利用しない
- 外部型・生成型はここで変換し、内側へ漏らさない

## 監査の観点

| 観点 | 判定の形 | 根拠 |
| --- | --- | --- |
| `forbidden: components` — UI コンポーネントを import しない | violation | [0021](../../docs/adr/0021-frontend-responsibility.ja.md) 依存マトリクス。機械: ESLint boundaries |
| `forbidden: capabilities` — `capabilities` を import しない。storage / clipboard / cookie の読みといった local ブラウザ API もここに置かない | import は violation（機械が落とす）。`localStorage` / `sessionStorage` / `navigator.clipboard` / `document.cookie` の参照も violation | [0024](../../docs/adr/0024-adapters-server-client-split.ja.md) 禁止事項。機械: ESLint boundaries（import のみ） |
| `forbidden: stores` — `stores` を import しない | violation | [0021](../../docs/adr/0021-frontend-responsibility.ja.md) 依存マトリクス。機械: ESLint boundaries |
| `forbidden: business-logic` — 持つのは接続と、外部の形から表示の型への変換だけ。契約が返さない値を計算しない | violation。変換か業務の判定かが読み分けられないときは suggestion | [0070](../../docs/adr/0070-backend-role-separation.ja.md) 禁止事項 / [0021](../../docs/adr/0021-frontend-responsibility.ja.md) の、各カーネルへ割り当てる責務 |
| `client/` は server config（`*.server.ts`）を import せず、secret を持たない。`NEXT_PUBLIC_` の公開定数は読んでよい | violation | [0024](../../docs/adr/0024-adapters-server-client-split.ja.md) 禁止事項 / この README「ブラウザ発のテレメトリの中継」。機械はレイヤーの粒度でしか見ず、`server/` と `client/` を区別しない |
| `server/` に client hook や `"use client"` を置かない。逆に `client/` に `server-only` の module を置かない | violation | [0024](../../docs/adr/0024-adapters-server-client-split.ja.md) 禁止事項 |
| 公開面が返す型は表示の型で、`gen/` の生成型を素通しにしない | 公開面の宣言が生成型を名指していれば violation。推論を経て生成型が出ていくなら suggestion | [0070](../../docs/adr/0070-backend-role-separation.ja.md) 禁止事項 / この README「運用」。機械は `gen/` の直接の import までを落とす |
| `observability` を import するのは中継の受け側（`server/telemetry/`）だけ | violation | この README「ブラウザ発のテレメトリの中継」。機械はレイヤーの粒度でしか見ない |
| client へ渡してはいけない値は取得エンドポイントで汚し、呼び出し側では汚さない。`react` の taint API は `server/taint/taint.ts` を通して呼ぶ | `taint.ts` の外で `react` の taint API を直に呼んでいれば violation。PII を含む取得エンドポイントが汚していなければ suggestion（何が PII かは 0112 が持つ） | この README「client へ渡してはいけないものを登録する」/ [0112](../../docs/adr/0112-data-classification-cache-boundary.ja.md) |
| 契約由来の上限・enum・書式は `gen/` から再輸出し、数や綴りを書き写さない | 生成物に同じ宣言がある数リテラルや文字列の表を別に宣言していれば violation。`satisfies` で生成型へ照らした表は通す | [0072](../../docs/adr/0072-api-type-generation.ja.md) / [docs/rules.ja.md](../../docs/rules.ja.md#url) / この README「取得エンドポイントの形」 |
| 自然キーを持たない作成のエンドポイントは冪等キーを受け取り、`idempotent: true` はキーと同時にだけ立てる | `idempotent: true` の要求に `Idempotency-Key` ヘッダが無ければ violation。キーを受け取らない作成のエンドポイントは suggestion（自然キーの有無は契約が持つ） | [0071](../../docs/adr/0071-bff-api-integration.ja.md) 禁止事項 / この README「書き込みのエンドポイント」 |

## 関連する ADR

このレイヤーのコードが依存する決定です。**コメントからは ADR を直接指さず、このセクションを辿ります** ——
ADR は番号もセクションも動くので、動いたことに気づける場所を 1 つに寄せています（[docs/rules.ja.md](../../docs/rules.ja.md#comments)
「コメントと文書」）。子ディレクトリの README を持つ区画（[`server/auth`](server/auth) /
[`server/http`](server/http) / [`server/telemetry`](server/telemetry) /
<!-- sample:replace-begin -->
[`client/stream`](client/stream) / [`client/telemetry`](client/telemetry) / [`gen`](gen)）は、そちらのセクションが持ちます。
<!-- sample:replace-with -->
<!-- = [`client/stream`](client/stream) / [`client/telemetry`](client/telemetry)）は、そちらのセクションが持ちます。 -->
<!-- sample:replace-end -->

- [0024](../../docs/adr/0024-adapters-server-client-split.ja.md) — `server/` と `client/` の分割と、client 側の外部接続境界
- [0021](../../docs/adr/0021-frontend-responsibility.ja.md) — レイヤーの責務と import 境界（server config を引けるのは `server/` だけ）
- [0020](../../docs/adr/0020-adopted-architecture.ja.md) — 内向きの依存と、外部型を内層へ漏らさないこと
- [0070](../../docs/adr/0070-backend-role-separation.ja.md) — バックエンドとの責務の線。業務ロジックを持たないこと
- [0071](../../docs/adr/0071-bff-api-integration.ja.md) — 外部 API クライアントと fetch wrapper、取得エンドポイントが寿命を持つこと
- [0072](../../docs/adr/0072-api-type-generation.ja.md) — 契約からの生成物と、上限・書式の定数を `gen/` から引くこと
- [0073](../../docs/adr/0073-pagination-fetch-boundary.ja.md) — ページングと増分取得の取得境界
- [0075](../../docs/adr/0075-file-upload-seam.ja.md) — ファイルアップロードの seam（署名付き直接 PUT と多重部の例外）
- [0079](../../docs/adr/0079-auth-frontend-seam.ja.md) — 資格情報を組む境界と、主体を名乗る要求の扱い
- [0080](../../docs/adr/0080-error-handling.ja.md) — バックエンド由来の失敗を分類へ正規化すること
- [0081](../../docs/adr/0081-observability-logging.ja.md) — ブラウザから collector を直接叩かせず、BFF が中継すること
- [0082](../../docs/adr/0082-client-observability.ja.md) — Web Vitals と client 例外の収集、送信面の置き場
- [0112](../../docs/adr/0112-data-classification-cache-boundary.ja.md) — 取得エンドポイントが分類を宣言し、キャッシュと資格情報の口を型で塞ぐこと
- [0030](../../docs/adr/0030-environment-variable-management.ja.md) — secret の扱いと、client へ渡せないものを登録する口
- [0040](../../docs/adr/0040-routing-rendering-strategy.ja.md) — 再検証の契機（取り直しが起きるまで古い値が残ること）
- [0090](../../docs/adr/0090-testing-strategy.ja.md) — レイヤー別の検証責務（`integration` が掛かる範囲）
