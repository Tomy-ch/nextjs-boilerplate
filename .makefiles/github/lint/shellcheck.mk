## 単体シェルスクリプトの Lint
#
# 走査対象は scripts/**/*.sh。composite action に埋め込まれた run: は
# actions-shellcheck が、workflow 側の run: は actionlint が受け持つ (ADR 0153)。
#
# ここに居るのは TypeScript ではないため 1:1 ゲートもカバレッジも掛からない。
# 静的検査だけが唯一の網なので、shellcheck が無ければ黙って範囲が縮まないよう落とす。
.PHONY: shellcheck ## scripts/**/*.sh を shellcheck で検査

shellcheck:
	@command -v shellcheck >/dev/null 2>&1 || { echo "❌ shellcheck が PATH にありません。make install-tools を実行してください。"; exit 1; }
	@files=$$(find scripts -name '*.sh' -type f | sort); \
	if [ -z "$$files" ]; then \
		echo "🟡 検査対象の .sh がありません。"; \
	else \
		echo "$$files" | xargs shellcheck --shell=bash --external-sources && \
		echo "✅ $$(echo "$$files" | wc -l | tr -d ' ') 件のシェルスクリプトを検査しました。"; \
	fi
