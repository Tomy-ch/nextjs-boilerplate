## package.json の版をリリースブランチ名へ合わせるコマンド
# 版の出所はリリースブランチ名（= タグから数えた次の版）1 つで、package.json はそこから導かれる
# 側に置く。焼き込みは release-branch.mk がブランチを切る手順の中で走らせ、ここは手直しと
# CI の突合の口。何を書くか・何を落とすかは scripts/package-version が持つ（テスト付き）。

.PHONY: version-stamp ## ブランチ名(REF=release/vX.Y.Z)から package.json の version を書き換えます
.PHONY: version-stamp-commit ## 同じ焼き込みを、変わったときだけコミットまで行います(リリース手順用)
.PHONY: version-stamp-check ## package.json の version がブランチ名と一致するか検査します

REF ?=

# ブランチ名は recipe 行へ展開せず、環境変数として渡す。make の変数はシェルへ渡る前にテキスト
# 置換されるため、`"` や `;` を含むブランチ名（git は許す）でクォートが破れ、任意のコマンドが走る。
# REF 未指定のときの取り回し（GITHUB_REF_NAME → 手元の現在ブランチ）はスクリプトが持つ。
PACKAGE_VERSION_REF := $(strip $(REF))
export PACKAGE_VERSION_REF

version-stamp:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@pnpm exec tsx scripts/package-version stamp

version-stamp-commit:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@pnpm exec tsx scripts/package-version commit

version-stamp-check:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@pnpm exec tsx scripts/package-version check
