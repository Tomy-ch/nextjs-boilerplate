## setup-mise の版 / digest / キャッシュキーの整合 Lint
# mise 自身の版は mise.toml に書けないため (あれは mise が解決する対象の宣言)、宣言は
# composite action の中だけにある。`with:` からステップの `env:` を参照できない制約で、
# キャッシュキーが同じ値を二度目に持つ。片方だけ直した状態は落ちるが原因が遠いので、
# 揃っていることを検査する。整合違反は exit 1、検査が成立していない状態は exit 2。
.PHONY: actions-mise-pin-lint ## setup-mise の版 / digest / キャッシュキーが揃っているか検査

ACTIONS_MISE_PIN_LINT := pnpm exec tsx scripts/actions-mise-pin-lint

actions-mise-pin-lint:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@$(ACTIONS_MISE_PIN_LINT)
