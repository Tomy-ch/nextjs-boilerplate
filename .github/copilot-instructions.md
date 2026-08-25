# GitHub Copilot への指示

本リポジトリでの Copilot の動き方を定める。

## 正は AGENTS.md 1 本

**規約・アーキテクチャ制約・変更してよい範囲・Git 運用・出力言語は、すべて
[`AGENTS.md`](../AGENTS.md) が持つ。**本書はそれを指すだけで、内容を持たない。

内容を持たないのは体裁の話ではない。**同じ規則を 2 箇所に書くと、片方だけが古くなる。**しかも
ずれた側は「Copilot だけが読む規約」として生き残り、[0027](../docs/adr/0027-directory-structure.md)
が禁じる汎用フォルダを許可するような、ADR と正面から食い違う指示になる。参照に徹する形なら、
この種のずれは構造的に起こらない。

したがって **本書に規約を書き足さない。** 書きたくなったものは AGENTS.md か ADR へ置く。

## 読む順

`AGENTS.md`「Instruction Priority」が定める順に従う。本書はその 4 番目であり、
上位（`AGENTS.md` / `docs/adr/**` / `docs/adr/BACKLOG.md`）と食い違ったときは上位が勝つ。

読む先は次の 4 つで足りる。

| 何を知りたいか | 読む先 |
| --- | --- |
| 層の責務・依存の向き・カーネルの置き場 | [`AGENTS.md`](../AGENTS.md) の ADR 一覧から該当 ADR |
| 変更してよいパス | `AGENTS.md`「AI Modification Scope」 |
| ブランチ・コミット・PR の作法 | `AGENTS.md`「Git Rules」と [0150](../docs/adr/0150-git-workflow.md) |
| 日常的に守る実装規則 | [`docs/rules.md`](../docs/rules.md) |

## Copilot 固有の運用

AGENTS.md に書かれていない、この器だけの事情を置く。

- **ブランチ保護の実体は [`settings/branch-protection.json`](settings/branch-protection.json) が持つ。**
  Copilot は保護ブランチへ直接コミットせず、必ず feature ブランチを切る。承認を待たずに merge しない
- **PR ブランチへ積んだ後は止まる。** push するかは人が決める（`AGENTS.md`「Git Rules」3）
- **コードレビューのコメントも日本語で書く**（`AGENTS.md`「Language Rules」）
