> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# token scripts

`tokens/scripts/` は、token SSOT から CSS と TypeScript の定数を生成し、その生成物との一致を検査する責務を持ちます。

## ファイル

- `gen-tokens.ts`: `primitives.json` と `themes/<系統>/<配色>.json` から `src/app/generated/tokens.css` と、`src/model/generated/` の `breakpoint.ts` / `design-token.ts` の 3 本を生成し、`--check` 時は 3 本すべての差分を検査する
- `gen-tokens.test.ts`: 生成する CSS と TypeScript の契約を検証する

## 実行

```sh
pnpm gen:tokens
pnpm check:tokens
```

前者は追跡対象の生成物を更新します。token を変更したら同じ変更に生成物を含めます。後者は CI でも実行され、生成物が SSOT と一致しない変更を失敗させます。
