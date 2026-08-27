# Attachment

## 用途

選択済みのファイルを 1 件ずつ表示します。種類を示すアイコンまたは縮小表示、名前、大きさや進行状況の補足、取り消しや再送などの操作をひとまとまりに置きます。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `AttachmentGroup` | 複数の添付を横に並べる、名前を持つ `group` です。収まらない分は横スクロールします。 |
| `Attachment` | 添付 1 件の枠です。`size` / `orientation` / `state` で見た目を選びます。 |
| `AttachmentMedia` | 種類を示すアイコンまたは縮小表示を置く枠です。 |
| `AttachmentContent` | 名前と補足を縦に並べる領域です。 |
| `AttachmentTitle` | 添付の名前です。枠に収まらない場合は末尾を省略します。 |
| `AttachmentDescription` | 大きさ・進行状況・失敗理由などの補足です。 |
| `AttachmentActions` | 操作を並べる領域です。`vertical` では枠の右上へ重なります。 |
| `AttachmentAction` | 添付 1 件に対する操作です。`Button` を合成します。 |
| `AttachmentTrigger` | 枠全体を押せるようにする、面いっぱいの当たり判定です。 |

`ATTACHMENT_SIZE` / `ATTACHMENT_ORIENTATION` / `ATTACHMENT_STATE` / `ATTACHMENT_MEDIA_VARIANT` と対応する型を `attachment.definition.ts` で公開します。これらに指定できる値の owner はこの定義であり、`"error"` などの文字列を利用側で直接書きません。

| state | 見え方 |
| --- | --- |
| `idle` | 枠線を破線にし、まだ中身が確定していないことを示します。 |
| `uploading` | 枠全体に帯が流れ、送信が止まっていないことを示します。 |
| `processing` | 同じく枠全体に帯が流れます。 |
| `error` | 枠線と媒体の枠を失敗の色にします。 |
| `done` | 通常の枠として表示します。既定値です。 |

| orientation | 見え方 |
| --- | --- |
| `horizontal` | アイコン・名前・操作を横に並べます。既定値です。 |
| `vertical` | 縮小表示を上、名前を下に置き、操作を右上へ重ねます。 |

## 利用ケース

- 選択済みのファイルを一覧し、1 件ずつ取り消せるようにする場合
- 送信中・変換中・失敗を、同じ枠のまま見た目で区別する場合
- 画像の縮小表示を伴う添付を `vertical` で並べる場合
- 添付そのものを押して詳細や元ファイルへ遷移させる場合（`AttachmentTrigger`）

## 責務境界

SSR first の選定では `◎` に当たります。hydration を必要としない表示専用の Server Component で、client island を持ちません。押下に反応する部分だけを呼び出し元が client component として組みます。

ファイルの選択、送信、削除、再試行、進捗の算出は持ちません。`state` は見た目を切り替えるだけで、実際の進行を管理するのは呼び出し元です。名前・大きさ・進行状況はすべて整形済みの文字列として受け取ります。バイト数の整形は `model/` の formatter の責務です。

`state` は支援技術へ伝わりません。送信中や失敗であることは `AttachmentDescription` の文言としても示します。利用者の対応が要る失敗は、この枠だけに頼らず feature 側で `Alert` などと組み合わせます。

`AttachmentMedia` のアイコンと画像はいずれも装飾です。何のファイルかは `AttachmentTitle` のテキストが伝えるため、画像の `alt` は空にできます。

`AttachmentAction` と `AttachmentTrigger` のアクセシブルな名前は呼び出し元が必ず与えます。どちらもアイコンだけ、あるいは面だけになるため、名前がないと何に対する操作か判りません。名前には添付の名前も含めます。

`AttachmentTrigger` は枠全体に重なるので、自身の focus 表示を抑え、代わりに `Attachment` が `focus-within` の outline を出します。`AttachmentActions` はさらに上に重なるため、個別の操作はそれぞれ押せます。

`AttachmentGroup` は件数・並び順・上限を持ちません。

vendor は Radix の `Slot`（`asChild` の合成）と `class-variance-authority` ですが、公開 API に vendor 名は含めません。

## Storybook とテスト

Storybook は既定の添付、段階 5 種、自動で消えるまでの見え方、大きさ 3 種、`vertical` の配置、画像を縮小表示として置く場合、枠全体を押せるようにした場合、名前と補足の省略、複数を横に並べた場合を確認します。枠線・重なり・省略・横スクロールはいずれも実描画でしか判断できないため、Storybook 側の確認範囲です。`Dismissing` はファイルを選ばなくても残り時間の表示と消える様子を確認でき、`並べ直す` で何度でも再生できます。

加えて `FileUpload` と接続した配線例を 2 つ置きます。`UploadFlow` は選択・受理・却下・取り消しを実操作で辿るもので、**選んだものは消えません**。`UploadFlowAutoDismiss` は送信が終わった添付が自動で消える場合で、消えるまでの残り時間を `ProgressClient` で示し、hover / focus 中と画面が見えていない間は計時を止めます（WCAG 2.2.1）。どちらの story も挙動を固定し、story 内で切り替える操作は置きません。

自動削除は一覧を持つ側の設定であり、この component の機能ではありません。対処が必要な `error` は対象にしません。

テストは既定が `done` / `default` / `horizontal` であること、3 つの値を data 属性として公開すること、`state` が支援技術へ何も伝えないこと、媒体の種類を公開すること、操作にアクセシブルな名前を与えて押下を呼び出し元へ渡せること、trigger が既定で `type="button"` になり `asChild` で link へ合成できること、trigger と個別の操作を同時に置けること、`AttachmentGroup` が複数を含み、名前を持つ `group` になること、a11y 自動検査を確認します。
