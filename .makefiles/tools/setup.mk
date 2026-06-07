## ツール関連
.PHONY: install-tools ## mise.toml に基づき Node.js / pnpm をインストールする

install-tools:
	@echo "🔄 Installing tools via mise..."
	@command -v mise >/dev/null 2>&1 || { echo "❌ mise がインストールされていません。https://mise.jdx.dev/ を参照してください。"; exit 1; }
	@mise trust --quiet
	@mise install
	@echo "✅ Tools installed successfully."
	@mise exec -- node --version
	@mise exec -- pnpm --version
