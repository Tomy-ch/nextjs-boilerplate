# パッケージマネージャー管理方針

本プロジェクトでは、Node.js のパッケージマネージャとして **pnpm** を採用する。

本ドキュメントでは、パッケージマネージャの利用方針および運用ルールを定義する。

## 採用理由

### 1. 再現性の担保

pnpm は lockfile（pnpm-lock.yaml）の決定性が高く、以下の環境で同一の依存関係を再現できる。

- ローカル開発環境
- CI/CD
- Docker ビルド環境
- AIエージェントによる実行環境

### 2. 厳格な依存関係管理

pnpm はフラットではない node_modules 構造を採用しており、未宣言依存の利用を防ぐ。

これにより：

- 意図しない依存関係の混入を防止
- モジュール境界の明確化
- 設計品質の向上

### 3. パフォーマンス

- グローバルストアによる高速インストール
- 重複依存の排除によるディスク効率向上
- Docker レイヤーキャッシュとの高い親和性

### 4. モノレポ対応

pnpm workspace により、将来的な構成拡張（モノレポ化）にも対応可能。

## バージョン管理

Node.js および pnpm のバージョンは `mise.toml` で **単一ソース (SSOT)** として宣言する。
ローカル開発では [mise](https://mise.jdx.dev/) を用いてこの宣言通りのバージョンを取得する。
Docker / CI の配送方針はそれぞれのレイヤのネイティブ手段に委ねる（詳細は [0003-version-manager.md](0003-version-manager.md) を参照）。

```toml
# mise.toml
[tools]
node = "24.14.1"
pnpm = "10.33.0"
```

ローカルへのインストールは以下のコマンドで一括実行する。

```bash
mise install
# もしくは
make install-tools
```

## 基本コマンド

### 依存関係インストール

```bash
pnpm install
```

### lockfile を厳密に使用する（CI）

```bash
pnpm install --frozen-lockfile
```

### 依存関係追加

```bash
pnpm add <package>
pnpm add -D <package>
```

## Docker / CI における利用

Docker および CI では、再現性と速度を重視し以下の方式を採用する。

```bash
pnpm fetch
pnpm install --offline --frozen-lockfile
```

> **既知の例外（v0.0.4 時点）:** 現行の `Dockerfile` は `node:22.15.0-alpine` ベースで `npm ci` を利用しており、本 ADR の方針（pnpm 採用 / mise.toml で固定した Node.js バージョンとの整合）を満たしていない。Dockerfile の pnpm 移行および Node バージョン同期は別 PR で実施予定。

## 禁止事項

- npm / yarn の使用は禁止（Dockerfile の暫定例外を除く。上記既知の例外参照）
- lockfile（pnpm-lock.yaml）の手動編集は禁止
- 未宣言依存に依存した実装は禁止

## 補足

pnpm は厳格な依存関係管理を行うため、npm や yarn で動作していたコードがエラーになる場合がある。

その場合は：

- 必要な依存関係を明示的に追加する
- パッケージの依存構造を見直す

## 今後の拡張

- モノレポ構成時は `pnpm workspace` を利用する
- Turborepo / Nx との統合を検討可能
