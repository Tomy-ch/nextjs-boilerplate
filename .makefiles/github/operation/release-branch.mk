## リリースブランチの切り替えコマンド

.PHONY: hotfix-patch ## hotfixブランチ(vX.Y.Z+1)を作成して、デフォルトブランチに設定(現在のタグ基準)
.PHONY: branch-patch ## releaseブランチ(vX.Y.Z+1)を作成して、デフォルトブランチに設定(現在のタグ基準)
.PHONY: branch-minor ## releaseブランチ(vX.Y+1.0)を作成して、デフォルトブランチに設定(現在のタグ基準)
.PHONY: branch-major ## releaseブランチ(vX+1.0.0)を作成して、デフォルトブランチに設定(現在のタグ基準)

hotfix-patch:
	@pnpm exec tsx scripts/release branch hotfix patch

branch-patch:
	@pnpm exec tsx scripts/release branch release patch

branch-minor:
	@pnpm exec tsx scripts/release branch release minor

branch-major:
	@pnpm exec tsx scripts/release branch release major
