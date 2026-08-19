## 基準画像のリポジトリ操作
#
# 基準画像は別リポジトリに置き、baseline/images からサブモジュールとして参照する。
# story 単位と画面単位の双方が 1 つを共有する (baseline/README.md)。
# 置き場側は workflow もルールセットも持たず、更新も掃除もここから流し込む。
.PHONY: setup-baseline-store ## 基準画像のリポジトリを用意し baseline/images へ配線 (張り替えも可)
.PHONY: setup-baseline-app ## 撮り直しに使う GitHub App を secret へ登録
.PHONY: baseline-prune ## 基準画像の履歴のうち、生きた ref から到達しないものを破棄

setup-baseline-store:
	@pnpm exec tsx scripts/setup/baseline-store images

setup-baseline-app:
	@pnpm exec tsx scripts/setup/baseline-store app

# 履歴の書き換えは取り消せない。保持すべきコミットの算出と実際の書き換えを 1 コマンドに
# 束ねているのは、算出結果を人が見てから別のコマンドを叩く運用にすると、見た結果と書き換える
# 対象がずれるため。閾値の監視は baseline-prune.yaml が受け持ち、実行は必ず人が起こす。
baseline-prune:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@pnpm exec tsx scripts/baseline-store prune $(if $(filter 1,$(DRY_RUN)),--dry-run,)
