# design tokens

`tokens/` は design token の SSOT です。値は P3-8 のデザインシステム化で確定するため、現時点では既存画面を壊さない最小値だけを置いています。

## 構成

- `primitives.json`: 色、余白、角丸、フォントなどの基礎値
- `themes.json`: primitive を参照する light / dark の semantic token

どちらも W3C Design Tokens の `$type` / `$value` と alias (`{...}`) を使います。コンポーネントは primitive を直接参照せず、生成される semantic token を使います。

## 面と文字で明度を分ける semantic token

`warning` と `destructive` は、light と dark で**別の明度の primitive を参照**します。ほかの semantic token のように 1 つの色を両テーマで使い回しません。

| | light | dark |
| --- | --- | --- |
| `success` | `green.800`（暗い） | `green.400`（明るい） |
| `success-foreground` | `neutral.0` | `neutral.950` |
| `warning` | `amber.900`（暗い） | `amber.100`（明るい） |
| `warning-foreground` | `neutral.0` | `neutral.950` |
| `destructive` | `red.700`（暗い） | `red.400`（明るい） |
| `destructive-foreground` | `neutral.0` | `neutral.950` |

理由は、これらが**面の色であると同時に文字の色でもある**ためです。`bg-destructive` の面には `destructive-foreground` が乗り、`text-destructive` は背景やその淡い面（`bg-destructive/10`）の上に文字として乗ります。1 つの中間的な明度で両方を満たすことはできません。

中間の明度（`red.600` 相当）を両テーマで共有すると、面としては白文字が乗る一方、文字としては WCAG AA の 4.5:1 を割ります。テーマごとに背景から離れる方向へ振り、対になる `*-foreground` を反転させることで、面と文字の双方が成立します。

**新しく同種の semantic token を足すときも、この形に揃えてください。** `text-*` と `bg-*` は同じ CSS 変数を引くため、変数の差し替えだけで面と文字を分離することはできません。

**段は名前で揃えず、測って選んでください。** `success` の light 側が `green.800` なのは、`destructive` に合わせた `green.700`（#15803d）が**文字として 4.28:1 しか出ず AA を割る**ためです（`neutral.100` の地の上、実測）。`green.800` は面で 7.13:1、文字で 6.09:1 を出し、`destructive` の 6.47 / 5.53 と同じ水準に並びます。色相が変われば同じ段でも輝度は変わるので、対応する段の番号を写すのではなく比を測ります。

## 生成と検査

```sh
pnpm gen:tokens
pnpm check:tokens
```

前者は `src/app/generated/tokens.css` を更新します。後者は更新せず、生成結果との差分があれば失敗します。生成物を手編集してはいけません。

`scripts/gen-tokens.test.ts` は `pnpm test` の実行対象に含まれ、カバレッジゲートにも載ります。生成結果そのものの回帰は `pnpm check:tokens` が CI で守ります。

## 小数を含む段

`--spacing-0.5` のように `.` を含む名前は、CSS のカスタムプロパティ名（ident）としてそのままでは不正です。生成側が `--spacing-0\.5` へエスケープし、Tailwind が出す参照も同じ綴りになります。ビルド済み CSS を文字列で検索するときは、この綴りを前提にしてください。
