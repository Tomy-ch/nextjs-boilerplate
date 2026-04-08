## ツール関連
.PHONY: sync-tools ## ツールのバージョンを tools.yaml と同期する
.PHONY: install-tools ## 開発に必要なツールをインストールする

sync-tools:
	@echo "🔧 ツールのバージョンを tools.yaml と同期中..."
	@node scripts/replace-tools-version.mjs
	@echo "✅ ツールのバージョンの同期が完了しました。再度 make install-tools を実行してツールをインストールしてください。"

install-tools:
	@echo "🔄 Installing tools..."
	@corepack enable
	@COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack prepare pnpm@latest --activate
	@pnpm -v
	@echo "✅ Tools installed successfully."
