# List

## 用途

同型の行を縦に並べ、アイコン・見出し・説明・補助操作を一貫した構造で表示します。

## 役割と公開 component

| Component / 値 | 役割 |
| --- | --- |
| `List` | `ul` を render する一覧の root です。`asChild` で `ol` へ合成します。 |
| `ListItem` | `li` を render する行です。`variant` で面の見せ方、`size` で余白を選びます。 |
| `ListItemLink` | 行全体を遷移先にする link です。`li` を保ったまま行を操作対象にします。 |
| `ListItemMedia` | 行の先頭に置くアイコンや画像です。`variant` で `icon` / `image` の枠を選びます。 |
| `ListItemContent` | 見出しと説明をまとめる領域です。 |
| `ListItemTitle` | 行の主題です。 |
| `ListItemDescription` | 主題を補足する説明文です。2 行で切り詰めます。 |
| `ListItemActions` | 行の末尾に置く補助操作の領域です。 |
| `ListItemHeader` / `ListItemFooter` | 行の上下へ添える補足行です。 |
| `ListSeparator` | 行の間に置く区切りです。`li` として置き、読み上げ対象から外します。 |

`LIST_ITEM_VARIANT` / `LIST_ITEM_SIZE` / `LIST_ITEM_MEDIA_VARIANT` は `list.definition.ts` が owner です。

## 利用ケース

設定一覧、通知一覧、検索結果など、同じ形の行が繰り返し並ぶ場面に使います。順序に意味がある手順一覧では `asChild` で `ol` へ合成します。

## Card / Table との使い分け

| | 使う場面 |
| --- | --- |
| `List` | 「アイコン + 見出し + 説明 + 操作」の**行**が縦に並ぶ |
| `Card` | 関連する情報と操作を囲う**塊**。項目ごとに構造が異なってよい |
| `Table` | 列が揃った**表**。項目間で同じ属性を比較する |

比較のために列を揃えたいなら `Table`、行として読ませたいなら `List` です。

## 構造

`List` が `ul`、`ListItem` が `li` を render します。呼び出し元が `li` を書く必要はなく、`ul` の意味論も崩れません。

```tsx
<List>
  <ListItem>
    <ListItemMedia variant={LIST_ITEM_MEDIA_VARIANT.ICON}>
      <BellIcon />
    </ListItemMedia>
    <ListItemContent>
      <ListItemTitle>通知</ListItemTitle>
      <ListItemDescription>新着や状態の変化をお知らせします。</ListItemDescription>
    </ListItemContent>
    <ListItemActions>
      <SwitchNative aria-label="通知を受け取る" />
    </ListItemActions>
  </ListItem>
</List>
```

行全体を遷移先にする場合は、`ListItem` を link に差し替えず `ListItemLink` を子に置きます。`li` を失うと `ul` の意味論が崩れるためで、`BreadcrumbLink` / `PaginationLink` と同じ役割分担です。

```tsx
<ListItem>
  <ListItemLink asChild>
    <Link href="/settings/notifications">…</Link>
  </ListItemLink>
</ListItem>
```

`ListSeparator` は `li` として render します。`ul` の直下に `hr` は置けないためで、`BreadcrumbSeparator` と同じ扱いです。

## 責務境界

行の内容、遷移先、操作の実行、並び順、件数の判断は持ちません。業務型も持たず、必要な要素を呼び出し元が子として渡します。

行が入力を持つ場合も、行そのものを入力用の部品にはしません。`Label` と `Input` を行の中で合成します（Storybook の `WithInputs` が例です）。行の追加・削除と保存は feature が所有します。`editable-table` が同じ責務境界を持っており、表と一覧で判断を割りません。

## 上流との対応

registry item は `item` です。この repo では `*Item` が「集合の要素」を指す語として 17 component で使われているため、単独の `Item` は意味が衝突します。root を `List`、行を `ListItem` とすることで `BreadcrumbItem` / `PaginationItem` / `NavigationMenuItem` と同じ形に揃えました。対応は `shadcn-manifest.yaml` の `directory` / `localPath` が宣言します。

上流の `ItemGroup` は `role="list"` を持つ `div` でしたが、子が `listitem` にならず `aria-required-children` に違反していました。`ul` / `li` を素直に render することで構造的に解消しています。

## Storybook とテスト

Storybook は基本構成と区切り、行全体を link にする場合、行が入力を持つ場合、面の見せ方、余白の大きさ、header と footer を持つ場合、`ol` へ合成した順序つき一覧を確認します。テストは `ul` / `li` の意味論、行の各領域の合成、`variant` / `size` の data 属性と既定値、link にしても `li` を失わないこと、`asChild` を使わない外部リンク、区切りが読み上げ対象から外れること、`ol` への合成、header / footer の配置、a11y 自動検査を確認します。
