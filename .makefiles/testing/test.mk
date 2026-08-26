## テスト
.PHONY: test-full ## カバレッジを測定し、100% のしきい値を検証する
test-full:
	pnpm test

.PHONY: test-cached ## Vitest のキャッシュを利用してテストを高速に実行する
test-cached:
	pnpm test:cached

## 分割実行
#
# 1 台で全量を走らせる `test-full` と同じものを、台数で割って走らせる。判定に要るのは
# **合流させた結果**なので、各台は blob を書き出すだけで閾値を持たない (vitest.config.ts の
# `VITEST_SHARDED`)。合流する側が閾値を掛ける。
#
# 割るのは PR の待ち時間のためだけである。保護ブランチと手元は `test-full` のまま —— 台数を
# 増やすほど固定費 (準備・依存の取得) が台数ぶん重複するので、誰も待っていない実行で払う理由が
# 無い。
.PHONY: test-shard ## 分割の 1 台ぶんを走らせ、blob を書き出す (SHARD=<i>/<n>)
test-shard:
	@test -n "$(SHARD)" || { echo "❌ SHARD=<i>/<n> を渡してください。例: make test-shard SHARD=1/4"; exit 1; }
	@VITEST_SHARDED=1 pnpm exec vitest run --coverage --no-cache --shard=$(SHARD) --reporter=blob

.PHONY: test-merge ## 分割の blob を合流させ、カバレッジのしきい値を検証する
test-merge:
	@pnpm exec vitest run --mergeReports --coverage
