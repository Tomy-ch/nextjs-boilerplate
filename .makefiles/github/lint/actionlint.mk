## GitHub Actions 定義の Lint
.PHONY: actionlint ## .github/workflows のワークフロー定義を actionlint で検査

WORKFLOW_DIR := .github/workflows

actionlint:
	@command -v actionlint >/dev/null 2>&1 || { echo "❌ actionlint が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@if [ ! -d "$(WORKFLOW_DIR)" ]; then \
		echo "🟡 $(WORKFLOW_DIR) が存在しないため検査をスキップします。"; \
	else \
		echo "🔍 Linting GitHub Actions workflows..."; \
		actionlint && echo "✅ actionlint passed."; \
	fi
