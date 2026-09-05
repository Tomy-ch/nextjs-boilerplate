## package.json の版をリリースブランチ名へ合わせるコマンド
# 版の出所はブランチ名（= タグから数えた次の版）1 つで、package.json はそこから導かれる側に置く。
# 焼き込みは release-branch.mk がブランチを切る手順の中で走らせ、ここは手直しと CI の突合の口。
# 何を書くか・何を落とすかは scripts/package-version が持つ（テスト付き）。

.PHONY: version-stamp ## ブランチ名(REF=release/vX.Y.Z)から package.json の version を書き換えます
.PHONY: version-stamp-check ## package.json の version がブランチ名と一致するか検査します

# REF 未指定なら CI の GITHUB_REF_NAME を、それも無ければ手元の現在ブランチを読む。
# pull_request の GITHUB_REF_NAME は `<番号>/merge` で版を名乗らないため、CI 側は base を渡す。
REF ?=
VERSION_REF = $(or $(strip $(REF)),$(GITHUB_REF_NAME),$(shell git rev-parse --abbrev-ref HEAD))

version-stamp:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@pnpm exec tsx scripts/package-version stamp "$(VERSION_REF)"

version-stamp-check:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@pnpm exec tsx scripts/package-version check "$(VERSION_REF)"
