# ライブラリ選定・運用方針

本プロジェクトでは、`package.json` の `dependencies` / `devDependencies` に追加する **npm ライブラリの選定・バージョン固定・更新・監査** について本 ADR の方針に従う。

カテゴリ別の推奨スタック（UI / state / form / validation 等）は本 ADR の対象外とし、必要に応じて別 ADR ないし PR の中で個別に判断する。本 ADR は **メタ方針** に絞る。

## Status

Accepted

## 採用理由 / 目的

- ライブラリ追加・更新時に **その都度ゼロから議論しない** ための判断基準を固定したい
- boilerplate として fork 先・将来の自分が「何を確認すれば採用判断ができるか」「どう保守するか」を辿れるようにしたい
- セキュリティ・サプライチェーン観点のミニマムな統制を明文化したい

## 選定基準

新しいライブラリを追加する PR では、以下のチェックを実施し PR 本文に結果を記す。

### 必須

| 観点 | 基準 |
| --- | --- |
| メンテナンス状況 | 直近 6 ヶ月以内に release があり、issue / PR の応答が動いていること |
| ライセンス | MIT / Apache-2.0 / BSD-3-Clause / ISC / 0BSD のいずれか。GPL / AGPL / SSPL / 不明 は採用不可 |
| TypeScript 対応 | 1st-party の型定義同梱、または公式 `@types/*` パッケージが存在し追従していること |
| Next.js / React バージョン整合 | 本プロジェクトの `next` / `react` メジャーバージョン（現在 Next.js 16 / React 19）に対応していること |

### 推奨（採用判断材料）

| 観点 | 確認手段 |
| --- | --- |
| バンドルサイズ | <https://bundlephobia.com/> の minified + gzipped を記録 |
| ESM 対応 | `package.json` の `type: "module"` または `exports` を確認 |
| コミュニティ規模 | npm 週次ダウンロード数 / GitHub star を参考指標として記録（絶対指標としない） |
| 依存数 | `pnpm why <pkg>` で推移依存の範囲を確認、極端に多い場合は代替候補と比較 |
| セキュリティ実績 | npm advisory（`pnpm audit`）に既知の未対応脆弱性が無いこと |

### 採用判断のテンプレ（PR 本文に貼る）

```markdown
## ライブラリ採用チェック

- 対象: <package-name>@<version>
- 用途: <なぜ必要か / 既存依存で代替不可な理由>
- メンテナンス: 直近 release: yyyy-mm-dd / 直近 commit: yyyy-mm-dd
- ライセンス: <SPDX 識別子>
- TS 対応: 1st-party / @types / なし
- Next.js / React 互換: 対応 / 未確認
- バンドルサイズ: minified+gzipped Xkb
- 代替検討: <他に比較した候補と、それを採用しなかった理由>
```

## バージョン固定ポリシー

**原則: コア依存は exact pin、それ以外は caret (`^`)**。

| 区分 | 例 | 指定形式 | 理由 |
| --- | --- | --- | --- |
| ランタイム本体 | `next` / `react` / `react-dom` | exact (`16.2.7` 等) | 破壊的変更の影響範囲が広く、明示的な更新判断を要するため |
| 主要 dev ツール | `@biomejs/biome` / `typescript` | exact | フォーマッタ / 型チェッカの揺らぎを禁ずる |
| その他 dependencies | UI / utility 系 | `^x.y.z` | lockfile (`pnpm-lock.yaml`) で再現性を担保しつつ、パッチ取り込みを軽くする |
| その他 devDependencies | `@types/*` / 補助ツール | `^x.y.z` | 同上 |

**lockfile** (`pnpm-lock.yaml`) は **常に commit する**。手動編集は禁止（ADR 0001 の方針を継承）。

**追加・更新ルール:**

- 新規追加は `pnpm add <pkg>` / `pnpm add -D <pkg>` で行う
- exact pin が必要な場合は `pnpm add -E <pkg>` を使い、`package.json` から `^` を取り除く
- メジャー更新は **必ず別 PR** とし、PR 本文に CHANGELOG の breaking change を引用する
- マイナー / パッチ更新は **複数同時 PR** に集約可（後述「更新・監査サイクル」参照）

## 更新・監査サイクル

定期的に以下を実施する。実施タイミングは個人運用では月次、CI 化する場合は週次が目安。

### 週次〜月次

- `pnpm outdated` で更新候補を一覧化
- `pnpm audit` でセキュリティ警告を確認
- マイナー / パッチ更新を 1 つの「ライブラリ更新 PR」に集約し、CI / 動作確認の上 merge

### 四半期〜半期

- メジャー更新の棚卸し（`pnpm outdated` の `Latest` 列が 1 メジャー以上先のものを抽出）
- それぞれ別 PR で対応。breaking change がある場合は ADR で意思決定（採用継続 / 代替への乗り換え / 機能の削減）

### セキュリティ警告への対応

- `pnpm audit` の `high` 以上は **48 時間以内** に対応着手（更新 / 一時的に依存固定 / 代替へ乗り換え）
- 即時対応できない場合は GitHub issue を立て、mitigation（影響経路 / 緩和策）を文書化

### 補助スキル

- 本リポの `.claude/skills/tools-upgrade/` を利用する場合は、mise.toml 経由のツールに対しても同様の監査を実施

## 採用フロー

1. **提案 PR を立てる**
   - PR 本文に「採用判断のテンプレ」を埋めて貼る
   - 影響範囲（bundle / 型 / 周辺コード）を簡潔に記述
2. **レビュー**
   - 必須チェック項目をすべて満たすか確認
   - 既存依存との重複や、より軽量な代替が無いかを確認
3. **merge**
   - 大規模・方針影響のあるものは別 ADR を起こす（例: 状態管理ライブラリ採用、API クライアント生成方針）

## 禁止事項

- ❌ ライセンスチェックなしで `dependencies` / `devDependencies` を追加すること
- ❌ メジャーアップグレードを他の機能変更と同じ PR に混ぜること
- ❌ `pnpm-lock.yaml` を手動編集すること（ADR 0001 と整合）
- ❌ `npm install` / `yarn add` 等で依存を追加すること（pnpm のみ — ADR 0001 と整合）
- ❌ `pnpm audit` の `high` 以上を放置すること
- ❌ メンテナンスが停止している（直近 1 年以上 release なし、issue 放置）ライブラリを新規採用すること

## 補足

- 「絶対指標」「数値ボーダー」をあえて避けている項目（コミュニティ規模・bundle サイズ等）は、 boilerplate としての汎用性を保つため。実プロジェクトでは独自のしきい値を被せても良い
- 個別ライブラリの採用是非は、本 ADR を参照する PR レビューで判断する。「○○を入れてはいけない」「△△は禁止」といったリストは本 ADR では維持しない
- カテゴリ別の現行採用ライブラリの一覧は `package.json` を一次情報とする。必要なら `docs/dependencies.md` などで補完するが、二重メンテを避けるため本 ADR には書かない

## 関連 ADR

- [0001-package-manager.md](0001-package-manager.md) — pnpm 採用 / lockfile 取り扱い
- [0002-formatter-linter.md](0002-formatter-linter.md) — Biome 採用（dev ツール例）
- [0003-version-manager.md](0003-version-manager.md) — Node / pnpm 本体のバージョン固定（mise.toml）
