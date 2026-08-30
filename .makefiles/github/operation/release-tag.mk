## リリースタグの設定とリリースノートの設定コマンド

.PHONY: tag-patch ## リリースタグ(vX.Y.Z+1)を作成
.PHONY: tag-minor ## リリースタグ(vX.Y+1.0)を作成
.PHONY: tag-major ## リリースタグ(vX+1.0.0)を作成

tag-patch:
	@pnpm exec tsx scripts/release tag patch

tag-minor:
	@pnpm exec tsx scripts/release tag minor

tag-major:
	@pnpm exec tsx scripts/release tag major
