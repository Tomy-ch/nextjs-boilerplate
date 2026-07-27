# フロント実装リファレンス: 画面一覧 & API 概要

輸入 EC サンプル(go-boilerplate 協調)。nextjs-boilerplate 実装時の入力資料。
詳細な型・エラーコードは `openapi.gen.yaml`(orval 生成)を正とする。本書は画面と API の対応関係・実装上の注意点の把握用。

- 本書は**サンプルの仕様**であり、[v1 実装計画](plan/v1-implementation-plan.md) Phase 5 の PR 分解はここを入力とする
- 本書に列挙された画面・feature は**原則としてサンプル破棄(爆破)の対象**である。**例外**(U9 ログイン画面等のコア残留分)と正確な境界は [v1 実装計画](plan/v1-implementation-plan.md) §3.5 が正

> **画像まわりの注記**: 本書 §0 / §4 の「画像はURL文字列として保存・表示するのみ / アップロード機能は存在しない」は **go-boilerplate #651(画像アップロード基盤)で改訂済み**である。実際は `POST /v1/products/images`(multipart)でアップロードし、backend が発行したオブジェクトキー(`products/{uuid}.{ext}`)を保存する。配信元は Garage(公開エンドポイント。go-boilerplate #668)であり、`image-origin` ではない。A6 / A7 は URL 文字列入力ではなく**アップロード UI** を実装する。

---

## 0. 認証・共通事項(フロントが意識する範囲)

- 認証は **Next.js BFF が仲介**する。ブラウザは httpOnly BFF Session Cookie のみ保持し、JWT(Access Token)はブラウザに露出しない
- フロントから見た「認証が要る API」は、BFF 経由で Bearer が自動付与される前提で実装する。個別に Authorization ヘッダを組み立てる必要はない
- 401 は「未ログイン / セッション切れ」として扱い、ログイン画面(U9、BFF route)へリダイレクト
- 403 は「ログイン済みだが権限不足」。admin 系画面(A 系)で非 admin ユーザーがアクセスした場合に発生。UI 上は該当ボタン / 導線ごと出し分けるのが基本
- 通貨: 保存・表示の基準は USD。円換算は `display_currency=JPY` を明示指定した時のみ `reference_amount` として付与される参考値(非公式レート確定額ではない)。フロントは「参考」であることを表示上明示する
- カート(U4)は API 経由ではなく **フロント内 client state** で完結する。**ページリロードで消える前提でよい(永続化なし)**
- ~~画像は URL 文字列として保存・表示するのみ。アップロード機能は存在しない~~ → **冒頭の注記を参照(#651 で改訂)**。`next/image` の `remotePatterns` には Garage の公開エンドポイントを allowlist 登録する。**ワイルドカードは使わない**
- 商品説明(description)は **リッチテキスト**(TipTap で作成)。表示側は必ず sanitizer を通す(生の `dangerouslySetInnerHTML` 直接使用は禁止。`rules.md` #48)
- ページネーションは基本 **cursor 方式**。無限スクロール(増分取得)の画面とページ送り相当の画面が混在するので、画面ごとの実装パターンに注意
- Idempotency-Key が必要な書き込みは購入作成(U6)のみ。二重送信防止として実装すること

---

## 1. 画面一覧(19)

### ユーザー側(12)

| # | 画面 | 使用 API | ざっくり仕様 | フロント実装上の注意 |
| --- | --- | --- | --- | --- |
| U1 | トップ | `GET /v1/products/ranking` / `GET /v1/products`(新着 sort) / `GET /v1/products/categories` | 売上ランキング・新着商品・カテゴリ導線を並べるだけのトップページ。パーソナライズなし | 3 系統のデータを並置するだけなので RSC 内で並行 fetch(`Promise.all`)で十分 |
| U2 | 商品一覧 | `GET /v1/products`(cursor + category/status フィルタ + keyword + sort) | 検索・絞り込み・並び替え付き一覧 | `searchParams` が変わるたびに RSC が再取得する構成が主眼。URL とフィルタ状態を同期させる |
| U3 | 商品詳細 | `GET /v1/products/{id}` / `GET /v1/products`(同カテゴリ再利用) | 単一商品の詳細表示。関連商品は一覧 API をカテゴリフィルタで再利用(専用 API なし) | description はリッチテキストなので必ず sanitizer 経由で表示 |
| U4 | カート | なし(client state) | 商品追加・数量変更・削除をブラウザ内で完結 | **永続化しない**。購入確認画面へ渡す際に明細配列として組み立てる |
| U5 | 購入確認 | `GET /v1/exchange-rates`(参考円換算) / `GET /v1/users/me` | カート内容の最終確認。JPY 表示切替可 | `display_currency=JPY` 時のみ `reference_amount` 表示。為替取得失敗時は参考額なしで購入自体は継続できる(degrade) |
| U6 | 購入完了 | `POST /v1/purchases` | 購入確定。明細配列送信 | **Idempotency-Key 必須**。二重クリック / リロードでの二重購入を防ぐ。`ActionState<T>` パターンでの送信状態管理 |
| U7 | 購入履歴 | `GET /v1/purchases`(cursor) | 自分の購入一覧 | **無限スクロール(増分取得)方式**。ページ送り UI ではない |
| U8 | 購入詳細 | `GET /v1/purchases/{id}` | 購入 1 件の明細・商品情報 | details と products の JOIN 結果を受け取る想定 |
| U9 | ログイン | なし(BFF route → 外部 IdP) | **Authorization Code + PKCE** で IdP へリダイレクト | Go API を一切叩かない。BFF の Route Handler が IdP とのやりとりを担うのでフロントは「ログインボタン → BFF の URL へ遷移」のみ実装 |
| U10 | 登録(オンボーディング) | `GET /v1/prefectures` / `GET /v1/addresses?postal_code=` / `POST /v1/users/me`(想定) | 初回ログイン後の追加情報登録(住所等) | **方式未決**(§3)。郵便番号入力 → 住所自動補完、失敗時は都道府県手入力にフォールバック |
| U11 | マイページ | `GET /v1/users/me` / `GET /v1/users/me/purchases/summary` | プロフィール確認・購入サマリ表示・退会導線 | 退会は確認モーダル必須(不可逆操作) |
| U12 | ユーザー更新 | `GET /v1/users/me` / `GET /v1/prefectures` / `PUT /v1/users/{id}` | プロフィール編集 | U11 とは独立ルート。**CollectAll**(RSC 内 `Promise.all` での並置合成)の実例 |

### admin 側(7)

| # | 画面 | 使用 API | ざっくり仕様 | フロント実装上の注意 |
| --- | --- | --- | --- | --- |
| A1 | ダッシュボード | `GET /v1/dashboard/summary` / `GET /v1/products/low-stock` / `GET /v1/purchases`(全体) | 数値カード + 一覧のみ。グラフなし | サマリは **backend 側で合成済み**の値をそのまま表示する(フロント側で複数 API から計算しない) |
| A2 | 商品一覧 | `GET /v1/products` / `GET /v1/products/statuses` | admin 向け商品一覧。作成・編集・補充への導線 | U2 と表示項目は近いが admin 用の操作列(編集 / 補充ボタン)が付く |
| A3 | 商品補充 | `PATCH /v1/products/{product_id}/stock` | 在庫数の加算 / 調整のみ | 更新対象は在庫数のみ。他の商品情報は編集不可(編集は A7 の担当) |
| A4 | 集計 | `GET /v1/dashboard/summary` / `GET /v1/products/ranking` | 売上・ランキング系の集計表示 | A1 と共通 API を使うが表示観点が異なる |
| A5 | ユーザー一覧 | `GET /v1/users` / `DELETE /v1/users/{id}` | ユーザー一覧・退会操作 | 退会は確認モーダル必須。退会後は結果整合でキャンセル / 在庫復元が非同期に走るので、即時反映を保証しない UI 文言にする |
| A6 | 商品作成 | `POST /v1/products` / `GET /v1/products/categories` / `GET /v1/products/statuses` / `POST /v1/products/images` | 新規商品登録フォーム | description は TipTap。**画像はアップロード UI**(#651)。price は USD セント単位で送信 |
| A7 | 商品編集 | `GET /v1/products/{id}` / `PATCH /v1/products/{product_id}` / `POST /v1/products/images` | 既存商品の編集フォーム | 既存値ロード → 部分更新。**楽観ロック**を想定し、409 時は「他の人が更新済み」の再読み込み導線を用意する。在庫数はここでは編集不可(A3 の担当) |

### 合成パターンの使い分け(実装判断の指針)

- **backend 合成(A1)**: 表示にドメイン計算(集計)が絡む → バックエンドが 1 本の API で合成済みレスポンスを返す。フロントは複数 API をまたいだ計算をしない
- **CollectAll(U12)**: 複数の独立したリソースを単に並べるだけ → フロント側(RSC 内)で並行 fetch して合成してよい

---

## 2. API 概要一覧

### Product 系

| Method / Path | 認証 | 用途 | フロントが送る主な項目 | 主なレスポンス項目 | 主なエラー |
| --- | --- | --- | --- | --- | --- |
| `GET /v1/products` | 不要 | 一覧(cursor + フィルタ + keyword + sort) | cursor, category, status, keyword, sort | items[], next_cursor | 400 |
| `GET /v1/products/{id}` | 不要 | 詳細 | — | 商品詳細(description 含む) | 404 |
| `GET /v1/products/categories` | 不要 | カテゴリマスタ | — | categories[] | — |
| `GET /v1/products/statuses` | 不要 | ステータスマスタ | — | statuses[] | — |
| `GET /v1/products/low-stock` | 要 admin | 在庫僅少一覧 | 閾値パラメータ(任意) | items[] | 401, 403 |
| `GET /v1/products/ranking` | 不要 | 売上ランキング | — | ranked items[] | — |
| `POST /v1/products` | 要 admin | 商品作成(A6) | name, description(rich text), price(USD セント), category_id, image_path, quantity | 作成後の商品 | 401, 403, 422 |
| `PATCH /v1/products/{product_id}` | 要 admin | 商品更新(A7)。在庫以外の項目 | 部分更新フィールド | 更新後の商品 | 401, 403, 404, **409(楽観ロック)**, 422 |
| `PATCH /v1/products/{product_id}/stock` | 要 admin | 在庫補充(A3) | 補充量 | 更新後の在庫数 | 401, 403, 404, 422 |
| `POST /v1/products/images` | 要 admin | 画像アップロード(A6 / A7・#651) | multipart(image binary) | `{ imagePath }` | 401, 403, 413, 415, 422 |

### Purchase 系

| Method / Path | 認証 | 用途 | フロントが送る主な項目 | 主なレスポンス項目 | 主なエラー |
| --- | --- | --- | --- | --- | --- |
| `POST /v1/purchases` | 要 | 購入作成(U6) | 明細配列(product_id, quantity), **Idempotency-Key**(ヘッダ), display_currency(任意) | purchase_id, ステータス | 401, 409(在庫不足等), 422 |
| `GET /v1/purchases` | 要 | 自分の購入履歴(U7、cursor) | cursor | items[], next_cursor | 401 |
| `GET /v1/purchases/{purchase_id}` | 要 | 購入詳細(U8) | — | 明細(商品情報 JOIN 済み) | 401, 404 |
| `PATCH /v1/purchases/{purchase_id}/cancel` | 要 | キャンセル | — | 更新後ステータス | 401, 404, 409(不正遷移) |
| `PATCH /v1/purchases/{purchase_id}/pay` | 要 | 支払い(擬似決済) | — | 更新後ステータス | 401, 404, 409 |
| `PATCH /v1/purchases/{purchase_id}/ship` | 要 admin | 発送 | — | 更新後ステータス | 401, 403, 404, 409 |
| `PATCH /v1/purchases/{purchase_id}/deliver` | 要 admin | 配達完了 | — | 更新後ステータス | 401, 403, 404, 409 |

### 集計・在庫

| Method / Path | 認証 | 用途 | 主なレスポンス項目 |
| --- | --- | --- | --- |
| `GET /v1/users/me/purchases/summary` | 要 | 自分の購入サマリ(U11) | 合計額・件数等 |
| `GET /v1/dashboard/summary` | 要 admin | admin 横断集計(A1 / A4) | 期間売上・ステータス別件数・商品数(backend 合成済み) |

### 基盤・横断

| Method / Path | 認証 | 用途 | 備考 |
| --- | --- | --- | --- |
| `GET /v1/users/me` | 要 | 認証コンテキスト解決 | ログイン中ユーザーの基本情報 |
| `GET /v1/prefectures` | 不要 | 都道府県マスタ | 登録 / 更新フォームの select 用 |
| `GET /v1/addresses?postal_code=` | 不要 | 郵便番号 → 住所補完 | 失敗時は都道府県手入力にフォールバック(degrade) |
| `GET /v1/exchange-rates` | 不要 | 為替レート(参考円換算用) | 失敗時は `reference_amount` なしで継続(degrade) |
| `DELETE /v1/users/{user_id}` | 要 admin(A5)or 本人(U11 退会) | 退会 | 進行中購入があると 409。キャンセル・在庫復元は非同期の結果整合 |

### ログイン / ログアウト

Go API としては存在しない。**BFF の Route Handler が担当**(Authorization Code + PKCE で外部 IdP へ)。フロントは BFF の用意する URL(例: `/api/auth/login` / `/api/auth/logout`)への遷移のみ実装する。

---

## 3. 未決事項(フロント実装に影響するもの)

| # | 内容 | 決着させる時期 |
| --- | --- | --- |
| 1 | **U10 登録フローの方式** — JIT 自動プロビジョニングか明示オンボーディングフォームか。本資料の推奨は「明示オンボーディング側で実装し、確定後に差分吸収」 | U10 の実装 PR まで |
| 2 | **`style-src`(CSP)の運用方式** — TipTap が inline style を出力するため、nonce 運用かハッシュ運用かで A6 / A7 のエディタ組み込み方法が変わる | v1 実装計画 P6-2 |
| 3 | **sanitizer ライブラリの選定** — description 表示側で必須(`rules.md` #48) | A6 / A7 の実装 PR まで |

> **PostHog / Cookie 同意**: 本資料は「採否未決」としていたが、**v1 実装計画で「軽量 consent 機構 + ゲートは採用 / GTM・PostHog 本体は不採用」に確定**した([0131](adr/0131-cookie-consent.md) を exclusion から反転)。

---

## 4. 除外事項(フロントで作らなくてよいもの)

- 決済 SDK 本体・PSP 連携(pay 操作は Go 側の状態遷移のみで完結。擬似決済)
- ~~画像アップロード UI~~ → **冒頭の注記を参照(#651 で改訂。アップロード UI は実装する)**
- リアルタイム機能(SSE / WebSocket)
- 推薦・パーソナライズ機能
- 商品説明以外のリッチテキスト編集画面
- ダッシュボードのグラフ・時系列チャート(数値カード + 一覧のみ)
- i18n 切替、DnD、feature flag UI
