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

# 生成のあいだ、既存の生成物を置いておく場所。生成が失敗したらここから書き戻す。
GEN_API_BACKUP := tmp/gen-api-backup

# 生成の直後に整形まで掛ける。整形を別手順にすると、生成しただけの状態が commit され、
# drift ゲートが「生成し忘れ」ではなく「整形し忘れ」で落ちる。
#
# **空から作る。** 上書きだけだと、契約から消えたスキーマに対応するファイルが再生成で触られずに
# 残る。中身が変わらないので drift ゲートの突合も素通りし、契約に無いものが生成物の顔をして
# 居座る。空から作れば、消えたものは消えた状態で現れる。
gen-api:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@# **消すのではなく退避してから生成する。** 生成が途中で失敗したとき、消した後だと生成物の無い
	@# 作業ツリーだけが残る。退避なら書き戻せる。lockfile のずれ・契約の不正・抽出の失敗のどれで
	@# 落ちても同じ経路で戻すため、失敗の種類ごとに事前確認を足していく形にはしない。
	@set -e; \
	rm -rf $(GEN_API_BACKUP); \
	mkdir -p $(GEN_API_BACKUP); \
	for target in $(GEN_API_OUTPUTS); do \
		if [ -e "$$target" ]; then \
			mkdir -p "$(GEN_API_BACKUP)/$$(dirname "$$target")"; \
			mv "$$target" "$(GEN_API_BACKUP)/$$target"; \
		fi; \
	done; \
	if pnpm exec orval && pnpm exec tsx scripts/openapi/extract-limits.ts; then \
		rm -rf $(GEN_API_BACKUP); \
	else \
		echo "❌ 生成に失敗しました。退避した生成物を書き戻します。"; \
		for target in $(GEN_API_OUTPUTS); do \
			rm -rf "$$target"; \
			if [ -e "$(GEN_API_BACKUP)/$$target" ]; then \
				mkdir -p "$$(dirname "$$target")"; \
				mv "$(GEN_API_BACKUP)/$$target" "$$target"; \
			fi; \
		done; \
		rm -rf $(GEN_API_BACKUP); \
		exit 1; \
	fi
	@pnpm fix >/dev/null
	@echo "✅ 契約から型 / zod / MSW ハンドラを生成しました"

gen-api-check:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@pnpm exec tsx scripts/openapi/check-generated.ts
