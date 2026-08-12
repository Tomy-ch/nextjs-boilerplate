## story 単位の visual regression
.PHONY: vrt ## story の見た目を基準画像と比較する (コンテナ内で実行)
.PHONY: vrt-update ## 基準画像を撮り直す (差分を意図した変更として受け入れる)
.PHONY: vrt-report ## 直前の実行の HTML レポートを開く
.PHONY: build-storybook ## Storybook を静的に build する (VRT の撮影対象)

# 生成物をホストの所有者で書き出すために渡す。compose 側の既定 (1000) は Linux の初回
# ユーザであって、実行者と一致する保証が無い。
VRT_UID ?= $(shell id -u)
VRT_GID ?= $(shell id -g)
export VRT_UID
export VRT_GID

# 撮り直す範囲。承認経路が「直前に落ちた story」だけを渡すために使う。空なら全数。
VRT_ONLY ?=
export VRT_ONLY

VRT_RUN := docker compose -f docker-compose.dev-tools.yml run --rm -T -e VRT_ONLY vrt_runner

# 比較する前に Storybook を build する。撮る対象は build 済みの静的な出力であり、
# ソースではない。
vrt: build-storybook
	@$(VRT_RUN) ./node_modules/.bin/playwright test $(VRT_ARGS)

vrt-update: build-storybook
	@$(VRT_RUN) ./node_modules/.bin/playwright test --update-snapshots $(VRT_ARGS)

# レポートもコンテナ内で配る。ホスト側の Playwright は比較の前に落とす設計なので、
# 実行系をここだけホストへ寄せない。--service-ports はこの起動でだけポートを公開する。
vrt-report:
	@docker compose -f docker-compose.dev-tools.yml run --rm --service-ports vrt_runner \
		./node_modules/.bin/playwright show-report tmp/vrt/report --host 0.0.0.0

build-storybook:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@pnpm build-storybook
