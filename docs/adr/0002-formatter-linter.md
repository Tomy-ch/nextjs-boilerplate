# フォーマッタ・リンタ管理方針

本プロジェクトでは、JavaScript / TypeScript / JSON / CSS のフォーマッタ兼リンタとして **Biome** を採用する。

本ドキュメントでは、Biome の採用理由および利用方針・運用ルールを定義する。

## Status

Accepted

## 採用理由

### 1. 単一ツールへの集約

従来必要だった以下を Biome 一つで賄える。

- ESLint 系の Linter
- Prettier 系の Formatter
- import の並べ替え (organize imports)

これにより：

- 設定ファイルとプラグイン数の削減
- ツール間の責務重複・競合の解消
- 学習・運用コストの低減

### 2. パフォーマンス

- Rust 実装による高速な lint / format
- 大規模ディレクトリのスキャンや CI 上での実行時間を抑制
- Pre-commit / 保存時の整形でも体感ラグが小さい

### 3. Next.js / React ドメインへの最適化

Biome は `next` / `react` の lint ドメインルールを内蔵しており、以下を標準で検出できる。

- `noNextAsyncClientComponent`
- `noNestedComponentDefinitions`
- その他 React Hooks 関連の代表的ルール

### 4. 設定の見通しの良さ

- `biome.json` 1 ファイルで lint / format / assist / overrides をまとめて管理
- VCS 連携 (`.gitignore` 尊重) も設定ファイル内で完結

## バージョン管理

Biome は npm devDependency として固定する。バージョンは `package.json` の `devDependencies` に明示する。

```json
{
  "devDependencies": {
    "@biomejs/biome": "2.4.10"
  }
}
```

実体は `pnpm install` で取得され、ローカル / CI / Docker いずれでも同一バージョンで動作する（pnpm 採用方針については [0001-package-manager.md](0001-package-manager.md) を参照）。

## 設定方針

`biome.json` の要点は次の通り。詳細は同ファイルを参照すること。

### VCS 連携

- `vcs.enabled = true` / `clientKind = git`
- `useIgnoreFile = true` で `.gitignore` を尊重し、無視対象は二重定義しない

### フォーマッタ

| 項目 | 値 |
| --- | --- |
| インデント | 半角スペース 2 |
| 行幅 | 100 |
| 改行コード | `lf` |
| クォート | `"`（JS / JSX とも） |
| セミコロン | 常時付与 |
| trailing comma | `all` |
| アロー括弧 | 常時付与 |

### Linter

- `recommended: true` を基準に運用
- `next` / `react` ドメインの推奨ルールを有効化
- 追加で有効化：
  - `noConsole: warn`
  - `noExplicitAny: error`
  - `noUnusedImports / noUnusedVariables: error`
  - `noUndeclaredDependencies: error`

### Assist

- 保存時 `organizeImports: on`

### Overrides

- `.vscode/**` … JSON の `allowComments` を有効化（jsonc 用）
- `**/*.d.ts` … `noExplicitAny` を off
- `scripts/**` … `noConsole` / `noExplicitAny` を off（運用スクリプト用）

## 基本コマンド

`package.json` の scripts を経由して実行する。

```bash
# Lint + Format チェック（CI / pre-push 用途）
pnpm lint

# Lint + Format を自動修正
pnpm fix

# Format のみ書き換え
pnpm format
```

直接実行する場合：

```bash
pnpm exec biome check         # lint + format チェック
pnpm exec biome check --fix   # 自動修正
pnpm exec biome format --write
```

## エディタ連携

VSCode を前提に統合を行う。`.vscode/extensions.json` で `biomejs.biome` を推奨拡張に指定し、`.vscode/settings.json` で以下を有効化している。

- `editor.defaultFormatter`: `biomejs.biome`
- 保存時の挙動：
  - `source.fixAll.biome`: `always`
  - `source.organizeImports.biome`: `always`
  - `editor.formatOnSave`: `true`

これにより、保存ごとに整形・import 整理・自動修正が実行される。

## 禁止事項

- ESLint / Prettier の併用は禁止（責務が重複し設定が破綻するため）
- `biome.json` のフォーマッタ・リンタを個別案件理由で一方的に無効化しない（必要なら ADR 改訂で合意する）
- 自動生成物や `node_modules` などは `biome.json` の `files.includes` で除外し、`biome-ignore` コメントの多用は避ける

## 補足

- ルールの追加・無効化が必要になった場合は、まず `overrides` での局所適用を検討し、グローバル変更は最後の手段とする
- バージョン更新時は `pnpm exec biome check` で差分が出ないことを確認し、出る場合は `pnpm fix` で吸収した上で同 PR に整形コミットを含める

## 今後の拡張

- CI で `pnpm lint` を必須化（PR チェックに組み込む）
- pre-commit フック（lefthook 等）導入時は `biome check --staged` を組み込み、整形と Lint を CI と二重化する
