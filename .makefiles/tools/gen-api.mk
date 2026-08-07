## API 契約の取り込み
.PHONY: fetch-api ## openapi/sources.yaml の座標から契約を取得し blob SHA をスタンプする

# 取得対象の契約名。省略時は sources.yaml の全件を取得する (例: make fetch-api NAME=auth)。
NAME ?=

fetch-api:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@command -v gh >/dev/null 2>&1 || { echo "❌ gh が PATH にありません。GitHub CLI をインストールし gh auth login を済ませてください。"; exit 1; }
	@pnpm exec tsx scripts/openapi/fetch-api.ts $(if $(strip $(NAME)),"$(strip $(NAME))")
