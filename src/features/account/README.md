---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging]
forbidden: [features] # 画面まるごとの story は例外 (ADR 0021)
test-requirement: feature
---

# account

自分の登録情報を確かめ、変えて、やめるための画面スライスです。

## 受け入れるもの

- 自分の情報・購入の集計・都道府県マスタの取得の編成
- プロフィールの更新と退会の Server Action（編成のみ）
- この画面専用の表示（登録情報のカード・集計の表・編集フォーム・退会の確認）

## 受け入れないもの

- 他 feature への直接依存
- 汎用に使える表示（`Card` / `Table` / `AlertDialog` / `Field` などは `components` から取る）
- 認証そのもの（session の復元・破棄は `adapters/server/auth` の領分）

## 構成

画面（`mypage` / `edit`）ごとに掘り、その中を性質で分けます（[0027](../../../docs/adr/0027-directory-structure.md)）。
どちらの画面にも属さないものは画面を挟まず直下へ置きます。

| ファイル | 役割 |
| --- | --- |
| `actions.ts` | プロフィール更新と退会の Server Action。検証と分類だけを持ち、通信は `adapters` が行う |
| `__mocks__/actions.ts` | カタログでの Server Action の差し替え（[0054](../../../docs/adr/0054-ui-catalog-storybook.md)）。押せる操作を成立させるためだけに置く |
| `form-state.ts` | 2 つの Server Action の戻り値の型。`ActionState<T>` を画面の項目名で閉じる |
| `paths.ts` | この feature が持つ 2 つのルート。パンくずと戻り先が参照する |
| `mypage/page-content.tsx` | 自分の情報と購入の集計の並行取得 |
| `mypage/view.tsx` | マイページの表示。読む 2 枚と、区切りの下の退会を並べる |
| `mypage/ui/profile-card/` | 登録情報の表示と、編集への導線 |
| `mypage/ui/purchase-summary-card/` | 購入の集計。ステータス別の内訳を表で出す |
| `mypage/ui/purchase-history-dialog/` | 購入履歴の一覧。局所スクロールを持つ dialog |
| `mypage/ui/action-row/` | 下端の操作の並び。退会とサイト説明への導線 |
| `mypage/ui/withdraw-button/` | 退会。確認 dialog と送信を持つ client island |
| `mypage/ui/skeleton/` | マイページの待機表示 |
| `edit/page-content.tsx` | 自分の情報と都道府県マスタの並置合成（CollectAll） |
| `edit/view.tsx` | プロフィール編集の表示。パンくずをここが持つ |
| `edit/parse-profile-form.ts` | 送信された `FormData` を更新に渡せる形へ解く |
| `edit/use-error-visibility.ts` | 誤りをいつ見せるかだけを決める。検証はしない |
| `edit/use-profile-fields.ts` | 検証を回し、入力欄 1 つぶんの props を組む |
| `edit/use-address-completion.ts` | 郵便番号から住所を引き、埋める値を決める |
| `edit/use-address-field.ts` | 補完をフォームへ当てる。blur の包み方と埋める先 |
| `edit/field-attributes.ts` | 入力欄そのものへ与える a11y 属性を組む |
| `edit/ui/profile-form/` | 並び。client island |
| `edit/ui/text-field/` | 1 行入力の項目 |
| `edit/ui/prefecture-field/` | 都道府県の項目。候補は静的なので native の select で出す |
| `edit/ui/postal-code-field/` | 郵便番号の項目。住所を検索する操作を枠の中に持つ |
| `edit/ui/skeleton/` | プロフィール編集の待機表示 |
| `account.fixture.ts` | story とテストが読む固定値 |

### プロフィール編集の割り方

変わる理由が違うものを分けてあります。どれか 1 つを直すのに他を読まずに済みます。

| 関心 | 持ち主 | 変わる理由 |
| --- | --- | --- |
| どの値が正しいか | `model/user/profile-schema.ts` | 契約や業務上の制約 |
| 誤りをいつ見せるか | `use-error-visibility.ts` | [0062](../../../docs/adr/0062-form-input-validation.md) の改訂 |
| 検証を回し props を組む | `use-profile-fields.ts` | この画面の項目が増減したとき |
| 住所を引く | `use-address-completion.ts` | 補完の契約や打ち切りの仕方 |
| 補完をフォームへ当てる | `use-address-field.ts` | どの項目へ埋めるか |
| 入力欄へ与える属性 | `field-attributes.ts` | a11y の配線が変わったとき |
| 入力を解く | `parse-profile-form.ts` | 送信の形（`FormData`）が変わったとき |
| 送信を編成する | `actions.ts` | 更新の手順が変わったとき |
| 並び | `ui/profile-form/` | 見た目 |

## 運用

- **表示と編集を別ルートに分けます**。1 つの画面に畳むと、どちらの状態で開いているかが URL から
  失われ、戻る操作も共有もできなくなります
- **合成はフロント側で行います**。編集画面が要る「自分の情報」と「都道府県マスタ」は互いに独立で、
  並べるだけで足ります。ドメインの計算を挟まない合成をバックエンドへ持たせると、画面の都合で契約が
  1 本増えます（[screens.md](../../../docs/screens.md) §1）
- **識別子を画面へ渡しません**。更新と退会が対象を指すのに使う内部の識別子は `adapters` の中で
  解決します。フォームの hidden に載せると、ブラウザに置く理由の無い値が出ます
- **都道府県は `SelectNative` です**。契約が全 47 件を固定で返す静的な候補なので、client island の
  検索 UI を持ち込む理由がありません（[0053](../../../docs/adr/0053-ui-component-interaction-seam.md)）
- **検証は client と server の両方で通します**。同じ表示検証スキーマ（`model/user/profile-schema.ts`）
  を使いますが、client 側は即時に返すためのもので、通ったことは何の保証にもなりません。契約に
  照らした検証は `adapters` の境界がさらに別に行います（[0062](../../../docs/adr/0062-form-input-validation.md)）
- **focus が当たっている項目へ新しい誤りを出しません**。焦点を当てた時点に出ていた文言を上限に
  して表示します。上限が無いと、書き直そうとして 1 文字消しただけで「入力してください」が
  現れます。直ったことはその場で消して反映します
- **住所の補完は候補が割れた項目を埋めません**。1 つの郵便番号が複数の町域を指すことがあり、
  先頭を無条件に採ると利用者が選んでいない住所が黙って入ります。番地は補完に含まれないため、
  町域を入れるのは丁目・番地が空のときだけです
- **補完に失敗しても先へ進めます**。契約は外部 lookup の障害を `503` ではなく空の候補で返すと
  定めており、画面は手入力を続けさせます（[0080](../../../docs/adr/0080-error-handling.md)）
- **補完が起きたことを読み上げます**。入力欄の値が変わるだけでは、そこを見ていない利用者に
  届きません
- **カタログでは補完の応答をカタログ自身が返します**。`/api/addresses` は Route Handler なので
  Storybook には存在せず、答える相手が居ないと該当なししか出せません。宛先を横取りするのは
  `.storybook/msw/handlers.ts` で、引ける郵便番号は次の 2 つ、それ以外は該当なしになります

  | 郵便番号 | 返る候補 | 確かめられること |
  | --- | --- | --- |
  | `150-0001` | 東京都 / 渋谷区、町域は 2 件 | 候補が割れた項目（町域）を埋めないこと |
  | `220-0012` | 神奈川県 / 横浜市西区 / みなとみらい | 丁目・番地が空のときだけ町域まで埋めること |

- **保存は画面を移さず toast で伝え、退会は移します**。前者はフォームの文脈に留まる操作で、後者は
  成立した時点で留まる先が無くなるためです（[0063](../../../docs/adr/0063-mutation-result-notification.md)）
- **退会の文言で即時の反映を約束しません**。取り消しと在庫の戻しは結果整合で走るため、直後に古い
  状態を見た利用者が失敗を疑います
- **退会の確認は `AlertDialogAction` を使いません**。押した時点で dialog が閉じる部品なので、
  送信中の表示も失敗の文言も利用者が見ていない場所に出ます。閉じるのは成立して画面が変わるときだけです
- **パンくずは編集画面だけが持ちます**。マイページは global nav が直接指すので、同じ導線を二重に
  置くことになります（[0026](../../../docs/adr/0026-layout-shell-mount.md)）
