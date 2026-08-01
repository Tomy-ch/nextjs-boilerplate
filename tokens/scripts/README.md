# token scripts

`tokens/scripts/` は、token SSOT から CSS を生成し、その生成物との一致を検査する責務を持ちます。

## ファイル

- `gen-tokens.ts`: `primitives.json` と `themes.json` から `src/app/generated/tokens.css` を生成し、`--check` 時は差分を検査する
- `gen-tokens.test.ts`: 生成する CSS の契約を検証する

## 実行

```sh
pnpm gen:tokens
pnpm check:tokens
```

前者は追跡対象の生成物を更新します。token を変更したら同じ変更に生成物を含めます。後者は CI でも実行され、生成物が SSOT と一致しない変更を失敗させます。
