## story 単位の visual regression
#
# 基準画像は別リポジトリに置き、vrt/screenshots からサブモジュールとして参照する
# (vrt/README.md)。取り込んでいない状態で回すと全 story が「基準画像が無い」で落ち、
# 退行と見分けが付かないため手前で止める。
.PHONY: vrt ## story の見た目を基準画像と比較する (コンテナ内で実行)
.PHONY: vrt-retake ## 基準画像を撮り直して置き場へ送る (手元からの撮り直しはこれ)
.PHONY: vrt-update ## 基準画像を撮り直す (置き場へは送らない)
.PHONY: vrt-push ## 撮り直した基準画像を置き場へ送り、サブモジュールのポインタを進める
.PHONY: a11y ## 全 story に axe を掛ける (コンテナ内で実行)
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

# 基準画像を撮った時点の入力のハッシュ。置き場が画像と同じコミットで持つ (vrt/README.md)。
VRT_INPUTS_FILE := vrt/screenshots/render-inputs.sha256

# 比較を省いた実行でも走らせる検査。基準画像と撮影対象の 1 対 1 の対応だけを選ぶ。
VRT_BASELINE_TAG := @baselines

# 比較する前に Storybook を build する。撮る対象は build 済みの静的な出力であり、
# ソースではない。
# 配線の確認。撮り直しは空の置き場から始められる必要があるので、中身までは要求しない。
VRT_REQUIRE_WIRING = \
	if [ ! -f .gitmodules ]; then \
		echo "❌ 基準画像の置き場が配線されていません。make setup-vrt-images を実行してください（vrt/README.md）。"; exit 1; \
	fi

# spec を名指しするのは、a11y の spec を同じ実行に巻き込まないため。混ざると a11y の失敗が
# 撮り直しの対象に入り、撮り直しても直らないまま基準画像だけが承認済みになる。
vrt: build-storybook
	@$(VRT_REQUIRE_WIRING)
	@if [ -z "$$(ls -A vrt/screenshots 2>/dev/null)" ]; then \
		echo "❌ vrt/screenshots が空です。git submodule update --init vrt/screenshots を実行してください。"; exit 1; \
	fi
	@if [ -z "$(VRT_ONLY)" ] && [ "$$(pnpm exec tsx scripts/vrt gate $(VRT_INPUTS_FILE))" = "skip" ]; then \
		echo "⏭️ 絵を決める入力が基準画像を撮った時点と同じです。比較を省き、対応の検査だけを行います。"; \
		$(VRT_RUN) ./node_modules/.bin/playwright test vrt/stories.spec.ts --grep $(VRT_BASELINE_TAG) $(VRT_ARGS); \
	else \
		$(VRT_RUN) ./node_modules/.bin/playwright test vrt/stories.spec.ts $(VRT_ARGS); \
	fi

# 入力のハッシュは撮った直後に書く。送る側で書くと、撮らずに置き場を直した木でも「この入力で
# 撮った」と記録でき、次の実行が比較を省いてしまう。
vrt-update: build-storybook
	@$(VRT_REQUIRE_WIRING)
	@$(VRT_RUN) ./node_modules/.bin/playwright test vrt/stories.spec.ts --update-snapshots $(VRT_ARGS)
	@pnpm exec tsx scripts/vrt inputs > $(VRT_INPUTS_FILE)
	@echo "🎞️ 撮影しました。置き場へ送るまでは手元だけの状態です。"

# 手元から撮り直す唯一の入口。撮って送らないと、親の gitlink が古いまま作業ツリーだけ新しい
# 状態になり、手元の make vrt は通るのに CI だけ落ちる。
# 順に走らせるのは、-j 付きで呼ばれても前提の順序を崩さないため。
vrt-retake:
	@$(MAKE) vrt-update
	@$(MAKE) vrt-push

# 撮り直した一式を置き場へ送るのはここだけ。手元でサブモジュール内を直接コミットすると
# 撮り直しどうしが繋がり、掃除でどれも落とせなくなる。
vrt-push:
	@$(VRT_REQUIRE_WIRING)
	@pnpm exec tsx scripts/vrt-images push $(VRT_BRANCH)

# 撮影と同じコンテナ・同じ story 列挙で走らせる。基準画像は要らないので配線も要求しない。
a11y: build-storybook
	@$(VRT_RUN) ./node_modules/.bin/playwright test vrt/a11y.spec.ts $(VRT_ARGS)

# レポートもコンテナ内で配る。ホスト側の Playwright は比較の前に落とす設計なので、
# 実行系をここだけホストへ寄せない。--service-ports はこの起動でだけポートを公開する。
vrt-report:
	@docker compose -f docker-compose.dev-tools.yml run --rm --service-ports vrt_runner \
		./node_modules/.bin/playwright show-report tmp/vrt/report --host 0.0.0.0

build-storybook:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@pnpm build-storybook
