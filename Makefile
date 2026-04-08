# Makefile
.DEFAULT_GOAL := help

# GitHub関連
include .makefiles/github/operation/release-branch.mk
include .makefiles/github/operation/release-tag.mk
include .makefiles/github/setting/github.mk
include .makefiles/github/setting/branch-ruleset.mk
include .makefiles/github/setting/label-setting.mk

# ツール関連
include .makefiles/tools/setup.mk

# 一括実行系ファイル
# GitHub関連
include .makefiles/github/operation/setup-repository.mk

.PHONY: help
help:
	@bash scripts/make_help.sh
