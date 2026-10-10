---
imports-allowed: [] # 生成物。`pnpm gen:architecture` で直す
forbidden: [http-vocabulary, external-dependencies]
test-requirement: unit
---

# errors

全層から参照できる、protocol-agnostic なアプリケーション共通エラーのカーネルです。分類・原因・表示メタ情報を分けて持ちます —— 分類は内側で判定に使い、原因は `cause` として辿れるまま残し、表示メタ情報は外側で上書きできます。

## 受け入れるもの

- transport に依存しないエラー分類の語彙と、それを `cause` chain に載せる型
- 分類ごとの既定の表示メタ情報（機械可読な code と、利用者向けの文言）のカタログ
- cause chain を保ったまま表示メタ情報を重ねる口と、chain から分類・メタ情報を取り出す口
- メッセージに含まれる秘匿値を、呼出し側の名指しで置き換える関数

## 受け入れないもの

- transport の status・レスポンス形式・ヘッダなど、プロトコル由来の語彙（[0080](../../docs/adr/0080-error-handling.md) 禁止事項）
- 他のカーネルと外部パッケージへの依存（[0021](../../docs/adr/0021-frontend-responsibility.md) 依存マトリクス）
- ログ出力（`logging` と境界の責務）

## 公開 API

- `ErrorKind` / `errorKinds` — 分類の型と名前付き定数、および全分類の配列
- `AppError` / `createAppError()` — 原因を `cause` に残す分類済みエラー
- `findAppError()` / `isAppError()` — cause chain 内の分類の判定
- `ErrorMeta` / `createErrorMeta()` — code・利用者向け文言・requestId・公開可能な詳細識別子。不変で、`withMessage()` が文言だけ差し替えた複製を返す
- `withErrorMeta()` / `withErrorDetails()` / `errorMetaFrom()` — cause chain を保つメタ情報ラッパー。外側のメタ情報が優先
- `getDefaultErrorMeta()` — 分類カタログの既定メタ情報
- `resolveErrorMeta()` — 分類カタログと外側メタ情報から code・文言・詳細を解決
- `redactMessage()` / `redactedValue` — 明示指定した秘匿値を wrap 前に置換する関数と、置換後の固定文字列

## モジュール

| モジュール | 役割 |
| --- | --- |
| `error-kind.ts` | 分類の語彙。型と同名の名前付き定数を持ち、他のモジュールが依存する葉 |
| `app-error.ts` | 分類を cause chain に載せる `AppError` と、chain を外側から辿って分類を見つける関数 |
| `error-meta.ts` | 分類とは独立に付与する表示メタ情報と、それを chain に載せる・chain から取り出す関数 |
| `error-catalog.ts` | 分類ごとの既定メタ情報の表と、chain の分類・外側メタ情報から表示用メタ情報を解決する関数 |
| `redact.ts` | 秘匿値の置換 |

依存の向きは `error-kind` → `app-error` / `error-meta` → `error-catalog` の一方向で、`redact` は独立です。

## エラー分類

`ErrorKind` が分類語彙の唯一の定義であり、呼出し側は `ErrorKind.INVALID_ARGUMENT` のような名前付き定数を使います。分類は protocol-agnostic であり、HTTP status への変換は adapters 境界が担当します。

| `ErrorKind` | 意味 / 使い所 |
| --- | --- |
| `INVALID_ARGUMENT` | 構文上は正しいが意味が不正な引数 |
| `UNAUTHENTICATED` | 認証失敗・未ログイン |
| `PERMISSION_DENIED` | 権限不足 |
| `NOT_FOUND` | 対象が存在しない |
| `CONFLICT` | ユニーク制約違反・同時更新衝突など |
| `VALIDATION` | ドメインまたはユースケースの検証失敗 |
| `UNSUPPORTED_MEDIA_TYPE` | サポートしない入力形式 |
| `PAYLOAD_TOO_LARGE` | 許容サイズを超えた入力 |
| `URI_TOO_LONG` | 条件を載せた URL が長すぎる。本体が大きい `PAYLOAD_TOO_LARGE` とは利用者が減らすべきものが違う |
| `TOO_MANY_REQUESTS` | 流量制限・外部依存のスロットリング |
| `CANCELED` | 呼出し側による処理の中断。失敗ではなく打ち切りで、再試行の対象にしない |
| `INTERNAL` | 想定外の内部エラー。契約と違う形の応答も、通信の失敗と区別してここへ入れる |
| `UNIMPLEMENTED` | 未実装または非サポートの機能 |
| `UNAVAILABLE` | 外部依存障害などの一時的な利用不可 |

分類の語彙はこう組みます。

- **値は kebab-case の文字列リテラル**で、型 `ErrorKind` は値の union、定数 `ErrorKind` は同名のオブジェクトです。`enum` は使いません（[`docs/rules.md#types`](../../docs/rules.md#types)）。定数は `satisfies` で型に照らし、リテラルの情報を落としません（[0029](../../docs/adr/0029-type-design-discipline.md)）
- `errorKinds` は全分類の配列で、**分類を引数に取る表が全分類を埋めていることを境界側のテストが網羅的に確かめる**ためにあります。分類を増やしたときに、表の抜けが型ではなくテストで見つかる場所（`switch` で組んだ写像など）がこれを使います
- 分類の一次キーは意味であって、接続先の code の綴りではありません。分類と安定エラーコードの対応、HTTP status との対応表は [0080](../../docs/adr/0080-error-handling.md) が持ちます

### 分類を足す手順

1. `error-kind.ts` の型 union と定数の両方へ足す
2. `error-catalog.ts` の既定メタ情報へ、code と利用者向け文言を足す。表は `Record<ErrorKind, ErrorMeta>` なので、足すまで型検査が通らない
3. この README の分類表へ 1 行足す
4. 変換を持つ `adapters` の口（server / client それぞれ）の、status → 分類と分類 → status の両向きの表を直す。分類 → status の抜けは `errorKinds` を回すテストが見つけるが、**status → 分類は表に無い status を `INTERNAL` へ倒すので、抜けは黙って `INTERNAL` になる** —— 両向きを同時に直す
5. [0080](../../docs/adr/0080-error-handling.md) の対応表を直す

## 分類とメタ情報の重ね方

分類とメタ情報はどちらも cause chain に載せ、**chain を外側から辿って最初に見つかったものが勝ちます**。

- **分類を変えるときは外側に `AppError` を被せる**。内側の分類はそのまま残るので、後から辿れます
- **分類を変えずに文脈を足すときは、`AppError` でないもので被せる**。素の `Error` に `{ cause }` を渡すか、`withErrorMeta()` で文言を載せます。どちらも `findAppError()` は内側の分類を返します。下の層が「到達できない」と「応答が期待の形でない」を分類で分けているとき、上の層で新しい失敗へ詰め替えると両者が同じ顔になります —— 分類は下の層のものを残し、載せるのは文言だけにします
- **外側のメタ情報は内側のメタ情報を置き換えます。項目ごとには混ざりません。** `withErrorMeta()` した上に `withErrorDetails()` を被せると、内側の code と文言は解決に使われず、カタログの既定値へ戻ります。1 つのエラーに載せるメタ情報は、載せる場所で 1 つにまとめます
- `ErrorMeta` の code と文言は、**空文字が「未指定」を表し、`resolveErrorMeta()` がカタログの既定値で埋めます**。`requestId` と `details` は外側のメタ情報からしか来ません
- `ErrorMeta` は不変です。`details` は生成時と取得時の双方でコピーされ、渡した配列を後から変えても、取り出した配列を書き換えても、中身には届きません
- chain の走査は循環を検出して止まります。`cause` が自身を指すエラーを渡しても `undefined` が返ります

## 表示メタ情報の解決

- **カタログの文言は分類しか伝えません。** 「接続できません」からは、宛先が立っていないのか、宛先を間違えたのかは判りません。宛先のようにその場でしか判らない文脈を持つ境界は、分類を残したまま `withErrorMeta()` で文言を載せます。文言の正はカタログにあるので、`withMessage()` を含めて文言を差し替えるのは境界層に限ります
- `resolveErrorMeta()` は分類のないエラーに `undefined` を返します。**未分類を `INTERNAL` へ倒すのは呼出し側の境界の判断**であり、`resolveErrorMeta(error) ?? getDefaultErrorMeta(ErrorKind.INTERNAL)` の形で書きます。分類を持たない値は想定していない経路で投げられたものなので、この層は利用者に見せる形を選べません
- `AppError` は `Error` の派生、`ErrorMeta` は `#private` を持つクラスで、どちらも素の値ではなく、**Server Action / RSC の直列化境界を越えません**。越える前に `resolveErrorMeta()` と `findAppError()` で code・文言・分類の素の値へ落とします。画面へ返す器は `model` が持ちます（[0080](../../docs/adr/0080-error-handling.md)）
- production では Server Component から投げられたエラーの本文が伏せられ、error 境界には `digest` しか届きません。**error 境界は受け取ったエラーから解決せず、`getDefaultErrorMeta(ErrorKind.INTERNAL)` の文言を出します**（[0080](../../docs/adr/0080-error-handling.md)）

## 秘匿値の置換

`redactMessage()` は**何を秘匿するかを呼出し側が名指しする**値ベースの置換です。名前で伏せる `logging` の表（`authorization` / `password` などの項目名）とは軸が違い、構造化フィールドに載らない、この層で組み立てたメッセージ文字列に埋まった値を消すためにあります。置換後の文字列 `redactedValue` は `logging` が使うものと同じ `[REDACTED]` です。

- 秘匿値は重複を除き、空文字を捨て、**長い値から置換**します。短い値を先に置換すると、長い値の残りが部分一致で漏れます
- 置換は文字列の分割と結合で行い、正規表現を組みません。秘匿値に記号が含まれても escape を考えずに済みます
- **wrap する前に置換します**（[0080](../../docs/adr/0080-error-handling.md)）。chain の内側に生の値が残ると、外側で置換しても辿れば読めます

## 利用例

```ts
const cause = new Error(redactMessage(`token=${token}`, [token]));
const classified = createAppError(ErrorKind.UNAUTHENTICATED, { cause });
const error = withErrorDetails(classified, ["accessToken"]);

const meta = resolveErrorMeta(error);
```

`requestId` はログ相関と、利用者からの連絡の突き合わせに使うため、共通エラー画面で表示できます。`details` は wire に出して安全な識別子だけを指定します。画面の表示名は、業務フィールドを知る feature / form 側で変換します。入力値・token・password・理由文は渡しません。

### 層ごとの使い方

| 層 | 使う口 | 形 |
| --- | --- | --- |
| `adapters`（分類する側） | `createAppError()` / `withErrorDetails()` | 生の失敗を 1 度だけ分類し、契約が返した詳細識別子は cause 側へ載せて投げる。応答を得られなかった試行は前の試行の詳細を引き継がない（分類と詳細が別々の試行のものになる） |
| `features` / `model`（分岐する側） | `findAppError(error)?.kind === ErrorKind.X` | **出し分けの合図は分類であって文言ではない**（[`docs/rules.md#wording`](../../docs/rules.md#wording)）。見つからなければ `null` に倒す、認証切れなら読み直す、検証失敗なら `details` を項目へ写す、といった分岐をここで行う |
| 表示・応答の境界 | `resolveErrorMeta()` / `getDefaultErrorMeta()` | 文言はカタログから取り、画面や口ごとに書かない。未分類は `INTERNAL` へ倒す |

`details` を項目名へ写す側は、**契約の項目名と画面の項目名が同じ綴りであることに頼らず**、画面が知る項目名の表に照らしてから使います。読めない名前をそのまま鍵にすると、どの入力欄にも結び付かない誤りが状態へ入ります。理由文は `details` に載らないので、写した先の文言は「受け付けられなかった」までしか言えません。

## boilerplate 導入時の変更点

本リポジトリはバックエンドエラーの追加情報として `requestId` と `details` を採用します。

- `requestId` — ログ相関と連絡の突き合わせに使う識別子。画面にはリクエスト ID として表示可能
- `details` — 不正フィールドなど、公開して安全な識別子の配列。feature / form が表示名へ変換

これは本リポジトリの既定であり、すべてのバックエンド契約に共通するものではありません。導入先が `traceId` / `correlationId`、`fieldErrors` のオブジェクト配列、または別のエラー形式を採用する場合は、adapter の応答変換と `ErrorMeta` を契約に合わせて変更してください。`errors` カーネルへ transport 固有の処理は追加しません。

カタログの code は wire に出ないこのリポジトリの語彙で、接続先の綴りに寄せません（[0080](../../docs/adr/0080-error-handling.md)「エラーコード語彙」）。文言は日本語で、分類ごとに 1 つです。

## 境界

- transport の status とレスポンス形式は持たない
- 生の transport 応答からの分類は `adapters` 境界で一度だけ行う
- 未分類エラーを `internal` に正規化する判断も境界の責務
- ログレベルとログ出力は `logging` と境界の責務。errors 自身は出力しない

## 監査の観点

| 観点 | 判定の形 | 根拠 |
| --- | --- | --- |
| `forbidden: http-vocabulary` — HTTP status・レスポンスの形・transport 固有の語彙を持たない。分類から status への変換は `adapters` の境界が持つ | violation。数値や型が transport 由来かが綴りから読み分けられないときは suggestion | [0080](../../docs/adr/0080-error-handling.md) 禁止事項 / この README「境界」。機械: ESLint `no-restricted-syntax` が `http` / `status` / `response` の識別子と `http(s)` の文字列リテラルまでを落とす |
| `forbidden: external-dependencies` — 他のカーネルも外部パッケージも import しない | violation | [0021](../../docs/adr/0021-frontend-responsibility.md)「各カーネルの責務」。他のカーネルの import は機械: ESLint boundaries。外部パッケージの import は機械が届かない |
| errors 自身はログを出力しない | `console` や logger の呼び出しがあれば violation | この README「境界」 |
| 表示用の code と文言は分類ごとのカタログだけが持ち、`AppError` と `ErrorKind` には持たせない | `AppError` や分類の定義に code・文言の項目があれば violation | [0080](../../docs/adr/0080-error-handling.md)（表示用の code と文言の置き場） / この README「表示メタ情報の解決」 |
| wrap は `cause` を切らない | `{ cause }` を渡さずに元エラーを包み直す箇所があれば violation | [0080](../../docs/adr/0080-error-handling.md)（wrap と置換の順序） / この README「分類とメタ情報の重ね方」 |
| 全分類がカタログに既定メタ情報を持つ | violation | 機械: `error-catalog.ts` の表の型 `Record<ErrorKind, ErrorMeta>` |

## 関連する ADR

- [0021](../../docs/adr/0021-frontend-responsibility.md) — 層の責務と import 境界。分類を transport から切り離す線
- [0029](../../docs/adr/0029-type-design-discipline.md) — 分類を判別可能な値として持つ型設計
- [0080](../../docs/adr/0080-error-handling.md) — バックエンドエラーの正規化と、画面側（`error.tsx` / `not-found.tsx`）との責務分担
