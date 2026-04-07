# ---------------------------------------
# Tool
# ---------------------------------------
## ツール関連
.PHONY: activate-tools ## 開発に必要なツールを有効化する
.PHONY: install-tools ## 開発に必要なツールをインストールする

activate-tools: install-tools
	@echo "🔄 Activating tools..."
	@corepack enable
	@echo "✅ Tools activated successfully."

install-tools:
	@echo "🔄 Installing tools..."
	OREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm -v
	@echo "✅ Tools installed successfully."
