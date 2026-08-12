## container image の digest ピン
.PHONY: images-pin-resolve ## image:tag を digest へ解決しロックファイルを更新する
.PHONY: images-pin-apply ## ロックファイルを元に image 参照を digest へ固定する
.PHONY: images-pin-check ## image 参照がロックファイル通り固定済みか検証する (書き換えなし・CI / hook 用)

# 供給網検疫。公開から N 日未満の digest は採用せず、既存ピンがあればそれを維持する (0 で無効)。
IMAGES_PIN_MIN_AGE_DAYS ?= 14

IMAGES_PIN := pnpm exec tsx scripts/images-pin

images-pin-resolve:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@$(IMAGES_PIN) resolve --min-age-days=$(IMAGES_PIN_MIN_AGE_DAYS)

images-pin-apply:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@$(IMAGES_PIN) apply

images-pin-check:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@$(IMAGES_PIN) check
