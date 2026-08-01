# design tokens

`tokens/` は design token の SSOT です。値は P3-8 のデザインシステム化で確定するため、現時点では既存画面を壊さない最小値だけを置いています。

## 構成

- `primitives.json`: 色、余白、角丸、フォントなどの基礎値
- `themes.json`: primitive を参照する light / dark の semantic token

どちらも W3C Design Tokens の `$type` / `$value` と alias (`{...}`) を使います。コンポーネントは primitive を直接参照せず、生成される semantic token を使います。

## 生成と検査

```sh
pnpm gen:tokens
pnpm check:tokens
```

前者は `src/app/generated/tokens.css` を更新します。後者は更新せず、生成結果との差分があれば失敗します。生成物を手編集してはいけません。
