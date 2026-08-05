# Popover

## 用途

trigger の近傍に補足内容や補助操作を開き、画面を離れずに参照・設定できるようにします。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `Popover` | 開閉状態と外側クリック・Escape の interaction を管理する client-side root です。 |
| `PopoverTrigger` | Popover を開閉する trigger です。`Button` や link を使う場合は `asChild` で合成します。 |
| `PopoverContent` | Portal へ表示する内容です。位置は `side` / `align` / `sideOffset` で調整します。 |
| `PopoverAnchor` | 開く操作と位置基準が異なる場合に、位置の基準となる要素を指定します。 |
| `PopoverHeader` | 見出しと説明をまとめる領域です。 |
| `PopoverTitle` | 内容の主題を示す見出しです。 |
| `PopoverDescription` | 見出しを補足する説明文です。 |

## 利用ケース

一覧の絞り込み条件、値の参考情報、補助的な設定など、主導線を離れずに開閉したい内容へ使います。不可逆な操作の確認には使わず、`AlertDialog` を使います。

## 責務境界

位置計算・外側クリック・Escape・focus 管理のため hydration が必要な client island です。表示する文言、取得、業務判断、開閉を URL へ載せるかの選択は持ちません。内容自体に client runtime が要らない場合は、Server Component で組み立てた要素を `children` として渡します。

`PopoverContent` は `role="dialog"` を持つため、`aria-label` または `PopoverTitle` の `id` を指す `aria-labelledby` でアクセシブルな名前を必ず与えます。`PopoverDescription` を添える場合は、その `id` を `aria-describedby` から参照します。popover を開かなければ到達できない情報は支援技術・touch 環境で見落とされるため、操作や判断に不可欠な内容は常時表示または明示的な導線も feature 側に用意します。

面はページ内容の上へ重なるため、背景は `bg-background`、境界は `border-border` の semantic token で不透明に描画します。トークンに定義のない class は Tailwind が CSS を出力せず、面が透明のまま背後の文字と重なって contrast を失います。

vendor は現在 Radix ですが、公開 API に vendor 名は含めません。

## Storybook の a11y panel に出る incomplete

Storybook の a11y panel には `aria-valid-attr-value` が incomplete（要手動確認）として並びます。これは違反ではなく、対処も不要です。

axe は `aria-haspopup` を持つ要素の `aria-controls` について、参照先 ID の実在を確認せず一律で要確認に倒します。「Unable to determine if aria-controls referenced ID exists」は「判定できなかった」ではなく「判定していない」という意味です。trigger の `aria-haspopup="dialog"` と `aria-controls` は ARIA APG に沿った正しい記述で、外すと popover と内容の関連付けが失われます。

axe が人手に委ねた確認は、`aria-controls` が実在する `PopoverContent` の `id` と一致することを検証するテストで代替しています。modal である `AlertDialog` でこの項目が出ないのは、開いている間 trigger が `aria-hidden` の配下に入って走査対象から外れるためで、popover 側の欠陥ではありません。

## Storybook とテスト

Storybook は既定の開閉、開いた状態の見出し・説明、`side` / `align` による配置、form 部品を内容に置く場合、`PopoverAnchor` で基準要素を分ける場合を確認します。テストは開くまで内容を描画しないこと、trigger の `aria-expanded`、`aria-controls` が実在する内容を指すこと、Portal 内容のアクセシブルな名前と説明、面が不透明であること、Escape での閉じ、`PopoverAnchor` の合成、a11y 自動検査を確認します。
