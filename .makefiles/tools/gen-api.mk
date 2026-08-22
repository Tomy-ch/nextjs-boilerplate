## API 契約の取り込み
.PHONY: fetch-api ## openapi/sources.yaml の座標から契約を取得し blob SHA をスタンプする
.PHONY: gen-api ## 取得済みの契約から型 / zod / MSW ハンドラを生成する
.PHONY: gen-api-check ## 契約と生成物の版が揃っているか検証する (生成なし・CI / hook 用)

# 取得対象の契約名。省略時は sources.yaml の全件を取得する (例: make fetch-api NAME=api)。
NAME ?=

fetch-api:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@command -v gh >/dev/null 2>&1 || { echo "❌ gh が PATH にありません。GitHub CLI をインストールし gh auth login を済ませてください。"; exit 1; }
	@pnpm exec tsx scripts/openapi/fetch-api.ts $(if $(strip $(NAME)),"$(strip $(NAME))")

# 生成物の置き場。orval.config.ts の target / schemas と 1 対 1 で対応する。
#
# **手書きは含めない。** `src/adapters/gen/README.md` と `mocks/` 直下は人が書いたものなので、
# 消すのは契約ごとの部分木だけにする。
GEN_API_OUTPUTS := src/adapters/gen/api mocks/api

# 生成の直後に整形まで掛ける。整形を別手順にすると、生成しただけの状態が commit され、
# drift ゲートが「生成し忘れ」ではなく「整形し忘れ」で落ちる。
#
# **空にしてから生成する。** 上書きだけだと、契約から消えたスキーマに対応するファイルが再生成で
# 触られずに残る。中身が変わらないので drift ゲートの突合も素通りし、契約に無いものが生成物の
# 顔をして居座る。空から作れば、消えたものは消えた状態で現れる。
gen-api:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@# 消す前に、生成が走れることまで確かめる。pnpm は lockfile が動いていると exec の時点で
	@# 止まるため、確認を省くと「消した後に生成できないと判る」ことになり、生成物が消えた作業
	@# ツリーだけが残る。
	@pnpm exec true >/dev/null 2>&1 || { echo "❌ 依存が lockfile と揃っていません。pnpm install を実行してください。"; exit 1; }
	@rm -rf $(GEN_API_OUTPUTS)
	@pnpm exec orval
	@pnpm exec tsx scripts/openapi/extract-limits.ts
	@pnpm fix >/dev/null
	@echo "✅ 契約から型 / zod / MSW ハンドラを生成しました"

gen-api-check:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@pnpm exec tsx scripts/openapi/check-generated.ts
