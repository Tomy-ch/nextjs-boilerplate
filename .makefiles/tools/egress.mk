## runner の外向き通信の固定
.PHONY: egress-apply ## 宣言を元に harden-runner の許可リストを workflow へ反映する
.PHONY: egress-check ## workflow が宣言通り固定済みか検証する (書き換えなし・CI / hook 用)

EGRESS := pnpm exec tsx scripts/egress

egress-apply:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@$(EGRESS) apply

egress-check:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@$(EGRESS) check
