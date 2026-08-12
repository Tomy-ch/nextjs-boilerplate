## VRT 基準画像のリポジトリ操作
#
# 基準画像は別リポジトリに置き、vrt/__screenshots__ からサブモジュールとして参照する。
# 置き場側は workflow もルールセットも持たず、更新も掃除もここから流し込む。
# sample:begin
.PHONY: setup-vrt-images ## 基準画像のリポジトリを用意し vrt/__screenshots__ へ配線 (初回のみ)
.PHONY: setup-vrt-app ## 撮り直しに使う GitHub App を secret へ登録 (初回のみ)
# sample:end
.PHONY: vrt-images-prune ## 基準画像の履歴のうち、生きた ref から到達しないものを破棄

# sample:begin
setup-vrt-images:
	@bash scripts/setup/vrt-images/setup-images.sh

setup-vrt-app:
	@bash scripts/setup/vrt-images/setup-app.sh
# sample:end

# 履歴の書き換えは取り消せない。保持すべきコミットの算出と実際の書き換えを 1 コマンドに
# 束ねているのは、算出結果を人が見てから別のコマンドを叩く運用にすると、見た結果と書き換える
# 対象がずれるため。閾値の監視は vrt-images-prune.yaml が受け持ち、実行は必ず人が起こす。
vrt-images-prune:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@pnpm exec tsx scripts/vrt-images prune $(if $(filter 1,$(DRY_RUN)),--dry-run,)
