# Makefile
.DEFAULT_GOAL := help

# GitHub関連
include .makefiles/github/operation/release-branch.mk
include .makefiles/github/operation/release-tag.mk
include .makefiles/github/setting/github.mk
include .makefiles/github/setting/branch-ruleset.mk
include .makefiles/github/setting/label-setting.mk
include .makefiles/github/lint/actionlint.mk
include .makefiles/github/lint/actions-shellcheck.mk
include .makefiles/github/lint/actions-comment-secret-lint.mk

# ツール関連
include .makefiles/tools/setup.mk
include .makefiles/tools/commitlint.mk
include .makefiles/tools/actions-pin.mk
include .makefiles/tools/gen-api.mk

# テスト関連
include .makefiles/testing/test.mk

# セキュリティ関連
include .makefiles/security/gitleaks.mk
include .makefiles/security/trivy.mk

# 一括実行系ファイル
# GitHub関連
include .makefiles/github/operation/setup-repository.mk

.PHONY: help
help:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@pnpm exec tsx scripts/make-help.ts
