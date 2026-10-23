> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# coupons

ユーザーが持っているクーポンを状態つきで確かめ、キャンペーンコードで 1 枚受け取る画面スライスです。
受け取りの証拠は一覧に 1 行増えることだけなので、2 つを同じ画面に置きます。

## 受け入れるもの

- 保有クーポンの状態（未使用 / 使用済み / 期限切れ / 利用開始前）を、3 つの時刻と「いま」から決めること
- 受け取り: 入力の検証、冪等キーを付けた送信、結果の画面への対応づけ
- 一覧の行の組み立て: どの状態でどの時刻を見せるか

## 受け入れないもの

- いまのカートでそのクーポンを使えるか、いくら引かれるか（購入の手続きが契約に問う。このスライスは計算しない）
- コードを受け取れない理由（契約が区別せず、このスライスも推し量らない）
- 値引きの文言（額面・上限・範囲） —— `model/coupon`
- キャンペーンの定義と停止（`admin` の持ち物）

## Route と契約

| Route | Spec | 認証 |
| --- | --- | --- |
| `/mypage/coupons` | [`screen`](../../../docs/spec/route/shop/mypage/coupons/page.screen.ja.md) / [`function`](../../../docs/spec/route/shop/mypage/coupons/page.function.ja.md) | 要 |

使う operationId。

| operationId | 用途 |
| --- | --- |
| `GetUsersMeCoupons` | 保有クーポン。発行の新しい順。使用済み・期限切れも含む |
| `PostCampaignsClaims` | キャンペーンコードでクーポンを 1 枚受け取る。冪等キーを伴う |

## 状態とデザイン参照

| 画面 | 状態 | story |
| --- | --- | --- |
| クーポン | 成功（4 状態すべて） | `Page/Coupons/Wallet/Default` |
| | 空 | `Page/Coupons/Wallet/Empty` |
| | バンド | `Page/Coupons/Wallet/{Tablet,Mobile}` |
| | 待機 | `Features/Coupons/Wallet/Skeleton/Default` |
| 受け取り欄 | 待ち受け / 空のまま押した / 受け取れた / 送信中 | `Features/Coupons/Wallet/ClaimForm/{Default,EmptySubmitted,Claimed,Pending}` |
| | コードが弾かれた（`422`） | `Features/Coupons/Wallet/ClaimForm/Rejected` |
| | 競合（`409`） / 使えない / 読めない要求 | `Features/Coupons/Wallet/ClaimForm/{InProgress,Unavailable,Malformed}` |
| | 狭いバンド | `Features/Coupons/Wallet/ClaimForm/Mobile` |
| クーポン一覧 | 全状態 / 空 / 長い値 / 狭いバンド | `Features/Coupons/Wallet/CouponList/{AllStates,Empty,LongValues,Mobile}` |
| 送信ボタン | 押せる | `Features/Coupons/Wallet/SubmitButton/Default` |

**画面自身のエラー状態はありません。** 受け取りの失敗は受け取り欄の脇に出し、取得の失敗は route の
`error` 境界（`src/app/(shop)/mypage/coupons/error.tsx`）が受けます。

## 構成

| ファイル | 役割 |
| --- | --- |
| `actions.ts` | 受け取りの Server Action |
| `form-names.ts` | 受け取りが持つ項目の名前。**検証は持たない** —— 入力欄が要るのは綴りだけ |
| `form-state.ts` | Server Action の戻り値の型 |
| `parse-claim-form.ts` | 送信された内容からコードと冪等キーを取り出す |
| `holding-status.ts` | ある時刻での保有クーポンの状態と、その呼び名を決める |
| `facade/paths/` | この feature が持つ route。**マイページが指すエントリ** |
| `wallet/page-content.tsx` | 保有クーポンを取得して画面を組み立てる |
| `wallet/view.tsx` | 画面。パンくずを持ち、受け取り欄を一覧の上に置く |
| `wallet/ui/claim-form/` | 受け取り欄。入力と冪等キーを持つクライアントアイランド |
| `wallet/ui/submit-button/` | 受け取りの操作。`form` の子として送信状態を読む |
| `wallet/ui/coupon-list/` | 状態つきの保有クーポン。行は読むためのもので押せない |
| `wallet/ui/skeleton/` | ローディング表示。受け取り欄の場所を確保し、一覧が届いても欄が動かないようにする |
| `coupons.fixture.ts` | story とテストが読む固定の保有クーポン |
| `__mocks__/actions.ts` | カタログで Server Action を差し替える |

## 依存カーネル

| カーネル | 用途 |
| --- | --- |
| `adapters` | 保有クーポンの取得（`server/api/coupons`）と受け取り（`server/api/campaigns`） |
| `model` | 表示用の型（`coupon/HeldCoupon`）、値引きの文言、日時と金額、`ActionState`、冪等キー |
| `components` | 一覧、状態のマーカー、入力欄、パンくず、フィードバックのコンテナー |
| `errors` | 失敗した受け取りの分類 |
| `observability` | レンダリングを span に載せる |

他 feature の `facade/` も引きます —— ログイン（`auth`）と、パンくずのためのマイページの route（`account`）。

## Action 戻り値契約

| Action | 場所 | 戻り値 | 成功後 | 失敗時 |
| --- | --- | --- | --- | --- |
| `claimCouponAction` | `actions.ts` | `ActionState<void, "code">` | `refresh()`。画面に留まり toast | 空または弾かれたコードは項目の文言（理由によらず 1 つ）、それ以外はフォームの脇の文言。認証が切れていればこの画面を戻り先にしてログインへ `redirect` |

**冪等キーは必ず付け、作り直すのは成功とコードが弾かれたときだけです。** 受け取りは取り消せず、別の
キーで送り直すともう 1 枚出ます。競合（`409`）・一時的に使えない・通信の失敗のあとは同じキーで送り直す
ので、応答だけが失われた成立済みの受け取りが 2 枚目になりません。読めない要求（`400`）は読み込み直しへ
導き、読み込み直したフォームは新しいキーを持ちます。

## テスト観点

- [ ] 各行が 未使用 / 使用済み / 期限切れ / 利用開始前 を区別する。`usableFrom` と `expiresAt` にちょうど達した瞬間も含む
- [ ] 複数の状態が同時に成り立つときは、もう変わらないほうが勝つ（使用済み、次に期限切れ、次に利用開始前）
- [ ] 弾かれたコード（`422`）は、理由によらず 1 つの文言を出す
- [ ] 失敗後の送り直しは同じ冪等キーを運ぶ。成功後とコードが弾かれた後はキーが変わる
- [ ] 成功で入力を空にして toast で知らせ、失敗では入力を残す

## 運用

- **「いま」は route が読んで渡します。** 状態はそれに照らして決めるので、このスライスの中で時計を
  読むと検証で固定できなくなります
- **状態はカートについて何も言いません。** 「未使用」は券そのものが未使用という意味で、いまのカートで
  使えるという意味ではありません。後者には購入の手続きが自分の契約で答えます
- **コードは入力のまま送ります。** 空白と大文字・小文字の違いは契約が無視するので、ここで正規化すると
  バックエンドが持つ規則のコピーになります。止めるのは空のコードだけで、必ず弾かれるためです。止めるのは押したときで、欄の脇に文言を出し、ボタンを押せなくはしません
- **失われた応答を仕組みで取り戻しません。** 受け取りの応答が届かなかったときは、ユーザーが一覧を
  確かめてから押し直します。受け取りが痕跡を残す場所は一覧だけです

## 関連する ADR

- [0061](../../../docs/adr/0061-form-mutation-ux.ja.md) — 受け取りは Server Action の往復
- [0062](../../../docs/adr/0062-form-input-validation.ja.md) — 入力の検証をどこに持つか
- [0063](../../../docs/adr/0063-mutation-result-notification.ja.md) — 画面に留まる成功は toast で知らせる
- [0080](../../../docs/adr/0080-error-handling.ja.md) — 取得の失敗は route の境界が受ける
- [0027](../../../docs/adr/0027-directory-structure.ja.md) — 物理配置とコロケーション
