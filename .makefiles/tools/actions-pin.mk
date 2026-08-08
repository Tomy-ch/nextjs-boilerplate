## GitHub Actions の SHA ピン
.PHONY: actions-pin-resolve ## uses: の tag を SHA へ解決しロックファイルを更新する
.PHONY: actions-pin-apply ## ロックファイルを元に uses: を SHA へ固定する
.PHONY: actions-pin-check ## uses: がロックファイル通り固定済みか検証する (書き換えなし・CI / hook 用)

# 供給網検疫。解決先の公開から N 日未満なら採用せず、既存ピンがあればそれを維持する (0 で無効)。
ACTIONS_PIN_MIN_AGE_DAYS ?= 14

# tag 付け替えの承認。不変を宣言した tag (bare な major 番号以外) の解決先が変わると resolve は
# 失敗する。意図した更新であればロックファイルのキーを空白区切りで並べる (既定は承認なし)。
#
# レシピへ展開せず環境変数として渡す。キーは uses: のコメント tag 由来でシェルのメタ文字を
# 含みうるため、レシピ行へ埋めるとリポジトリの中身がシェルコマンドを決められることになる。
ACTIONS_PIN_ALLOW_MOVED ?=
export ACTIONS_PIN_ALLOW_MOVED

ACTIONS_PIN := pnpm exec tsx scripts/actions-pin

actions-pin-resolve:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@$(ACTIONS_PIN) resolve --min-age-days=$(ACTIONS_PIN_MIN_AGE_DAYS)

actions-pin-apply:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@$(ACTIONS_PIN) apply

actions-pin-check:
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@$(ACTIONS_PIN) check
