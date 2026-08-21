---
test-requirement: unit
---

# eslint-rules

biome が表現できない検査だけを持つ自作 ESLint ルールの置き場
（[0002](../docs/adr/0002-formatter-linter.md) の能力ベース分担）。適用は
[`eslint.config.ts`](../eslint.config.ts) が `project-rules/<ルール名>` として行う。

## 置いているルール

| ルール | 検査するもの |
| --- | --- |
| [`no-anonymous-default-export`](no-anonymous-default-export.ts) | 名前を持たない default export。1:1 ゲートが `describe` で指せる名前を要求する（[0090](../docs/adr/0090-testing-strategy.md)） |
| [`no-internal-anchor`](no-internal-anchor.ts) | 内部リンクの生の `<a href="/...">`。client 遷移と prefetch を失う |
| [`no-markup-outside-ui-layers`](no-markup-outside-ui-layers.ts) | UI を置いてよい層の外にある DOM マークアップ（[`architecture.ts`](../architecture.ts) の `UI_KERNELS`） |

## テストの責務

frontmatter の `test-requirement: unit` はルール本体に掛かる。ルールは判定を 1 つ間違えると
**「検査対象があるのに 0 件で緑」**に倒れ、壊れたことが誰にも見えない。だから
[0090](../docs/adr/0090-testing-strategy.md) はここをカバレッジの母数から外さず、違反する側と
違反しない側の両方を各ルールのテストが持つ。

## 足すとき

まず biome で表現できないことを確かめる。表現できるものを ESLint 側へ足すのは
[0002](../docs/adr/0002-formatter-linter.md) が禁じている。
