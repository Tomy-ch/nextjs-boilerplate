## テスト
.PHONY: test-full ## カバレッジを測定し、97.5% のしきい値を検証する
test-full:
	pnpm test

.PHONY: test-cached ## Vitest のキャッシュを利用してテストを高速に実行する
test-cached:
	pnpm test:cached
