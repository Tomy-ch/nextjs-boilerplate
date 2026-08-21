---
test-requirement: unit
coverage-exclusions:
  - ".storybook/css.d.ts"
  - ".storybook/main.ts"
  - ".storybook/manager.ts"
  - ".storybook/msw/handlers.ts"
  - ".storybook/msw/worker.ts"
  - ".storybook/preview.tsx"
---

# .storybook

部品カタログ（Storybook）の設定と、カタログ自身が持つ判定の置き場
（[0054](../docs/adr/0054-ui-catalog-storybook.md)）。story そのものは部品の隣に置き、ここには
置かない。例外は design token の目録で、対象が特定の部品ではなく token の全件であるため
[`design-token.stories.tsx`](design-token.stories.tsx) をここに持つ（配置の根拠は
[`src/components/README.md`](../src/components/README.md)）。

## 構成

| パス | 役割 |
| --- | --- |
| `main.ts` | 読み込む story の範囲・addon・配信する資材 |
| `preview.tsx` | 配色と系統の切り替え、横断 Provider の mount、Server Action の差し替え |
| `manager.ts` | カタログの外枠の見た目 |
| `msw/` | カタログが自分で答える `/api/*`（契約からの生成物ではない。置き場を分ける理由は [`mocks/README.md`](../mocks/README.md)） |
| [`lib/`](lib/) | カタログが持つ判定 —— 表示のための計算、例外の受け止め、横取りの対象判定 |

## テストの責務

frontmatter の `test-requirement: unit` が掛かるのは `lib/` である。

**判定を持つものは `lib/` へ置く。** `main.ts` / `preview.tsx` / `manager.ts` は設定で、読み込まれた
時点で副作用を起こす（資材の複製・書体の class 付与・mock の宣言）ため単体では回せない。`msw/worker.ts`
も同じく、ブラウザの service worker を立てるだけである。設定や配線の中に判定を書くと、そこは検査の
届かない場所になる。

**この配下は丸ごと 1:1 ゲートとカバレッジ母数に乗る**（[`vitest.config.ts`](../vitest.config.ts) /
[`scripts/one-to-one.gate.test.ts`](../scripts/one-to-one.gate.test.ts)）。外れるものは
[`scripts/lib/untested-modules.ts`](../scripts/lib/untested-modules.ts) が理由と撤去条件つきで
宣言する。範囲を狭めて外すと、外した記録がどこにも残らない。
