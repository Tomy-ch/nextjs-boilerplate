## 画面を通した検証
#
# 主要ジャーニー・ブラウザが報告する異常・帯ごとの出し分けを 3 つの描画エンジンで回し、画面
# 単位の見た目を基準画像と比べる (e2e/README.md)。story 単位の撮影 (vrt.mk) とは撮る対象が
# 違うため実行を分けるが、置き場も実行環境のコンテナも共有する。
#
# アプリはホストで起動し、ブラウザだけをコンテナの中で動かす。理由は
# docker-compose.dev-tools.yml に書いてある。
.PHONY: e2e ## 主要ジャーニーを回し、画面の見た目を基準画像と比較する
.PHONY: e2e-retake ## 画面の基準画像を撮り直して置き場へ送る (手元からの撮り直しはこれ)
.PHONY: e2e-update ## 画面の基準画像を撮り直す (置き場へは送らない)
.PHONY: e2e-maintenance ## 配信を止めた状態で起動し、停止の機構が成立することを確かめる
.PHONY: e2e-report ## 直前の実行の HTML レポートを開く

# 相手はモックでなければならない。既定の local は live を指すので、明示していない呼び出しを
# 実物のバックエンドへ向けない。
E2E_APP_ENV ?= ci

# 起動へ足す環境変数（`NAME=value` の並び）。停止中の検証だけが使う。ENV ファイルではなく
# 起動の側で渡すのは、`loadEnvironment()` が override: false で読むため、既に process.env に
# 在る値が勝つからである（src/config/README.md）。
E2E_APP_ENV_EXTRA ?=

# アプリを待ち受けるポート。開発サーバの 3000 を避ける。同じポートを使うと、既に何かが待ち受けて
# いる環境で「起動を待つ」が他人のサーバへの疎通で満たされ、その相手に対してテストが走る。
E2E_PORT ?= 3100

# コンテナの中から見たアプリの場所。
E2E_BASE_URL ?= http://host.docker.internal:$(E2E_PORT)

# BFF を別 origin から呼ばせる相手として、起動時に宣言する origin (HTTP_ALLOWED_ORIGINS)。
# 実在しなくてよい —— spec がこの origin の文書をブラウザの中で偽装し、そこからアプリへ fetch する
# (e2e/journeys/cross-origin.spec.ts)。実在の名前を借りると、その名前が別の意味を持った日に
# 判定が変わる。宣言と spec が同じ綴りを読むよう、コンテナへも渡す。
E2E_ALLOWED_ORIGIN ?= http://partner.example.test

# 生成物をホストの所有者で書き出すために渡す。compose 側の既定 (1000) は Linux の初回
# ユーザであって、実行者と一致する保証が無い。
RUNNER_UID ?= $(shell id -u)
RUNNER_GID ?= $(shell id -g)
export RUNNER_UID
export RUNNER_GID

# 撮り直しであることを撮る側へ伝える。意味は baseline/lib/store.ts が持つ。
BASELINE_RETAKE ?=
export BASELINE_RETAKE

# 撮り直す範囲。承認経路が「直前に落ちた画面」だけを渡すために使う。空なら全数。
# story 側の VRT_ONLY と同じ役割で、渡すのは画面の名前（e2e/lib/screens.ts の宣言と同じ綴り）。
E2E_ONLY ?=
export E2E_ONLY

# 上の 3 つは vrt.mk も同じものを使うが、宣言をこちらでも持つのは、片方のファイルの export に
# 暗黙依存すると include の順序を変えただけで静かに壊れるためである。

E2E_RUN := docker compose -f docker-compose.dev-tools.yml run --rm -T \
	-e E2E_BASE_URL=$(E2E_BASE_URL) -e E2E_ALLOWED_ORIGIN=$(E2E_ALLOWED_ORIGIN) -e APP_ENV=$(E2E_APP_ENV) -e BASELINE_RETAKE -e E2E_ONLY browser_runner

E2E_CONFIG := --config=playwright.e2e.config.ts

# 起動したアプリへ当てるもの。既定はコンテナの中の Playwright だが、同じ「本番ビルドをホストで
# 起動して、ブラウザから当て、終わったら片付ける」立て付けを Lighthouse も使う (lighthouse.mk)。
# 2 組持つと、起動待ちも後片付けもポートの衝突検査も二重になり、片方だけを直した状態が生まれる。
#
# アプリの待ち受け先は recipe が解決する `$$hostname` に入っている。
E2E_COMMAND ?= $(E2E_RUN) ./node_modules/.bin/playwright test $(E2E_CONFIG) $(E2E_UPDATE) $(E2E_ARGS)

# 起動の手前で確かめること。基準画像を要求するのは撮る側だけなので、呼ぶ側が差し替える。
E2E_PRECHECK ?= $(E2E_REQUIRE_BASELINES)

E2E_REQUIRE_BASELINES = \
	$(VRT_REQUIRE_WIRING); \
	if [ -z "$$(ls -A baseline/images 2>/dev/null)" ]; then \
		echo "❌ baseline/images が空です。git submodule update --init baseline/images を実行してください。"; exit 1; \
	fi

# アプリが応答を返すまで待つ上限 (秒)。決め打ちで待つと、速い起動が最悪の場合の時間を払う。
E2E_BOOT_TIMEOUT := 60

# アプリを待ち受けるアドレス。**指定しないと Next.js は全インターフェースで待ち受ける。**
#
# 絞るのは、この起動が APP_ENV=ci を使うためである。その環境ではテスト専用の session 発行口
# (src/app/api/auth/test-session/route.ts) が開いており、誰でも任意の役割の session を取れる。
# 全インターフェースで待ち受けると、その口が同じ LAN の他のホストから叩ける状態になる。
#
# 宛先はコンテナが到達に使う経路 1 本だけにする。Docker Desktop は host.docker.internal を
# ホストの loopback へ橋渡しするので loopback で届く。Linux では bridge の gateway がホスト側の
# 宛先になるため loopback では届かず、その 1 本を使う。
#
# 解決を recipe の中に置くのは、$(shell ...) だとどのターゲットを叩いても docker へ問い合わせが
# 走るため (load-band.mk と同じ理由)。
E2E_RESOLVE_HOSTNAME = \
	if [ -n "$(E2E_HOSTNAME)" ]; then \
		hostname="$(E2E_HOSTNAME)"; \
	elif [ "$$(uname -s)" = "Darwin" ]; then \
		hostname="127.0.0.1"; \
	else \
		hostname="$$(docker network inspect bridge -f '{{range .IPAM.Config}}{{.Gateway}}{{end}}' 2>/dev/null)"; \
	fi; \
	if [ -z "$$hostname" ]; then \
		echo "❌ 待ち受けるアドレスを決められませんでした。E2E_HOSTNAME で指定してください。"; exit 1; \
	fi

# 明示したいときの入口。空なら上の解決に任せる。
E2E_HOSTNAME ?=

# build はホストで行う。生成物を先に作ってからコンテナへ見せる (vrt の build-storybook と同じ形)。
.PHONY: e2e-build ## 画面を通した検証が使う本番ビルドを作る (e2e / lighthouse から呼ばれる)
e2e-build:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@# 取得結果のキャッシュを捨ててから build する。`cache: "force-cache"` を指定した取得は
	@# .next/cache へ残り、CI では別のブランチの build が作ったものが復元される。残したまま撮ると、
	@# 絵が木の状態ではなく「前の build が何をキャッシュしたか」で決まる。
	@rm -rf .next/cache/fetch-cache
	@APP_ENV=$(E2E_APP_ENV) pnpm build
	@if [ ! -d .next/server/app ]; then \
		echo "❌ アプリの build 生成物がありません（.next/server/app）。"; exit 1; \
	fi

# 起動から片付けまでを 1 つの recipe に閉じる。プロセスの生死を跨いだ状態を make の依存関係で
# 表そうとすると、失敗した実行がサーバを残す。
#
# 全数の撮り直しでは、撮る直前に画面の区画を空にする。空にする条件（引数が 1 つも付いていない
# ときだけ）とその理由は vrt/README.md が持つ。**前提ではなくこのレシピの中で消す** —— 前提として
# 並べると `-j` 付きの呼び出しで撮影との順序が付かず、撮った直後の画像を消しうる。
.PHONY: e2e-run ## アプリを起動してブラウザから当て、終了時に後片付けする (e2e / lighthouse から呼ばれる)
e2e-run: e2e-build
	@$(E2E_PRECHECK)
	@mkdir -p tmp/e2e
	@set -e; \
	$(E2E_RESOLVE_HOSTNAME); \
	if curl -s --max-time 2 "http://$$hostname:$(E2E_PORT)/" >/dev/null 2>&1; then \
		echo "❌ $$hostname:$(E2E_PORT) を既に何かが使っています。空いているポートを E2E_PORT で指定してください。"; \
		exit 1; \
	fi; \
	APP_ENV=$(E2E_APP_ENV) HTTP_ALLOWED_ORIGINS=$(E2E_ALLOWED_ORIGIN) $(E2E_APP_ENV_EXTRA) pnpm start --hostname "$$hostname" --port $(E2E_PORT) > tmp/e2e/server.log 2>&1 & \
	server_pid=$$!; \
	trap 'kill $$server_pid 2>/dev/null || true' EXIT INT TERM; \
	booted=0; \
	for _ in $$(seq 1 $(E2E_BOOT_TIMEOUT)); do \
		if ! kill -0 $$server_pid 2>/dev/null; then \
			cat tmp/e2e/server.log; \
			echo "❌ アプリが応答を返す前に終了しました。"; exit 1; \
		fi; \
		if curl -fs -o /dev/null --max-time 5 "http://$$hostname:$(E2E_PORT)/"; then booted=1; break; fi; \
		sleep 1; \
	done; \
	if [ "$$booted" != "1" ]; then \
		cat tmp/e2e/server.log; \
		echo "❌ アプリが $(E2E_BOOT_TIMEOUT) 秒で応答を返しませんでした。"; exit 1; \
	fi; \
	if [ "$(BASELINE_RETAKE)" = "1" ] && [ -z "$(E2E_ONLY)$(E2E_ARGS)" ]; then \
		pnpm exec tsx scripts/e2e clear-screens; \
	fi; \
	$(E2E_COMMAND)

e2e: E2E_UPDATE :=
e2e: e2e-run

# 撮って送らないと、親の gitlink が古いまま作業ツリーだけ新しい状態になり、手元の make e2e は
# 通るのに CI だけ落ちる。順に走らせるのは、-j 付きで呼ばれても前提の順序を崩さないため。
e2e-retake:
	@$(MAKE) e2e-update
	@$(MAKE) baseline-push

# 撮り直しても送らない。送るのは make baseline-push だけで、置き場は story 単位の撮影と共有する。
e2e-update: E2E_UPDATE := --update-snapshots
e2e-update: BASELINE_RETAKE := 1
e2e-update: e2e-run
	@echo "🎞️ 撮影しました。置き場へ送るまでは手元だけの状態です（make e2e-retake なら続けて送ります）。"

# 停止中の検証。同じ立て付け（build → 起動 → コンテナのブラウザから当てる → 片付け）へ、
# 起動の環境と当てる設定だけを差し替えて乗せる。
#
# 基準画像を要求しないので前提検査を外す。撮らない実行に submodule の取得を求めると、
# 画像を持たない環境でこの検証だけが動かせなくなる。
e2e-maintenance: E2E_APP_ENV_EXTRA := APP_MAINTENANCE_MODE=on
e2e-maintenance: E2E_PRECHECK := true
e2e-maintenance: E2E_COMMAND = $(E2E_RUN) ./node_modules/.bin/playwright test --config=playwright.maintenance.config.ts $(E2E_ARGS)
e2e-maintenance: e2e-run

e2e-report:
	@docker compose -f docker-compose.dev-tools.yml run --rm --service-ports browser_runner \
		./node_modules/.bin/playwright show-report tmp/e2e/report --host 0.0.0.0
