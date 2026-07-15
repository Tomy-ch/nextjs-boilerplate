# エラーハンドリング

[0020](0020-adopted-architecture.md) / [0021](0021-frontend-responsibility.md) で枠を予約した **`errors` カーネル** の中身を確定する。**protocol-agnostic なエラー分類(sentinel)/ 境界での HTTP status 正規化 / App Router のエラー特殊ファイル階層 / `loading.tsx`・Suspense 境界([0040](0040-routing-rendering-strategy.md) A4 からの引き渡し)/ swallow 禁止・cause chain / ログ出力タイミング** を定める。go-boilerplate の `internal/apperror`(ADR 0038)を翻案する。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([決定 5](../plan/pre-implementation-decisions.md))。本 ADR の内容自体はユーザ決定済み(go 準拠の翻案。plan「決定不要」表 B6。`error.tsx` 配置は [0040](0040-routing-rendering-strategy.md)(A4)が B6 へ引き渡した項)。日付 2026-07-13。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

AGENTS.md の `[TODO] Error Handling`(BACKLOG B6)は、App Router の `error.tsx` / `not-found.tsx` / `global-error.tsx` の責務・Error Boundary 階層・バックエンドエラーの正規化・ログ出力タイミングを未決とし、暫定運用として「特殊ファイルを勝手に足さず App Router 既定に任せる / 独自 Error 型は `src/lib/` 配置前にユーザ確認」を敷いていた。本 ADR がこれを確定させる。

go-boilerplate は `internal/apperror`(**go 側**の ADR 0038「protocol-agnostic errors」。本リポの ADR 番号ではない)で **transport 非依存の sentinel 分類**を定義し、**プロトコルマッピングは edge(controller)でのみ**行い(`http_error.go` の対応表)、`docs/rules.md` で **swallow 禁止 / `Join` 優先 / redact** を規約化している。本 ADR はこれを表示層へ翻案する。

## 決定

### 1. `errors` カーネル: protocol-agnostic な sentinel 分類

- `errors` カーネルに **transport 非依存のエラー分類(sentinel)** を定義する(go apperror の翻案)。HTTP status やレスポンス形式はここに持たない
- 分類は全層から参照可([0021](0021-frontend-responsibility.md) errors。`model` が依存してよい唯一のカーネル)
- HTTP に関連する分類(表示層で扱うもの)。**安定エラーコード列は暫定**であり、実装時にバックエンドの実契約(`ErrorResponse.code` の enum。[0072](0072-api-type-generation.md) で生成される wire 契約)へ**整合させる**(下記「エラーコード語彙」参照)。sentinel の一次キーは **HTTP status**(曖昧さがない)とする:

| sentinel(分類) | 安定エラーコード(暫定) | HTTP status | 系統 |
| --- | --- | --- | --- |
| InvalidArgument | `BAD_REQUEST` | 400 | ユーザ起因 |
| Unauthenticated | `UNAUTHENTICATED` | 401 | ユーザ起因 |
| PermissionDenied | `FORBIDDEN` | 403 | ユーザ起因 |
| NotFound | `NOT_FOUND` | 404 | ユーザ起因 |
| Conflict | `RESOURCE_CONFLICT` | 409 | ユーザ起因 |
| Validation | `VALIDATION_FAILED` | 422 | ユーザ起因 |
| TooManyRequests | `TOO_MANY_REQUESTS` | 429 | ユーザ起因 |
| Unavailable | `SERVICE_UNAVAILABLE` | 503 | システム起因(リトライ含意) |
| Unimplemented | `NOT_IMPLEMENTED` | 501 | システム起因 |
| Internal | `INTERNAL` | 500 | システム起因 |

- go の worker 分類 sentinel(`ErrRetryable` / `ErrPermanent` / `ErrFatal`)はメッセージング worker 固有のため**採用しない**(表示層は HTTP taxonomy のみ翻案)
- **エラーコード語彙は wire 契約に整合させる(独自語彙を発明しない)**: 上表の安定エラーコード文字列は暫定ラベルであり、**バックエンドが実際に `ErrorResponse.code` で返すコード enum(契約 SSOT = バックエンドリポの `openapi.gen.yaml`。[0070](0070-backend-role-separation.md) A2 / [0072](0072-api-type-generation.md) B4)に実装時に整合させる**。エラーコードは「ソースファイル / 識別子の命名」ではなく **wire contract の値**であるため、[0028](0028-naming-convention.md) の「命名の権威を go に置かない」方針の対象外であり、契約忠実(= バックエンドの語彙に従う)を優先する。フロント内部で追加の分類ラベルが要る場合も、wire コードと別語彙を競合させない。※上表(gRPC canonical 寄りの暫定名)と go 実体(`UNAUTHORIZED` / `ACCESS_DENIED` / `INTERNAL_ERROR` 等)の差異は、実際の契約が判明した実装時に解消する
- go の HTTP taxonomy には 11 個目の分類 **`Canceled`(コード `CLIENT_CLOSED_REQUEST` / status 499・非標準)** が存在するが、本表には含めていない。fetch の中断([0071](0071-bff-api-integration.md) の dual timeout / `AbortSignal`)を独立分類として扱うかは実装 PR で判断し、採用時は本表へ追補する

### 2. 境界での HTTP status 正規化(1 回のみ)

- バックエンド応答の生 HTTP status → sentinel 分類 + 安定エラーコード + ユーザ向けメッセージ への変換は、**`adapters` 境界で 1 回だけ**行う([0071](0071-bff-api-integration.md) B3 の「生 status を errors へ正規化」の詳細=本 ADR。go `http_error.go` の対応表 + `lookupErrorMetaByAppError` の翻案)
- **生 HTTP status・生エラーを内層 / UI へ漏らさない**([0071](0071-bff-api-integration.md) と一致)。未知エラーは `Internal`(500)へ矯正する
- ユーザ向けメッセージは日本語(AGENTS.md Language Rules)。メッセージ本文は実装時に確定(本 ADR は分類とコードの対応表を定める)

### 3. App Router のエラー特殊ファイル階層

- `error.tsx`(セグメント境界の recovery UI)/ `global-error.tsx`(root layout のエラー)/ `not-found.tsx`(404)は、**正規化済みのエラーコード / メッセージを表示するだけ**の薄い境界とする。生エラー・スタックを画面へ漏らさない
- **production の redact 挙動に注意**(Next.js 公式 `error.js` file convention): production では **Server Component から throw されたエラーの `message` は redact され**、client の error boundary(`error.tsx`)には**汎用メッセージ + `error.digest`(サーバログ突合用の自動生成ハッシュ)のみ**が伝播する(Client Component 由来の throw は原文メッセージが渡る)。したがって「正規化済みメッセージの表示」を **throw 経路に頼らない**こと。ユーザ向けメッセージは次のいずれかで解決する:
  - (a) **期待エラー(主にユーザ起因 4xx 系)**: throw せず **Server Action の戻り値(ActionState / `useActionState`)として値で渡す**(公式ガイド「expected errors は return value でモデル化」。[0040](0040-routing-rendering-strategy.md) の Server Actions 採用と整合)
  - (b) **予期しないエラー(システム起因 5xx 系)**: `error.tsx` は汎用文言 + `digest` の表示にとどめ、`digest` と境界ログ(下記 5)の突合で原因を解決する

  いずれも本 ADR の分類(上記 1 の系統列)・境界正規化(上記 2)と両立する。具体的な配線(どの feature がどちらを使うか)は実装 PR で確定する
- 配置は **`src/app/` 配下の route セグメント単位**(App Router の規約上、特殊ファイルは `app/` 配下でのみ機能する — [0027](0027-directory-structure.md)。特殊ファイル命名は [0028](0028-naming-convention.md))。Error Boundary の粒度はセグメント階層に従う。エラー表示の中身のコンポーネントは feature 側に置き、特殊ファイルからは薄く委譲する([0040](0040-routing-rendering-strategy.md) driving adapter 原則)
- `error.tsx` 等に**業務ロジックを書かない**([0040](0040-routing-rendering-strategy.md) driving adapter)

### 4. `loading.tsx` / Suspense ストリーミング境界([0040](0040-routing-rendering-strategy.md) A4 からの引き渡し)

[0040](0040-routing-rendering-strategy.md)(A4)は「`loading.tsx` / `error.tsx` の配置・責務は B6 へ引き渡す」とした。その `error.tsx` 系は上記 3 で確定済み。**対になる正常系の待機表示 = `loading.tsx` / `<Suspense>` 境界**を本節で確定する(異常系=error.tsx と正常系=loading.tsx を同じ「薄い表示境界」の規律に載せる):

- `loading.tsx`(セグメントの pending UI)と `<Suspense fallback>` は、**待機表示を担う薄い表示境界**とする。`error.tsx` と対をなし、いずれも業務ロジックを持たない。中身のコンポーネントは feature 側に置き、特殊ファイルからは薄く委譲する(error.tsx と同じ / [0040](0040-routing-rendering-strategy.md) driving adapter 原則)
- **Suspense 境界の粒度**: streaming SSR で「先に出せるシェル」と「待つ部分」を分けるため、境界は **feature 内の、実際にデータ待ちする部分の近く**に置く(`"use client"` を葉へ押し下げる [0040](0040-routing-rendering-strategy.md) と同じ発想で、fallback 境界も過度に上位へ置かない)。`page.tsx` 全体を 1 つの `loading.tsx` で覆うだけにしない
- `loading.tsx` も `app/` 配下の App Router 特殊ファイル([0027](0027-directory-structure.md) / [0028](0028-naming-convention.md))である
- fallback の**見た目(スケルトン / スピナー)の UI 規約と、Suspense × PPR(`Cache Components`)の相互作用**は用途依存 / [0040](0040-routing-rendering-strategy.md) の保留に従う。本節は「境界の配置と薄さ」までを定め、UI 表現・PPR 前提設計は実装 PR で確定する

### 5. swallow 禁止・cause chain・redact(go `rules.md` 翻案)

- **エラーを握り潰さない(swallow 禁止)**。各エラーは handle / wrap して伝播するか、論理的到達不能なら明示的に throw する
- 原エラーの型・情報を鎖に残す。TypeScript の **`Error` の `cause`(`new Error(msg, { cause })`)で chain を保持**する(go の `Join` 優先の翻案)
- **秘匿情報を含むエラーは redact してから wrap** する(go の redact caveat)。ログ・レスポンスに PII / token / password を出さない

### 6. ログ出力タイミング(B7 と接続)

- エラーのログは **境界で 1 回**(`adapters` の正規化点 / route の error 境界)出力し、二重ログを抑止する(go errorhandler の翻案)
- **5xx(システム起因)= error レベル / 4xx(ユーザ起因)= warn レベル**(go の `errorLevelBoundHTTPStatus=500` の翻案)。ログの具体(スキーマ・出力先・trace 相関)は **B7([0081](0081-observability-logging.md))** が正

## 禁止事項

- ❌ `errors` カーネルに HTTP status / レスポンス形式を持たせること(分類は transport 非依存。変換は境界)
- ❌ 生 HTTP status・生エラー・スタックを内層 / UI へ漏らすこと(境界で正規化)
- ❌ エラーを握り潰すこと(swallow 禁止)/ 秘匿情報を redact せずログ・レスポンスに出すこと
- ❌ `error.tsx` / `global-error.tsx` / `not-found.tsx` / `loading.tsx` / Suspense fallback に業務ロジックを書くこと(薄い表示境界)
- ❌ `page.tsx` 全体を 1 つの `loading.tsx` で覆うだけにし、Suspense 境界を待つ部分の近くへ置かないこと(ストリーミングの利点を捨てる)
- ❌ 同一エラーを複数箇所で重複ログすること(境界で 1 回)

## 補足

- 本 ADR の Accepted に伴い、AGENTS.md の `[TODO] Error Handling` 節の削除・書き換えを実施する(未実施 — AGENTS.md は Protected Documentation のため、変更案の提示とユーザ承認を経て適用する)
- `errors` カーネルの物理ディレクトリ・README は本 ADR の実装時に作成する([0020](0020-adopted-architecture.md) / [0027](0027-directory-structure.md) の「対応決定が下りた時に作成」)

## 関連 ADR

- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — `errors` カーネル(全層参照可 / `model` が依存してよい唯一)
- [0071-bff-api-integration.md](0071-bff-api-integration.md)(B3)— 生 status を errors 分類へ正規化する境界(本 ADR が対応表の詳細を定める)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — `error.tsx` / `loading.tsx` 配置(本 ADR が責務を確定)/ driving adapter 原則
- [0028-naming-convention.md](0028-naming-convention.md) — App Router 特殊ファイルの命名
- [0081-observability-logging.md](0081-observability-logging.md)(B7)— エラーログのスキーマ・出力先・trace 相関
- [0070-backend-role-separation.md](0070-backend-role-separation.md) — バックエンドエラーの契約(境界での正規化の前提)
