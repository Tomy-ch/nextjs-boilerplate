# Architecture Decision Records (ADR)

このディレクトリには、本プロジェクトにおける重要な技術的意思決定を記録する。

## ルール

- 1ファイル = 1意思決定
- 連番で管理する（0001, 0002, ...）
- Status を必ず記載する（Accepted / Superseded など）

## 今後定義する ADR

未着手の意思決定領域は [BACKLOG.md](BACKLOG.md) に網羅・優先度付けで一覧化している。新規 ADR は BACKLOG での合意後に番号を付けて起票する。

## 一覧

- [0001-package-manager.md](0001-package-manager.md) - パッケージマネージャの選定
- [0002-formatter-linter.md](0002-formatter-linter.md) - フォーマッタ・リンタの選定（Biome 採用）
- [0003-version-manager.md](0003-version-manager.md) - Node.js / pnpm のバージョンマネージャ選定（mise 採用）
- [0004-no-docker.md](0004-no-docker.md) - Docker を boilerplate に含めない方針（表示層ロール定義）
- [Toolchain-0005-library-management.md](Toolchain-0005-library-management.md) - ライブラリ選定・運用方針（npm 依存のメタ方針）
- [Dev-0002.md](Dev-0002.md) - Git ブランチ・コミット運用方針
- [Toolchain-0006-git-hooks.md](Toolchain-0006-git-hooks.md) - Pre-commit / Pre-push hook 運用方針 (lefthook 採用)
- [Dev-0003.md](Dev-0003.md) - AGENTS.md 運用方針
- [Dev-0004.md](Dev-0004.md) - Claude スキル運用方針 (運用系)
- [Dev-0005.md](Dev-0005.md) - Claude スキル運用方針 (開発系)
