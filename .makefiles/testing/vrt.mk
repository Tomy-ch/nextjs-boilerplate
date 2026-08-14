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

# 撮り直しであることを撮る側へ伝える。置き場との対応の検査は、撮り直しの最中は他の撮影の
# 途中経過を欠けとして読むため、そこだけ見送る (vrt/lib/baseline-store.ts)。
BASELINE_RETAKE ?=
export BASELINE_RETAKE

VRT_RUN := docker compose -f docker-compose.dev-tools.yml run --rm -T \
	-e VRT_ONLY -e BASELINE_RETAKE vrt_runner

# 基準画像を撮った時点の入力のハッシュ。置き場が画像と同じコミットで持つ (vrt/README.md)。
VRT_INPUTS_FILE := vrt/screenshots/render-inputs.sha256

# 検査が通った時点の入力のハッシュ。撮った時点と別に持つのは、絵を変えない変更でも
# storybook-static のバイト列は動くため。撮り直しは起きないので撮影時点の記録は取り残され、
# 一致する窓がほとんど閉じる。通った時点なら実行のたびに前へ進む。
# 追跡下に置かないのは、これが木の状態ではなく「その木を検査した」という実行の履歴であるため。
# CI は cache で持ち回る (.github/workflows/vrt.yaml)。
VRT_VERIFIED_FILE := tmp/vrt/verified-inputs.sha256
A11Y_VERIFIED_FILE := tmp/a11y/verified-inputs.sha256

# 記録は検査が通った後にだけ書く。手前で書くと、落ちた状態を「通った」として残す。
RECORD_VERIFIED = mkdir -p "$$(dirname $(1))" && pnpm exec tsx scripts/vrt inputs > $(1)

# 省いたのか走ったのかを機械可読で残す。CI の報告文言がこれを読む。緑の理由が「検査して
# 通った」なのか「前と同じだから見ていない」なのかは、読む人にとって別物である。
VRT_GATE_MARKER := vrt-gate:

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
#
# 配色トークンの検査は撮影と同じ実行に載せる。基準画像を持たないので撮り直しの対象にならず、
# 見ている面(story を包む面の配色)が撮影と同じであるため。
VRT_SPECS := vrt/stories.spec.ts vrt/theme-tokens.spec.ts

vrt: build-storybook
	@$(VRT_REQUIRE_WIRING)
	@if [ -z "$$(ls -A vrt/screenshots 2>/dev/null)" ]; then \
		echo "❌ vrt/screenshots が空です。git submodule update --init vrt/screenshots を実行してください。"; exit 1; \
	fi
	@decision="$$(if [ -n "$(VRT_ONLY)" ]; then echo run; else pnpm exec tsx scripts/vrt gate $(VRT_INPUTS_FILE) $(VRT_VERIFIED_FILE); fi)"; \
	echo "$(VRT_GATE_MARKER) $$decision"; \
	if [ "$$decision" = "skip" ]; then \
		echo "⏭️ 絵を決める入力が前に判定した時点と同じです。比較を省き、対応の検査だけを行います。"; \
		$(VRT_RUN) ./node_modules/.bin/playwright test vrt/stories.spec.ts --grep $(VRT_BASELINE_TAG) $(VRT_ARGS); \
	else \
		$(VRT_RUN) ./node_modules/.bin/playwright test $(VRT_SPECS) $(VRT_ARGS) \
			&& $(call RECORD_VERIFIED,$(VRT_VERIFIED_FILE)); \
	fi

# 入力のハッシュは撮った直後に書く。送る側で書くと、撮らずに置き場を直した木でも「この入力で
# 撮った」と記録でき、次の実行が比較を省いてしまう。
vrt-update: BASELINE_RETAKE := 1
vrt-update: build-storybook
	@$(VRT_REQUIRE_WIRING)
	@# 全数のときだけ先に区画を空にする。撮り直しは上書きするだけで stale なファイルを消さないため、
	@# story を改名・削除すると旧名の画像が残り、対応の検査が孤児として落とす。範囲を絞った撮り直し
	@# では消さない —— 撮らない story の画像まで消え、報告されていない差分が置き場へ入る。
	@if [ -z "$(VRT_ONLY)" ]; then pnpm exec tsx scripts/vrt clear-stories; fi
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
#
# 見る記録は自前のものだけ。基準画像を撮った時点の記録を流用すると、axe が落ちる状態で
# 撮り直しが起きたときに、以後その状態を「一致」と読んで緑を報告する。
a11y: build-storybook
	@decision="$$(pnpm exec tsx scripts/vrt gate $(A11Y_VERIFIED_FILE))"; \
	echo "$(VRT_GATE_MARKER) $$decision"; \
	if [ "$$decision" = "skip" ]; then \
		echo "⏭️ 絵を決める入力が前に axe が通った時点と同じです。検査を省きます。"; \
	else \
		$(VRT_RUN) ./node_modules/.bin/playwright test vrt/a11y.spec.ts $(VRT_ARGS) \
			&& $(call RECORD_VERIFIED,$(A11Y_VERIFIED_FILE)); \
	fi

# レポートもコンテナ内で配る。ホスト側の Playwright は比較の前に落とす設計なので、
# 実行系をここだけホストへ寄せない。--service-ports はこの起動でだけポートを公開する。
vrt-report:
	@docker compose -f docker-compose.dev-tools.yml run --rm --service-ports vrt_runner \
		./node_modules/.bin/playwright show-report tmp/vrt/report --host 0.0.0.0

# 終了コードだけでは build の成否を判定できない。preview の build は非同期で走り、そこで
# 投げられた例外は未処理の rejection として出るだけで、`storybook build` は 0 を返す。
# 生成物を見ないと、preview を 1 つも作れなかった木が「通った」として下流へ渡る。
#
# その状態は下流で最も高くつく形で現れる。story の目録は静的解析から作られるので全 story が
# 列挙され、撮影も検査もその全数に対して `iframe.html` を開こうとし、無いので 1 件ずつ
# 待ち時間の上限まで待つ。build の失敗が、全数のタイムアウトとして 30 分かけて現れる。
build-storybook:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@pnpm build-storybook
	@if [ ! -f storybook-static/iframe.html ] || [ -z "$$(ls -A storybook-static/assets 2>/dev/null)" ]; then \
		echo "❌ Storybook の preview が生成されていません（storybook-static/iframe.html または assets/ が空）。"; \
		echo "   build は 0 を返していますが、preview の build は失敗しています。上のログで未処理の rejection を探してください。"; \
		echo "   ENV の検証で落ちている場合は APP_ENV を明示してください（env/README.md）。"; \
		exit 1; \
	fi
