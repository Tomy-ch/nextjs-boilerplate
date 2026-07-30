# `.claude/`

Claude Code 向けの設定資産を置く。

| パス | 中身 |
| --- | --- |
| `skills/` | 本リポジトリが著作・保守するスキル。`/<slug>` で起動する（[ADR 0154](../docs/adr/0154-claude-skills-operations.md) / [0155](../docs/adr/0155-claude-skills-development.md)） |
| `agents/` | スキルが呼び出すサブエージェントの定義 |
| `settings.json` | 権限境界（`allow` / `ask` / `deny`）とプラグイン宣言 |

個々のスキル・エージェントの棚卸しはここに手書きしない。`/tool-map` が実体から生成する。

## セットアップ

clone 後に 1 度実行する。手順の全体は [README.md](../README.md) のクイックスタートにある。

### 公式プラグイン

```bash
pnpm exec tsx scripts/bootstrap-plugins.ts
```

project スコープで宣言するため、宣言そのものは `settings.json` に載って clone で届く。上のコマンドは
marketplace の実体をローカルへ解決する。

### 外部スキル

```bash
pnpm exec tsx scripts/bootstrap-external-skills.ts
```

外部スキル = 上流が配布するスキル。プラグインと違い実体が **user スコープ**（`~/.claude/skills/`）へ入るため、
リポジトリを信頼した clone では届かない。**マシンごとに 1 度**実行する。

現在の対象は graphify 1 件。任意であり、実行しなくてもビルド・lint・CI は何も変わらない。

## graphify

リポジトリを tree-sitter でローカル AST 解析して知識グラフ化し、`graphify-out/graph.json` と
`graphify-out/GRAPH_REPORT.md` を出す。`/graphify` で呼ぶ。

- 上流: `Graphify-Labs/graphify`（Apache-2.0）
- PyPI パッケージ名は **`graphifyy`**（y 2 つ）で、CLI 名が `graphify`。取り違えやすいので、手順を書く
  ときは必ず `graphifyy` を使う（理由は [`mise.toml`](../mise.toml) のコメント）
- 版の SSOT は [`mise.toml`](../mise.toml)。bump の検疫は [ADR 0110](../docs/adr/0110-security-operations.md) 1.1

**以下は `mise.toml` で pin している版の挙動**。既定値もサブコマンドも上流の版に紐づくため、pin を
上げたらこの節も突き合わせる（同 1.1 がレビュー項目として要求している）。

### 何がマシンの外へ出るか

既定はローカル完結で、API キーを必要としない。

| ローカル完結 | 外部 LLM API を呼ぶ |
| --- | --- |
| `update`（再抽出）、`query` / `affected` / `god-nodes` / `path` / `explain` / `diagnose` | docs / PDF / 画像の意味抽出、`--mode deep`、`--wiki`、コミュニティ命名（`label` / `cluster-only`） |

左列だけが `settings.json` の `allow` に載っている。右列は opt-in で、都度の確認を通す。

### 使うときの注意

- **導入は上の bootstrap スクリプト経由だけにする。** graphify の `install` 系統はリポジトリの
  `CLAUDE.md` / `AGENTS.md` / `.cursor/` / `.gemini/` / git hook を書き換えうる。`--platform` を
  付ければ user スコープ、という切り分けは成立しない — `--project` を足せば project スコープへ倒れ、
  `--platform cursor` / `--platform gemini` はフラグ無しでもカレントディレクトリを書く。
  `settings.json` の `deny` が `install` 系統を丸ごと塞いでいる
- **`query` は既定 budget（2000 token）で答えを切り詰める。** 切り捨てた側に答えがある場合があり、
  ツール自身がその旨を警告する。網羅性が要る問いには向かない
- **グラフは最後の `update` 時点のスナップショット。** 未コミットの変更は映らない
- **小さな差分では grep のほうが安い。** 輸入元での実測では、狙って書いた grep に対する削減率は
  0.76x〜3.8x 悪化で、主張されている削減は再現しなかった。価値が確認できたのは `affected`
  （relation 付きの推移的な変更影響）
- 出力 `graphify-out/` は追跡外。markdownlint / mermaid-lint / skill-lint の走査からも外してある
  （いずれも `.gitignore` を見ないため）

### 撤去

```bash
graphify uninstall --purge
```

`settings.json` の `deny` に載っているため、**エージェントからは実行できない**（deny は確認を挟まず
拒否する）。人間が自分の端末で直接叩く。Claude Code 以外のプラットフォームへ入れた場合は消し残す
ことがあるので、`~/.codex/skills/graphify/` などは目視で確認する。

リポジトリ側の設定を含めて戻す場合は、導入したコミットを revert すれば足りる。

### インストーラの副作用

`bootstrap-external-skills.ts` は user スコープにしか書かないが、上流のインストーラは
**`~/.claude/CLAUDE.md`（user グローバル）** も作成し、`/graphify` のトリガを登録する。リポジトリの
`CLAUDE.md` / `AGENTS.md` には触らない。
