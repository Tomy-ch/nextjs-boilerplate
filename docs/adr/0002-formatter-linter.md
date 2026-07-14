# フォーマッタ・リンタ管理方針

本プロジェクトでは、JavaScript / TypeScript / JSON / CSS のフォーマッタ兼リンタとして **Biome** を主軸に採用する。

原則は「**biome 優先、biome で対応できない検査のみ ESLint で補完する**」。フォーマットおよび biome が表現できる lint 検査はすべて biome が担い、biome で表現できない検査（層境界の import 検査等）に限り、ESLint を補完として利用する。フォーマッタは biome 単独であり、Prettier は採用しない。

本ドキュメントでは、Biome の採用理由、ESLint 補完利用の条件、および利用方針・運用ルールを定義する。

## Status

Accepted（採番はブロック帯で確定〈2026-07-14・0001〜0155(トピック順ブロック帯)〉）

> 本 ADR は 0.0.x の living document。設計フェーズ中は本文を直接上書きし、逐次改定の履歴は残さない(不可変化 + 改定履歴の規律は v1 凍結時から。docs/plan/pre-implementation-decisions.md 決定 5)。

## 採用理由

### 1. 単一ツールへの集約（原則）

従来必要だった以下を Biome 一つで賄える。

- ESLint 系の Linter
- Prettier 系の Formatter
- import の並べ替え (organize imports)

これにより：

- 設定ファイルとプラグイン数の削減
- ツール間の責務重複・競合の解消
- 学習・運用コストの低減

ただし「単一ツール」は目的ではなく手段である。層境界の import 検査（「import する側の層」を文脈に取る depguard / boundaries 型の検査）のように、**biome が現時点で表現できず、かつ本 boilerplate の構造安全性の核となる検査**まで放棄はしない。この隙間に限り ESLint で補完する（後述「ESLint による補完」）。

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

- `biome.json`（簡易版 / エディタの基点）に lint / format / assist / overrides を集約
- CI / pre-commit 用の完全版 `biome.ci.jsonc` は `extends` で簡易版を継承し、差分のみを持つ（設定を二重管理しない）
- VCS 連携 (`.gitignore` 尊重) も設定ファイル内で完結

## ESLint による補完

### 役割分担（能力ベース・重複禁止）

どちらのツールに検査を置くかは、**「biome がその検査を表現できるか」のみ**で決める（能力ベース）。好み・慣れ・プリセットの都合で ESLint 側に置いてはならない。

| 責務 | 担当 |
| --- | --- |
| フォーマット | biome 単独（ESLint のフォーマッタ機能は使わない） |
| import 整理 (organize imports) | biome（assist） |
| biome が表現できる lint 検査 | biome（簡易版 / 完全版のプロファイル配置は「設定方針」参照） |
| biome で表現できない検査 | ESLint |

- **重複禁止**: 同じ検査を両方のツールに持たせない
- **biome が実装済みのルールは biome 側で有効化して使う**。「biome にルールは存在するが有効化していない」状態を理由に ESLint へ置くことは能力ベースに反する（例: import の循環検出は biome の `noImportCycles` を完全版で有効化済みのため、ESLint に持たせない）
- **縮小方向での運用**: biome が対応した検査は ESLint から削除し biome へ移管する。ESLint 側は常に「biome の隙間」だけを持つ

### 現時点で ESLint 側に置く検査

- **層境界の import 検査**（eslint-plugin-boundaries 等）。biome の `noRestrictedImports` + `overrides` では「import する側の層」を文脈に取る検査を表現できないため、現時点で biome 非対応の代表例である（`noImportCycles` が検出するのは循環のみで、層の依存方向違反は検出できない）
- 具体プラグインの選定と層定義マッピングは、フロント内責務分離の ADR（[0021](0021-frontend-responsibility.md) = BACKLOG A3）の Enforcement 節で定める（2026-07-12 Accepted。プラグインは `eslint-plugin-boundaries`、層定義は同 ADR の依存マトリクス）。A3 が Accepted になった時点で、`eslint.config.mjs` の具体記述を伴う ESLint 実導入 PR を立てられる

### ESLint 利用の条件

ESLint およびそのルールをリポジトリに追加してよいのは、以下をすべて満たす場合のみ。

1. **biome 非対応の検査であること**（能力ベース）。PR 本文に「biome で表現できないこと」の確認結果（該当ルールの有無・issue 等）を記す
2. **stylistic / フォーマット系ルール、biome と重複する汎用ルールを入れない**。`eslint:recommended` / `eslint-config-next` 等のプリセット一括適用は行わない（biome の `next` / `react` ドメインおよび recommended ルール群と重複するため）。ルール単位の opt-in のみとする
3. **flat config（`eslint.config.mjs`）で管理する**。Next.js 16 では `next lint` が廃止され `next build` も lint を実行しないため、ESLint CLI を直接実行する
4. **ESLint 本体・プラグインは devDependency として exact pin し、追加時に `pnpm audit` を実施する**（[0004](0004-library-management.md) の主要 dev ツール扱い）
5. **biome が該当検査に対応した時点で ESLint 側から削除し biome へ移管する**。対応状況の確認は 0004 の定期監査サイクル（`pnpm outdated` の週次〜月次確認）および biome バージョン更新 PR のチェック項目に組み込む

## バージョン管理

Biome は npm devDependency として固定する。バージョンは `package.json` の `devDependencies` に明示する。

```json
{
  "devDependencies": {
    "@biomejs/biome": "2.5.3"
  }
}
```

実体は `pnpm install` で取得され、ローカル / CI いずれでも同一バージョンで動作する（pnpm 採用方針については [0001-package-manager.md](0001-package-manager.md) を参照）。

ESLint を導入する際も同様に、本体・プラグインとも devDependency の exact pin とする（0004）。

## 設定方針

`biome.json` の要点は次の通り。詳細は同ファイルを参照すること。

### プロファイル分割（簡易版 / 完全版）

保存時の即時フィードバックと、commit / CI での厳格な検査を両立するため、設定を 2 プロファイルに分ける。

| プロファイル | ファイル | 用途 | 実行 |
| --- | --- | --- | --- |
| 簡易版 | `biome.json` | エディタ保存時（format / organize imports / safe fix）。canonical 名のため biome / エディタが自動採用 | `pnpm lint` |
| 完全版 | `biome.ci.jsonc` | CI / pre-commit。簡易版を `extends` し重いルールを上乗せ、warn もブロック | `pnpm lint:ci` |

- 完全版は `extends: ["./biome.json"]` で簡易版を継承し、**差分ルールのみ**を記述する
- 完全版でのみ `noImportCycles`（`project` ドメイン = 複数ファイル走査で重い）を有効化し、保存時の負荷を避ける
- 完全版は `--error-on-warnings` 付きで実行し、簡易版では warn 表示に留まるルールを CI / pre-commit ではブロック（exit code）に昇格させる
- `biome.ci.jsonc` は canonical 名ではないため、エディタは自動採用しない（`--config-path` 明示時のみ有効）
- hook / CI からの実行フローは [0151-git-hooks.md](0151-git-hooks.md) を参照

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

- `preset: "recommended"` を基準に運用（旧 `recommended: true` から 2.5 系で書式移行）
- `next` / `react` ドメインの推奨ルールを有効化
- 追加で有効化（簡易版 = `biome.json`）：
  - `noConsole: warn`
  - `noExplicitAny: error`
  - `noUnusedImports / noUnusedVariables: error`
  - `noUndeclaredDependencies: error`
  - バグ性検出（2.5.3 更新時に追加, `error`）：`noConstantBinaryExpressions` / `noLeakedRender` / `noComponentHookFactories`
  - バグ性検出（同, `warn`）：`noReactForwardRef` / `noNestedPromises` / `noShadow` / `useIframeSandbox` / `noJsxLeakedDollar`
  - 既定 severity 追従（`"on"`）：`noVar` / `noAlert` / `noReturnAssign` / `useUniqueElementIds` ほか計 20 ルール（全量は `biome.json` を参照）
- 完全版のみで有効化（`biome.ci.jsonc`）：
  - `noImportCycles: error`

### Assist

- 保存時 `organizeImports: on`

### Overrides

- `.vscode/**` … JSON の `allowComments` を有効化（jsonc 用）
- `**/*.d.ts` … `noExplicitAny` を off
- `scripts/**` … `noConsole` / `noExplicitAny` を off（運用スクリプト用）
- `public/**` … `noSvgWithoutTitle` を off（静的 SVG アセットは使用側の `alt` で代替テキストを担保。2.5 系で SVG 単体ファイルが lint 対象化したため）

### ESLint（`eslint.config.mjs` — 補完分・導入は A3 Accepted 後）

- flat config 1 ファイル（`eslint.config.mjs`）で管理する
- 置くのは「ESLint 利用の条件」を満たす補完検査（現時点では層境界検査）のみ。formatter 連携・stylistic 系・biome 重複ルールは設定しない
- 実行はプロファイル分割の**完全版フロー側**（pre-commit / CI = `pnpm lint:ci`）に直列で組み込む。層境界検査は TS resolver を伴い保存時実行には重いため、エディタでは拡張の診断並走のみとする
- ignore 対象（`.next/` / `out/` / 生成物等）を flat config 内で宣言し、biome の除外方針と食い違わせない
- 各ルールには「なぜ biome で表現できないか」を示すコメントを付し、移管判定を容易にする

## 基本コマンド

`package.json` の scripts を経由して実行する。

```bash
# Lint + Format チェック（簡易版 / エディタ相当）
pnpm lint

# Lint（完全版 / CI・pre-commit 用。warn もブロック）
pnpm lint:ci

# Lint + Format を自動修正
pnpm fix

# Format のみ書き換え
pnpm format
```

直接実行する場合：

```bash
pnpm exec biome check                                              # lint + format チェック（簡易版）
pnpm exec biome check --config-path=./biome.ci.jsonc --error-on-warnings  # 完全版
pnpm exec biome check --fix                                        # 自動修正
pnpm exec biome format --write
pnpm exec eslint .                                                 # 補完検査（ESLint 導入後）
```

ESLint 導入 PR では `lint:eslint`（`eslint .`）を scripts に追加し、`lint:ci` に直列で組み込む（`lint:ci` = biome 完全版 → ESLint）。**導入までは現行の scripts のまま**とする（`pnpm lint` / `pnpm lint:ci` は biome のみ）。境界検査系ルールは auto-fix をほぼ持たないため、`pnpm fix` は biome のみで変更しない。

## エディタ連携

VSCode を前提に統合を行う。`.vscode/extensions.json` で `biomejs.biome` を推奨拡張に指定し、`.vscode/settings.json` で以下を有効化している。

- `editor.defaultFormatter`: `biomejs.biome`
- `eslint.format.enable`: `false`（フォーマッタは biome 単独。ESLint のフォーマッタ機能は無効のまま）
- 保存時の挙動（`editor.codeActionsOnSave` に併記）：
  - `source.fixAll.biome`: `always`
  - `source.organizeImports.biome`: `always`
  - `source.fixAll.eslint` を併記（境界系ルールは auto-fix をほぼ持たないため、biome の整形と衝突しない）
  - `editor.formatOnSave`: `true`

これにより、保存ごとに整形・import 整理・自動修正は biome（簡易版 `biome.json` を自動採用）が担い、ESLint は補完検査の診断を並行表示する。保存時は完全版の重いルールを実行しない。

なお、`dbaeumer.vscode-eslint` の `.vscode/extensions.json` への推奨追加は ESLint 導入 PR で行う。`.vscode/settings.json` 側の ESLint 関連設定は導入前から置いてよい（拡張未導入時は単に無効なだけで、biome の動作に影響しない）。

## 禁止事項

- Prettier の併用は禁止（フォーマッタは biome 単独）
- ESLint をフォーマッタとして使うことは禁止（`eslint.format.enable` の有効化 / stylistic・フォーマット系ルールの導入を含む）
- biome が表現できる検査を ESLint 側に置くことは禁止（能力ベース・重複禁止。「ESLint 利用の条件」を満たさない ESLint ルール追加はすべて本 ADR 違反）
- `eslint:recommended` / `eslint-config-next` 等のプリセット一括適用は禁止（ルール単位 opt-in のみ）
- `biome.json` のフォーマッタ・リンタを個別案件理由で一方的に無効化しない（必要なら ADR 改訂で合意する）
- 自動生成物や `node_modules` などは `biome.json` の `files.includes` / `eslint.config.mjs` の ignore で除外し、`biome-ignore` / `eslint-disable` コメントの多用は避ける
- 完全版 `biome.ci.jsonc` に簡易版と重複するルールをコピーしない（`extends` の差分のみを記述する）

## 補足

- ルールの追加・無効化が必要になった場合は、まず `overrides`（biome）/ ファイルスコープ設定（ESLint flat config）での局所適用を検討し、グローバル変更は最後の手段とする
- バージョン更新時は `pnpm exec biome check` で差分が出ないことを確認し、出る場合は `pnpm fix` で吸収した上で同 PR に整形コミットを含める。biome 更新 PR では、ESLint 側に残している検査の biome 対応状況（移管可否）も併せて確認する
- nursery ルールはバージョン更新で挙動・所属グループが変わり得る。exact pin 運用（[0004-library-management.md](0004-library-management.md)）を前提に、更新 PR で差分を確認する
- `process.env` 直読禁止のような **biome で表現できる規約は biome 側（`noProcessEnv` 等）に置き、ESLint には置かない**（能力ベースの適用例。有効化は環境変数管理の ADR = BACKLOG A7 とセットで行う）
- ESLint の導入自体は本 ADR が直接トリガーしない。層境界検査の中身（プラグイン・層定義）が A3 ADR で確定した時点で、0004 の採用フロー（採用チェック + `pnpm audit`）に従い導入 PR を立てる

## 今後の拡張

- CI で完全版 `pnpm lint:ci` を必須化（PR チェックに組み込む。CI 構成自体は BACKLOG B9 で決定）
- pre-commit / pre-push フック（lefthook）は導入済み。段階責務は [0151-git-hooks.md](0151-git-hooks.md) を参照。ESLint 追加後に pre-commit の速度目標（< 5 秒）を超える場合の退避ルールも同 ADR に定める
- 層境界検査の具体設定（プラグイン選定・層定義マッピング）は [0021](0021-frontend-responsibility.md)（A3）の Enforcement 節で定義済み（`eslint-plugin-boundaries` + 依存マトリクス）。残る `eslint.config.mjs` の記述は実導入 PR で行う

## 関連 ADR

- [0001-package-manager.md](0001-package-manager.md) — pnpm 採用 / lockfile 取り扱い
- [0004-library-management.md](0004-library-management.md) — ESLint 本体・プラグインの exact pin / `pnpm audit` / 移管判定の定期監査
- [0151-git-hooks.md](0151-git-hooks.md) — `pnpm lint:ci` を呼ぶ pre-commit / pre-push の運用
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — ESLint 層境界検査のプラグイン選定（`eslint-plugin-boundaries`）と層定義マッピング（Enforcement 節）
