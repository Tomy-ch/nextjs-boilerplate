# データ分類とキャッシュ境界(PII / user-scoped)

値を「**どの実行境界・どのキャッシュ範囲で使ってよいか**」で分類し、誤った置き場へ入れる書き方を**通常の実装経路から消す**。分類の持たせ方(値ではなく取得の口)、関所の置き場と各関所が見えるもの、および分類・PPR・taint・React Compiler の責務分界を定める。[0111](0111-csp-security-headers.md) が応答ヘッダの本体を持つのに対し、本 ADR は**値が通る道のりのどこで何を止めるか**を持つ。

## Status

Accepted

（採番はブロック帯([0140](0140-documentation-operations.md))に従い、セキュリティ帯 `011x` へ置く。pre-v1 の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

Cache Components(PPR)を有効化すると、**user-scoped な値が共有・静的な領域へ載る経路が新たに生まれる**。User A の個人データが共有キャッシュへ入り User B へ配られる事故は、表示層で起こしうる中で最も損害が大きい。

規約は既にある —— [`docs/rules.md`](../rules.md) #79b が「Data Cache へ入れてよいのは、主体を名乗らずに取れるものだけ」と定め、`adapters/server/api/products.ts` は同じ理由を自身のコメントにも書いている。**足りないのは強制**であり、`adapters/server/http` の `RequestSpec` は `cache` / `tags` を**どの client でも受け取れる**。資格情報を載せる口に `cache: "force-cache"` を渡す書き方が型検査を通る。

[0030](0030-environment-variable-management.md) §8 は Server → Client の誤送信に対する防御を持つが、**キャッシュ側の境界は誰も持っていない**。

## 決定

### 1. 分類は値ではなく「取得の口」に持たせる

値を包む方式(`PublicData<T>` / `UserScopedData<T>` のようなラッパ型)は**採らない**。

- **unwrap で分類が消える。** `wrapped.value.email` と書いた瞬間に `string` へ戻り、保証は最初の描画地点で切れる。そこは PII が正当に出ていく場所であり、**保証が要る場所には届かない**
- 代わりに全 feature が包み / 解きの記述を払う。**費用は全行に、効果は 2 箇所にしか出ない**

事故が起きる面は **キャッシュへ入れる瞬間**と **client へ渡す瞬間**に集中している。したがって分類は、値が生まれる場所 = **取得の口(`adapters/server/http` の client)**に宣言し、**その口が受け取れる引数を分類ごとに変える**。

```ts
createHttpClient({ scope: "public" })       // cache / tags を受け取る
createHttpClient({ scope: "user-scoped" })  // cache / tags を型として持たない
```

**「PII を共有キャッシュへ入れるな」を注意書きではなく、引数の不在にする。**

### 2. 分類と、許される置き場

| 分類 | 何か | 許される置き場 |
| --- | --- | --- |
| **public** | 主体を名乗らずに取れるもの(マスタ・公開カタログ) | 静的描画 / 共有キャッシュ / PPR の静的な殻 / client 送信 |
| **user-scoped** | 主体に紐づくもの(プロフィール・カート・購入・ダッシュボード) | request scope / 動的 RSC。**共有キャッシュと静的生成は不可**。client へは詰め替えた後のみ |
| **secret** | 署名鍵・トークン | server 内部のみ。キャッシュ・静的描画・client DTO・client 送信のいずれも不可 |

**`secret` はこの取得経路を通らない。** `config/*.server.ts` に閉じ、`import "server-only"` と [0030](0030-environment-variable-management.md) §8 の taint が持つ。**値の数が少なく描画へ出ないため、こちらは branded / opaque な値型が費用に見合う**(包むのは secret だけ)。

### 3. 資格情報を載せうる口は、載せなかった回も含めて user-scoped

匿名でも呼べる口(`allowAnonymous`)であっても、資格情報を載せうるなら分類は user-scoped である。**分類は口の性質であって要求ごとの結果ではない**ため、静的に決まり型で塞げる。

user-scoped な値をキャッシュしたい場合の唯一の手段は **`use cache: private`**(サーバへ保存されず、ブラウザのメモリにのみ載る)とする。

### 4. 関所は段として置く。一箇所で全部を守らない

値が通る道のりには、**その場所でしか見えないもの**がある。したがって守りは 1 か所に集約せず、段ごとに置く。

| 段 | 止めるもの | 手段 | 検出時点 |
| --- | --- | --- | --- |
| **取得の口** | user-scoped の取得に `cache` / `tags` を渡す | 型(引数の不在) | typecheck |
| **キャッシュ投入前** | `use cache` を持つモジュールから user-scoped adapter を import する | lint | `lint:ci` |
| **描画** | cached scope からの `cookies()` / `headers()` 読み出し。資格情報が cookie 由来であるため、user-scoped な取得を `use cache` の下へ置くと `next-request-in-use-cache` で落ちる | framework | build または実行時 |
| **client 送信前** | server object をそのまま client へ渡す | taint([0030](0030-environment-variable-management.md) §8) | 描画時 |
| **配信** | user-scoped な応答が共有キャッシュへ載る(CDN / プロキシ) | 応答ヘッダ([0111](0111-csp-security-headers.md)) | 応答時 |

**どの段も、他の段が見えないものを見ている。** 取得の口だけでは `use cache` を書かれた時点で外れ、taint だけでは派生値とコピーで抜け、ヘッダだけではアプリ内部の共有キャッシュに効かない。

### 5. 「資格情報は使用地点で cookie から解決する」を規約として機械検査する

段 3(framework)の防御は、**資格情報が使用地点で `cookies()` から解決されること**にぶら下がっている。トークンをモジュール変数へ置く、引数で持ち回る、境界をまたいでメモ化する —— いずれでも **この防御は何も言わずに外れる**。

したがってこの前提自体を規約とし、機械検査の対象とする。段を増やしても、増えた段が同じ前提に乗る限り薄くならない。**閉じ方は層の追加ではなく、前提を検査可能にすることである。**

### 6. 責務を混同しない

| 機構 | 担当 |
| --- | --- |
| 分類 + 取得の口 | **どこで使ってよいか**を型と引数で制約する |
| PPR / Cache Components([0041](0041-cache-components-decision.md)) | 共有・静的領域への誤投入を防ぐ(キャッシュ方針の側) |
| taint([0030](0030-environment-variable-management.md) §8) | Server → Client の誤送信を実行時に検知する |
| React Compiler([0042](0042-react19-rendering-api.md)) | **性能最適化のみ。** PII / キャッシュ / セキュリティ境界とは独立で、opt-in |

**React Compiler は PII 保護機構ではない。** 本 ADR の設計から切り離す。

### 7. 本 ADR が定める機構は基盤であり、サンプル破棄後も残る

分類・キャッシュ境界・taint adapter は、サンプル API 固有の仕組みではなく **Server / Client 境界とキャッシュ境界そのものを守る機能**である。破棄対象の宣言に含めない。

## 禁止事項

- ❌ user-scoped な取得に `cache` / `tags` を渡すこと(決定 1 / 3)
- ❌ user-scoped な値を、サーバ側に保存されるキャッシュ(Data Cache / `use cache` / `unstable_cache`)へ入れること。手段は `use cache: private` に限る(決定 3)
- ❌ 資格情報を `cookies()` 以外の経路(モジュール変数・引数での持ち回り・境界をまたぐメモ化)で解決すること(決定 5)
- ❌ 分類をラッパ型で表現し、feature 層に unwrap を配ること(決定 1)
- ❌ どれか 1 つの段で全部を守れると見なして他の段を省くこと(決定 4)
- ❌ React Compiler を PII / キャッシュ境界の防御として数えること(決定 6)

## 補足

- **[0020](0020-adopted-architecture.md) 設計原則 6 との関係**: 原則 6 は「他の層が握る問題を、こちらで予防的に手当てしない」と定める。本 ADR の段はこれに反しない —— **それぞれが自分の持ち場を守っている**のであって、他所の答えを二つ目に書いているのではない。ただし決定 5 の前提に段 3 と取得時の関門が二重に乗る点だけは重複であり、これは同原則の**セキュリティ例外**(責務分界は防御を薄くする理由にならない)を根拠とする。
- **実装時に実測する点**: `verifySession` は React `cache()` でメモ化されている。cached scope の外で解決済みの値が中で再利用されると、`cookies()` が再読されず段 3 が発火しない可能性がある。有効化時に実測して確かめる。
- **トレードオフ**: 通常実装の可読性はほぼ変わらない(feature 側の記述は増えず、変わるのは adapter を書くときに口を選ぶ 1 行)。代わりに、資格情報を載せうる口は共有キャッシュの選択肢を失う。「匿名でも取れるものを共有キャッシュへ」という最適化を採るなら、**口を分ける**ことが条件になる。

## 関連 ADR

- [0020-adopted-architecture.md](0020-adopted-architecture.md) — 設計原則 6(責務を超えた予防措置 / セキュリティ例外)
- [0030-environment-variable-management.md](0030-environment-variable-management.md) — §8 漏洩防御(`server-only` + taint)。本 ADR の段 4
- [0041-cache-components-decision.md](0041-cache-components-decision.md) — Cache Components(PPR)。本 ADR は有効化の前提
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — キャッシュ・再検証の所有層。`docs/rules.md` #79b の Rationale
- [0072-api-type-generation.md](0072-api-type-generation.md) — 型漏洩禁止(wire 型を内層へ出さない)
- [0029-type-design-discipline.md](0029-type-design-discipline.md) — branded / opaque(secret の値型)
- [0111-csp-security-headers.md](0111-csp-security-headers.md) — 応答ヘッダ。本 ADR の段 5
- [0110-security-operations.md](0110-security-operations.md) — セキュリティ運用の全体像
- [0042-react19-rendering-api.md](0042-react19-rendering-api.md) — React Compiler は性能最適化のみ(本 ADR の対象外)
