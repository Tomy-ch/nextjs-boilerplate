## GHのラベルを操作する
.PHONY: create-default-labels ## .github/settings/labels.json に基づいてラベルを作成
.PHONY: delete-all-labels ## すべてのラベルを削除（既存ラベル含む）

# 宣言の解釈と、宣言と実在の差分は scripts/github-settings/labels.ts が持つ。
GITHUB_SETTINGS := pnpm exec tsx scripts/github-settings

delete-all-labels:
	@$(GITHUB_SETTINGS) delete-all

create-default-labels:
	@$(GITHUB_SETTINGS) create
