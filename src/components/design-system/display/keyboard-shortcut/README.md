# KeyboardShortcut

## 用途

キーボードで実行できる操作を、「何が起きるか」と「どのキーか」の対として案内します。キーの表記は閲覧環境に合わせ、Apple では `⌘`、それ以外では `Ctrl` を出します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `KeyboardShortcutList` | 対を並べる `dl` です。並び順・件数・どの操作を載せるかは呼び出し元が決めます。 |
| `KeyboardShortcut` | ひと組の対です。説明を `dt`、キーを `dd` として組にします。 |
| `KeyboardShortcutKeys` | キーだけを表示する client island です。一覧の外でも単体で使えます。 |

`SHORTCUT_MODIFIER` / `SHORTCUT_PLATFORM` / `SHORTCUT_MODIFIER_LABEL` と `shortcutKeyLabel` を `keyboard-shortcut.definition.ts` で公開します。修飾キーに指定できる値の owner はこの定義であり、`"mod"` などの文字列を利用側で直接書きません。

| 修飾キー | Apple | それ以外 |
| --- | --- | --- |
| `mod` | `⌘` | `Ctrl` |
| `alt` | `⌥` | `Alt` |
| `shift` | `⇧` | `Shift` |
| `control` | `⌃` | `Ctrl` |

`mod` は「主となる修飾キー」を表し、`control` は Control そのものを指したい場合に使い分けます。この表に無いキーは受け取った文字列をそのまま表示します。`K` や `Enter` を列挙しないのは、増やし続ける表を持たないためです。

## 利用ケース

- ヘルプや設定画面で、その画面のキー操作を一覧として示す場合
- 操作ボタンの隣にキーを添えて、同じ操作をキーボードからも実行できると示す場合
- 文中で「どのキーを押すか」を示す場合

## 責務境界

**shortcut の登録も keydown の待ち受けも持ちません。** 実際にそのキーで操作できるようにするのは呼び出し元です。この component は案内だけを担うため、載せたキーが実際には効かない状態を防ぐのも呼び出し元の責任です。キーボードから実行できない操作は載せません。

`KeyboardShortcutList` と `KeyboardShortcut` は hydration を必要としない Server Component です。表記の出し分けにだけ閲覧環境の情報が要るため、`KeyboardShortcutKeys` を client island として分けています。

**hydration までは Apple 以外の表記で描画します。** Apple 環境では hydration 後に `Ctrl` から `⌘` へ切り替わります。閲覧環境は server では判らないため、どちらかを最初に出すしかありません。読めない中立表記（`Mod` など）を出すより、多数派の表記で描いてから切り替えるほうが誤読が少ないと判断しています。表記を固定したい場合は `platform` を渡します。

大文字・小文字の見せ方は持ちません。`K` を小文字で渡せば小文字のまま出ます。

**キーだけを置きません。** キーから何が起きるかは推測できないため、`KeyboardShortcut` では説明を必ず `children` に渡します。`KeyboardShortcutKeys` を単体で使う場合も、隣接する文言が何の操作かを伝えます。

キー表示そのものの意味論は `Kbd` が持ちます。この component は `Kbd` / `KbdGroup` を合成し、プラットフォームごとの表記の出し分けだけを引き受けます。

**menu の中のキー表示は各 menu component が持ちます。** `DropdownMenuShortcut` / `MenubarShortcut` / `ContextMenuShortcut` / `CommandShortcut` は `KbdGroup` に menu 内での配置と字送りを与えたもので、この component とは別系統です。menu の項目にキーを添える場合はそちらを使います。

ただしそれらは表記の出し分けを持たず、`⌘` などの記号を呼び出し元が直接書きます。menu の中でも環境に追従させたい場合は、`*Shortcut` の代わりに `KeyboardShortcutKeys` を項目へ直接置き、同じ見た目にするための class を渡します。

```tsx
<DropdownMenuItem>
  設定を開く
  <KeyboardShortcutKeys
    className="ml-auto text-xs tracking-widest text-muted-foreground"
    keys={[SHORTCUT_MODIFIER.MOD, ","]}
  />
</DropdownMenuItem>
```

vendor 依存はありません。

## Storybook とテスト

Storybook は閲覧環境から表記が決まる既定の一覧、`platform` を固定して Apple とそれ以外を並置した比較、修飾キー 4 種と表記の変わらないキー、文中や操作の隣へキーだけを添える場合を確認します。表記の切り替わりは実描画でしか確かめられないため、比較は Storybook 側の確認範囲です。

テストは `dl` / `dt` / `dd` の対応付け、キーが `kbd` 要素として出ること、表記の変わらないキーがそのまま出ること、Apple とそれ以外で修飾キーの表記が変わること、`platform` が閲覧環境より優先されること、修飾キー 4 種の引き当て、押す順のまとまりが一つの `kbd` として公開されること、a11y 自動検査を確認します。server 側で Apple 以外の表記になることは `renderToStaticMarkup` で確認します。jsdom の `navigator.platform` はテスト側で差し替えています。
