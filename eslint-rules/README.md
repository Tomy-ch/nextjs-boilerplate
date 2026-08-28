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
| [`no-captured-bearer-token`](no-captured-bearer-token.ts) | 資格情報の取得口へ渡す掴んだ値。`getBearerToken` は import した口だけ、`bearerToken`（確立中の例外）は囲む関数の引数だけを通す。掴んだ値を渡すと `cookies()` が読まれず、cached scope の防御が黙って外れる（[0112](../docs/adr/0112-data-classification-cache-boundary.md) 決定 5） |
| [`no-internal-anchor`](no-internal-anchor.ts) | 内部リンクの生の `<a href="/...">`。client 遷移と prefetch を失う |
| [`no-markup-outside-ui-layers`](no-markup-outside-ui-layers.ts) | UI を置いてよい層の外にある DOM マークアップ（[`architecture.ts`](../architecture.ts) の `UI_KERNELS`） |
| [`no-raw-font-weight`](no-raw-font-weight.ts) | 太さの直接指定（`font-medium` 等）。書体が持たない段は丸められ強調にならない（[0051](../docs/adr/0051-styling-system.md) §5）。`font-normal` は打ち消しなので対象外 |
| [`no-user-scoped-in-cached-module`](no-user-scoped-in-cached-module.ts) | サーバへ保存されるキャッシュ（`use cache`）を持つモジュールからの、user-scoped な取得の口の import（[0112](../docs/adr/0112-data-classification-cache-boundary.md) 決定 4 の段 2）。判定はモジュール単位で、綴りの宣言を読む（綴りが残っていることは `scripts/scope-spelling.gate.test.ts` が見張る） |

## テストの責務

frontmatter の `test-requirement: unit` はルール本体に掛かる。ルールは判定を 1 つ間違えると
**「検査対象があるのに 0 件で緑」**に倒れ、壊れたことが誰にも見えない。だから
[0090](../docs/adr/0090-testing-strategy.md) はここをカバレッジの母数から外さず、違反する側と
違反しない側の両方を各ルールのテストが持つ。

## 足すとき

まず biome で表現できないことを確かめる。表現できるものを ESLint 側へ足すのは
[0002](../docs/adr/0002-formatter-linter.md) が禁じている。
