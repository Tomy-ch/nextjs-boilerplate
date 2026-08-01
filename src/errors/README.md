---
imports-allowed: []
forbidden: [http-vocabulary, external-dependencies]
test-requirement: unit
---

# errors

全層から参照できる、protocol-agnostic なアプリケーション共通エラーのカーネルです。Go の `internal/apperror` と同じく、分類・原因・表示メタ情報を分離します。

## 公開 API

- `ErrorKind` / `createAppError()` — 原因を `cause` に残す分類済みエラー
- `findAppError()` / `isAppError()` — cause chain 内の分類の判定
- `ErrorMeta` / `createErrorMeta()` — code・利用者向け文言・requestId・公開可能な詳細識別子
- `withErrorMeta()` / `withErrorDetails()` / `errorMetaFrom()` — cause chain を保つメタ情報ラッパー。外側のメタ情報が優先
- `resolveErrorMeta()` — 分類カタログと外側メタ情報から code・文言・詳細を解決
- `redactMessage()` — 明示指定した秘匿値を wrap 前に置換

## 利用例

```ts
const cause = new Error(redactMessage(`token=${token}`, [token]));
const classified = createAppError("unauthenticated", { cause });
const error = withErrorDetails(classified, ["accessToken"]);

const meta = resolveErrorMeta(error);
```

`requestId` は問い合わせ番号・ログ相関に使うため、共通エラー画面で表示できます。`details` は wire に出して安全な識別子だけを指定します。画面の表示名は、業務フィールドを知る feature / form 側で変換します。入力値・token・password・理由文は渡しません。

## boilerplate 導入時の変更点

本 boilerplate はバックエンドエラーの追加情報として `requestId` と `details` を採用します。

- `requestId` — 問い合わせ・ログ相関用の識別子。画面には問い合わせ番号として表示可能
- `details` — 不正フィールドなど、公開して安全な識別子の配列。feature / form が表示名へ変換

これは本 boilerplate の既定であり、すべてのバックエンド契約に共通するものではありません。導入先が `traceId` / `correlationId`、`fieldErrors` のオブジェクト配列、または別のエラー形式を採用する場合は、adapter の応答変換と `ErrorMeta` を契約に合わせて変更してください。`errors` カーネルへ transport 固有の処理は追加しません。

## 境界

- transport の status とレスポンス形式は持たない
- 生の transport 応答からの分類は `adapters` 境界で一度だけ行う
- 未分類エラーを `internal` に正規化する判断も境界の責務
- ログレベルとログ出力は `logging` と境界の責務。errors 自身は出力しない
