## ツール関連
.PHONY: install-tools ## 開発に必要なツールをインストールする

install-tools:
	@echo "🔄 Installing tools..."
	@corepack enable
	@COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack prepare pnpm@latest --activate
	@pnpm -v
	@echo "✅ Tools installed successfully."
