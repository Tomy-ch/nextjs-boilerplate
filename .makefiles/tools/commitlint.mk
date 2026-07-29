## コミットメッセージ検証関連
.PHONY: commitlint ## コミットメッセージを commitlint で検証する (COMMIT_MSG_FILE 未指定時は編集中のコミットメッセージ)

# worktree では .git がファイルのため、実体パスを git に問い合わせる
COMMIT_MSG_FILE ?= $(shell git rev-parse --git-path COMMIT_EDITMSG)

commitlint:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@pnpm exec commitlint --edit "$(COMMIT_MSG_FILE)"
