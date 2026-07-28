## コミットメッセージ検証関連
.PHONY: commitlint ## コミットメッセージを commitlint で検証する (COMMIT_MSG_FILE 未指定時は編集中のコミットメッセージ)

# worktree では .git がファイルのため、実体パスを git に問い合わせる
COMMIT_MSG_FILE ?= $(shell git rev-parse --git-path COMMIT_EDITMSG)

commitlint:
	@mise exec -- pnpm exec commitlint --edit "$(COMMIT_MSG_FILE)"
