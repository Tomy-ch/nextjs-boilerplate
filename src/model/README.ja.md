> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# model

表示用 Value Object、フォーマッタ、単位変換、表示バリデーション、表示結果型を置く純粋なカーネルです。

## 受け入れるもの

- 複数箇所から参照される表示上の値・変換・検証規則
- `ActionState<T>` などプレゼンテーションレイヤーの結果型
- **画面が送信の単位を決めるために作る値**。送信 1 回ぶんを指す冪等キーがこれで、値そのものは
  プロトコルの語彙だが、**いつ新しくするかを決めているのは画面**（開き直したら別の送信）である
  ため、`adapters` ではなくここが持つ

## 受け入れないもの

- バックエンドが所有する業務ルール、fetch、config、外部型の漏洩

## モジュール

| モジュール | 役割 |
| --- | --- |
| [`rich-text/`](rich-text/README.ja.md) | リッチテキストの sanitize port。HTML 文字列を表示してよい範囲のツリーへ変換する |
| `breakpoint.ts` | バンドに達していない幅の media query を組む。幅は design token が持つ |
| `datetime.ts` | 日時と月名の locale 対応フォーマッタ |
| `number.ts` | 数の locale 対応整形（桁区切り）。金額は `money.ts` が持つ |
| `locale.ts` | デフォルト locale とデフォルトタイムゾーン。フォーマッタが省略時に用いる単一の差し替え点 |
| `generated/breakpoint.ts` | バンドの名前と幅。`tokens/` から生成する（手編集禁止） |
| `generated/design-token.ts` | 意味トークンと生スケールの名前。`tokens/` から生成する（手編集禁止） |
| `media.ts` | 配信基盤のオブジェクトキーから表示 URL を組み立てる |
| `pagination.ts` | cursor 方式・offset 方式それぞれの 1 ページを表す型と、増分取得での継ぎ足し・ページ番号への換算 |
| `action-state.ts` | Server Action が画面へ返す結果のコンテナ。項目エラー・フォームエラー・成功値 |
| `search-params.ts` | URL の同じキーが何回現れたかを値の意味へ直す規則。zod スキーマと組み合わせて使う |
| `idempotency-key.ts` | 変更 1 回ぶんを指すキーと、それを載せるフォーム項目の名前 |
| `uuid.ts` | 画面が作る一意な値。secure context でない出所でも作れる、RFC 9562 のバージョン 7 |
| `consent.ts` | 任意の用途に cookie を使ってよいかという意思と、その区分ごとのゲート述語 |
| `money.ts` | 最小単位の整数で持つ金額を、locale に沿った通貨表記へ整える |
| `session.ts` | 認証済み利用者の身元と役割。cookie へ載せる payload はこの型に閉じ、Access Token も PII も持たない |
| `authz.ts` | 経路の接頭辞ごとに許す役割。認証だけを要求する経路は全役割を並べて表す |
| `return-url.ts` | 検証を通った復帰先。同一 origin の相対パスだけを通し、外れた値はデフォルトの行き先へ倒す |
| `cross-origin.ts` | リクエストの origin の判定と、CORS / preflight の応答ヘッダの組み立て |
| `time-window.ts` | 集計・絞り込みが対象にする期間。暦の区分を、基準のタイムゾーンで瞬時の半開区間へマッピングする |
| `cart/` | サンプル画面が扱うカートの表示用の型と、明細に立った事情の見せ方 <!-- sample:line --> |
| `dashboard/dashboard.ts` | サンプル画面が扱う管理側の横断集計の表示用の型 <!-- sample:line --> |
| `inquiry/` | サンプル画面が扱う問い合わせの表示用の型と、購読で届いた分の畳み込み <!-- sample:line --> |
| `product/product.ts` | サンプル画面が扱う商品の表示用の型 <!-- sample:line --> |
| `purchase/purchase.ts` | サンプル画面が扱う購入履歴の表示用の型 <!-- sample:line --> |
| `purchase/purchase-status.ts` | サンプル画面が扱う購入ステータスの業務キー。分岐はこの値で行う <!-- sample:line --> |
| `user/` | サンプル画面が扱う利用者の表示用の型と、プロフィール入力の表示検証 <!-- sample:line --> |

## 表示用の型の組み方

契約の wire 型をコピーせず、表示のための型を別に持つ理由は [0070](../../docs/adr/0070-backend-role-separation.ja.md) と
[0029](../../docs/adr/0029-type-design-discipline.ja.md) が持ちます。ここに置くのは、その型を**どう切るか**の規律です。

- **読む主体・取得エンドポイントごとに型を分けます。** 同じ題材でも、一覧の 1 行・詳細・集計結果の 1 件は
  取得エンドポイントが返す値が違い、1 つの型へ寄せると「この画面では常に欠けている項目」が残ります。受け取る
  側が毎回どれが入っているかを確かめる形にしないため、エンドポイントごとに型を切ります。
- **形が同じでも、変わる理由が違えば別の名前にします。** 分類のマスタと状態のマスタのように、契約の
  都合が揃っているだけの 2 つを 1 つの型にまとめると、片方の都合でもう片方の宣言が動きます。
- **JSON を跨ぐ型は素の値だけで組みます。** `useActionState` の境界を越える結果型、増分取得で
  client に積まれる一覧の 1 行がこれで、`Date` も `undefined` も `Error` も往復しません。日時は
  ISO 文字列のまま、無い値は `null` で持ちます。往復しても壊れないことを型で示すのが目的で、跨がない
  型（RSC の中だけで使う詳細）は `Date` で持ってかまいません。
- **導出できる値に 2 つ目の出所を作りません。** 次ページの有無は `nextCursor` が `null` かどうかで
  あり、真偽値を併せ持ちません。終了したかどうかは終了日時から、必須かどうかはスキーマへ空文字を通して、
  保護している経路の一覧は宣言から導きます。2 つ持つと、片方だけを見た実装と両方を見た実装が混在
  し、食い違ったときにどちらが正か決まりません。
- **状態を分けるのは、画面が言うことが変わるときだけです。** 「まだ読んでいない」と「読んだが選ば
  れていない」（尋ねてよいかが逆になる）、「該当なし」と「機構が動いていない」（直せば埋まるか
  が違う）は分けます。「対象を引けない」と「対象が画像を 1 枚も持たない」は、利用者から見ればどちらも
  「出す絵が無い」なので `null` 1 つに畳みます。分けた状態は判別可能 union で表します
  （[0029](../../docs/adr/0029-type-design-discipline.ja.md)）。
- **金額は契約が返す形のまま持ちます。** 十進の文字列で届く金額は文字列のまま
  （[`docs/rules.ja.md`](../../docs/rules.ja.md#formatting)）、最小単位の整数で届く合計は整数のままで、
  主単位へ戻すのは `formatMoney` を通す表示の直前だけです。別の通貨へ換算した値はレートと基準日を併せて持ちます
  —— いつの相場による目安かが判らなければ参考にならないためです。
- **区分の判定は業務キーで行い、名称では行いません。** 名称は表示のための文言で、backend 側の都合で
  書き換わります（[`docs/rules.ja.md`](../../docs/rules.ja.md#fetching)）。業務キーの数値は到達順序を
  意味しないので、大小比較で遷移の可否を判定しません。
- **バックエンドが済ませた判定の結果を受け取るだけで、ここで判定し直しません。** 対象が操作できるか、
  集計の合成、業務上のしきい値はいずれもバックエンドが決め、ここが持つのは結果を
  文言や表示の強さへマッピングする最小限の関数までです。

## 識別子

外部由来の識別子を branded type にする決定は [0029](../../docs/adr/0029-type-design-discipline.ja.md)
が持ちます。このレイヤーでの形は次のとおりです。

- `<subject>IdSchema = z.string().brand<"<subject>">()`、`type <Subject>Id = z.infer<typeof …>`、
  `to<Subject>Id(value: string): <Subject>Id` の 3 点で 1 組にします。
- **`to<Subject>Id` を呼んでよいのは境界だけです。** `adapters` の検証の出口・フォームの受け取り・
  route の動的セグメントで 1 度だけ通し、内側は確定した型を持ち回ります。実在するかは検査しません
  —— 識別子を知っているのはバックエンドで、存在しない値は取得が `not-found` として返します。
- **スキーマ自体を export するのは、生成スキーマの中で組み合わせる呼び出しがあるときだけです。**
  それが無い題材では変換関数だけを公開します。エントリポイントを 2 つ設けると、境界の外でも確定させられる
  ようになります。
- brand は型だけのマーカーで、JSON を跨いだ値は素の文字列のまま変わりません。テストはこれを 1 本で
  固定します。
- スキーマを `zod` と `zod/mini` のどちらで書くかは、ブラウザへ届くかで決めます
  （[0029](../../docs/adr/0029-type-design-discipline.ja.md)）。`model` は client 側のレイヤーからも
  引かれるので、値として引かれ得るスキーマは `zod/mini` で書きます。型だけを引く `import type` は
  bundle に載らず、載った場合は `scripts/client-schema-weight.gate.test.ts` が落とします。
  呼び出し側が `zod` の連鎖（`.catch()` / `.optional()`）で組み立てるコンポーネント（`search-params.ts`）は、
  読み手が server に閉じるので `zod` で書きます。client から引かれた時点で同じゲートが落とします。

## 表示検証スキーマ

手書きにする理由と二層分離は [0062](../../docs/adr/0062-form-input-validation.ja.md) が、文言の主語は
[`docs/rules.ja.md`](../../docs/rules.ja.md#forms) が持ちます。ここで書き足すのは 2 点です。

- **上限は契約の更新リクエスト側に合わせます。** 応答側はより緩い上限を宣言することがありますが、送って
  受け付けられない長さを入力させる理由がありません。
- **必須かどうかを列挙しません。** スキーマへ空文字を通して判定する関数を 1 つ置き、マーカーと検証の
  出所を 1 つにします。列挙すると、規則を緩めたのに画面が必須のままという状態を作れます。

## フォーマッタと時刻

`Intl` で表示し、デフォルト locale を単一の seam に置く決定は [0120](../../docs/adr/0120-locale-aware-formatting.ja.md)
が持ちます。フォーマッタを 1 本足すときの形は次のとおりです。

- **locale は末尾の引数で受け取り、省略時に `DEFAULT_LOCALE` を使います。** タイムゾーンは
  `DEFAULT_TIME_ZONE` に固定します —— ランタイムに任せると、サーバ（多くは UTC）でレンダリングした文字列と
  ブラウザ（閲覧者の現在地）でレンダリングした文字列が実行場所ぶんずれます。
- **`Intl.*` の生成は locale と粒度（または通貨）の組ごとに 1 度だけ行い、module 内の `Map` で
  使い回します。** 使い回す理由は [`docs/rules.ja.md`](../../docs/rules.ja.md#formatting) が持ちます。
- **通貨ごとの小数桁は `Intl` の `resolvedOptions()` から導きます。** 通貨と桁数の対応を手元の表に
  持つと、扱う通貨が増えるたびに 2 か所を揃えることになります。
- **参考であることは書式に混ぜません。** 「約」や注記を書式へ入れると、金額として読める形が 2 通り
  に割れます。置き方と添える文言で画面が示します。
- **同じ日かどうかの判定は、整形済みの日付文字列で行います。** 固定したタイムゾーンで丸めた値が
  それであり、時刻を落とした `Date` を作って比べると、丸める側と表示する側で別々にタイムゾーンを
  扱うことになります。
- **判定の基準になる時刻は引数で受け取ります。** 「今日」「失効しているか」を解く関数は `now` を
  取り、このレイヤーで時計を読みません。呼び出し側が `config/clock` から渡します。
- **暦の境界は `Intl`（`timeZone` 指定）で暦日へ解き、繰り上げは `Date.UTC` の上で行います。**
  オフセットはその日時点のものを `Intl` から引き、固定の文字列を書きません —— 夏時間を持つ地域へ
  `DEFAULT_TIME_ZONE` を変えたとき、オフセットだけが古いまま残らないためです。読めない暦の指定は
  デフォルトへ倒さず投げます —— URL を手で書き換えた利用者に対して、誰も意図していない区間が組み上がる
  ためです。

## URL と origin の判定

- **文字列の見た目ではなく、URL パーサに解かせた結果で判定します。** `/\t/evil.com` はタブが解析時
  に除去されて protocol-relative URL になり、先頭 2 文字を見る検査を素通りします。実際に使われる
  のは解決後の形なので、検査もその形に対して行います。配信元の下に収まるかも、配信元を URL として
  持ったうえで解決した `href` の前方一致で見ます —— 文字列のまま比べると host の大小やデフォルトポートの
  正規化が片側にだけ効きます。
- **解決先を確かめるだけの基準 origin には予約 TLD `.invalid`（RFC 6761）を使います。** 実在の
  名前を借りると、その名前が将来別の意味を持ったときに判定が変わります。
- **判定に落ちた値は安全側へ倒します。** 復帰先はデフォルトの行き先へ、配信 URL は `null` へ、知らない
  同意の綴りは「選ばれていない」へ、読めない `Origin` は untrusted へ。読めない値を意思や行き先と
  して扱わないことが、このレイヤーが負う安全側です。
- 同一 origin の判定は host だけで行い、scheme を比べません —— TLS を終端するリバースプロキシの
  後ろでは、自分が見るリクエストが http でも `Origin` は https で届くためです。

## 題材の module を足すとき

題材に固有の型は `model/<題材>/` の下にまとめ、横断の module と混ぜません。1 つの題材が持つ
ものは次の形に揃えます。

| ファイル | 中身 |
| --- | --- |
| `<題材>/<題材>.ts` | 識別子（上の「識別子」の 3 点）、読む主体ごとの表示用の型、`CursorPage<…>` / `OffsetPage<…>` のエイリアス |
| `<題材>/<入力>-schema.ts` | その題材の入力の表示検証（上の「表示検証スキーマ」） |
| `<題材>/<関心>.ts` | 判定結果を文言へマッピングする・購読で届いた分を canonical へ畳む、といった表示のための最小限の関数 |
| `<題材>/<状態>.ts` | 分岐に使う業務キーの語彙 |

題材をまたぐ参照は識別子の型だけにします（`import type`）。題材の module は 1 つの feature しか
使わないうちは feature の内側に置き、複数から参照される段になってここへ上げます
（[0021](../../docs/adr/0021-frontend-responsibility.ja.md) のカーネル受入基準）。

## boilerplate 導入時の変更点

**`authz.ts` の `ROUTE_POLICIES` は、保護する経路をどこに何と宣言するかを示すための置き場です。**
残っている宣言は、認証だけを求めるものと役割まで求めるものが 1 つずつで、**求める役割が違う 2 つを
残してあるのは機構が動くことを確かめるため**です（片方しか無いと、役割が足りない主体を弾く分岐へ
到達する入力を作れません）。自分が保護する経路へ書き換えます。

| 何を | デフォルト | 変更する箇所 |
| --- | --- | --- |
| 保護する経路と役割 | 認証だけを求める宣言と、役割まで求める宣言が 1 つずつ | `authz.ts` の `ROUTE_POLICIES` |
| 役割の語彙 | `session.ts` が持つ | 自分の IdP が渡す役割へ |
| デフォルト locale とタイムゾーン | `ja-JP` / `Asia/Tokyo` | `locale.ts` の `DEFAULT_LOCALE` / `DEFAULT_TIME_ZONE` |
| 保存と表示の基準にする通貨 | `USD` | `money.ts` の `BASE_CURRENCY` |

**列挙するのは保護する側で、公開側ではありません。** 接頭辞はネストできず、`/` も置けません
（すべてのパスに当たり、ログインの経路自身が保護対象になって遷移が循環します）。理由は
`ROUTE_POLICIES` の doc コメントが持ちます。

`generated/` の 2 本は `tokens/` からの生成物で、手では直しません（[`tokens/README.ja.md`](../../tokens/README.ja.md#boilerplate-導入時の変更点)）。

## 運用

- 依存先は `errors` のみ
- ファイル名は kebab-case、型名は PascalCase、関数名は camelCase とする
- 値集合は `as const` のオブジェクトと `(typeof X)[keyof typeof X]` の型で 1 組にし、知らない値の扱いは判定する側がそれぞれ決める
- タイムゾーンに関わるテストは、UTC と基準のタイムゾーンで暦日が変わる瞬時を固定値に取る。別のタイムゾーンでの振る舞いは `vi.doMock("./locale")` で `DEFAULT_TIME_ZONE` を差し替えて確かめる
- 出所を選ぶ処理（`crypto.randomUUID` を持たない文脈など）は `vi.stubGlobal` でその文脈を作って確かめる

## 監査の観点

| 観点 | 判定の形 | 根拠 |
| --- | --- | --- |
| `forbidden: fetch` — `fetch` などの外部 IO を持たない | violation。`adapters` の import と購読の組み立て（`EventSource` / `WebSocket`）は機械が落とすので、ここで見るのはグローバルの `fetch` の呼び出し | [0021](../../docs/adr/0021-frontend-responsibility.ja.md) が各カーネルに割り当てる責務。機械: ESLint boundaries と `no-restricted-syntax`（`eslint.config.ts`） |
| `forbidden: config` — `config` を import せず、`process.env` を読まない。設定値が要るなら引数で受け取る | violation | [0021](../../docs/adr/0021-frontend-responsibility.ja.md) の依存マトリクス。機械: ESLint boundaries と `architecture.ts` の `NODE_RUNTIME_ACCESS` |
| `forbidden: business-logic` — バックエンドが所有する業務ルールを持たない。置くのは型と、表示のための最小限の関数まで | 契約が返さない値を計算して出していれば violation。最小限の関数か判定ロジックかが読み分けられないときは suggestion | [0029](../../docs/adr/0029-type-design-discipline.ja.md) の禁止事項 / [0070](../../docs/adr/0070-backend-role-separation.ja.md) の禁止事項 / [0021](../../docs/adr/0021-frontend-responsibility.ja.md) のカーネル受入基準の 4 つ目 |
| バックエンドの契約を手書きの型でコピーしない。置くのは表示のための型で、契約の形との変換は `adapters` が持つ | suggestion（偶然同じ形の表示用の型と区別できない） | [0070](../../docs/adr/0070-backend-role-separation.ja.md) の禁止事項 / この README「受け入れないもの」 |
| 置いてあるものは複数箇所から参照される。1 つの feature しか使わないものは feature の内側に置く | 参照が 1 か所しか無ければ suggestion | [0021](../../docs/adr/0021-frontend-responsibility.ja.md) のカーネル受入基準の 1 つ目と 2 つ目 / この README「受け入れるもの」 |
| 型の形から読める型設計の規律 —— 同時に立ち得ない状態を真偽値の組で表さない、`unknown` を内層へ持ち回らず境界で 1 度確かめる（境界の関数が `unknown` を受けて確定させるのはその形そのもの）、外部由来の識別子を素の `string` のまま公開しない | suggestion | [0029](../../docs/adr/0029-type-design-discipline.ja.md) の型設計の決定と禁止事項 |

## 関連する ADR

- [0021](../../docs/adr/0021-frontend-responsibility.ja.md) — レイヤーの責務と import 境界。ここが `errors` だけを引く根拠
- [0029](../../docs/adr/0029-type-design-discipline.ja.md) — 判別可能 union・branded id・境界で 1 度だけ parse する型設計・zod の流儀の選び方
- [0031](../../docs/adr/0031-policy-state-supply.ja.md) — 同意などポリシー状態の供給の形
- [0045](../../docs/adr/0045-fonts-and-images.ja.md) — 画像の配信元と、組み立てた URL がそこから出ないこと
- [0061](../../docs/adr/0061-form-mutation-ux.ja.md) — Server Action が画面へ返す結果のコンテナ（`ActionState`）
- [0062](../../docs/adr/0062-form-input-validation.ja.md) — 表示のための入力検証と、生成スキーマを持ち込まない線
- [0063](../../docs/adr/0063-mutation-result-notification.ja.md) — 結果の通知手段（inline / toast / redirect）の選択
- [0070](../../docs/adr/0070-backend-role-separation.ja.md) — 業務ルールはバックエンドが持ち、ここは表示のための型だけを持つ分界
- [0073](../../docs/adr/0073-pagination-fetch-boundary.ja.md) — cursor 方式と offset 方式それぞれの取得境界
- [0079](../../docs/adr/0079-auth-frontend-seam.ja.md) — session の中身・復帰先・認可判定の front 側の持ち分
- [0120](../../docs/adr/0120-locale-aware-formatting.ja.md) — locale 依存の整形と、日付演算をタイムゾーンへ固定する扱い
- [0131](../../docs/adr/0131-cookie-consent.ja.md) — 同意管理を採らない決定と、それでも残す区分・期限
