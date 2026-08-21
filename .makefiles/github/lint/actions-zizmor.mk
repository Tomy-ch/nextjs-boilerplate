## GitHub Actions 定義の静的解析（zizmor）
.PHONY: actions-zizmor ## workflows / composite action の定義を zizmor で静的解析する（high で落とす）

# actionlint / actions-shellcheck が原理的に見られない観点を担う。あちらは shellcheck へ渡す前に
# `${{ … }}` を行数だけ保つプレースホルダへ潰すため、式が「ただの語」になり、クオートの有無という
# script injection の本質が解析対象から消える（docs/adr/0153-ci-configuration.md）。

# 走査対象は `.`。zizmor が workflows と composite action の両方を集める。
ZIZMOR_TARGET := .

# 設定は明示的に渡す。zizmor は入力の位置から設定を自動探索するが、探索が外れても
# 「所見ゼロ」ではなく「抑制が効かない」形で現れるため、外れたことに気付けない。
ZIZMOR_CONFIG := .github/zizmor.yml

# -q: ファイルごとの INFO 行を落とし、所見だけを残す。
ZIZMOR_FLAGS := -q --no-progress --format plain --config $(ZIZMOR_CONFIG)

# high だけを落とす。medium 以下は出力に残して読めるようにし、ゲートには使わない。
ZIZMOR_GATE_SEVERITY := high

# --offline: ネットワークと GH_TOKEN から切り離す。オンラインでしか走らない監査（impostor-commit
# 等）を CI 側だけで足すことはしない —— hook と CI が同じ答えを返す性質（0153「hooks mirror CI」）が
# 崩れ、手元で再現できない失敗が PR にだけ現れるようになる。tag 付け替えの検知は actions-pin の
# resolve が fail-closed で担う。
actions-zizmor:
	@command -v zizmor >/dev/null 2>&1 || { echo "❌ zizmor が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@zizmor $(ZIZMOR_FLAGS) --offline --min-severity $(ZIZMOR_GATE_SEVERITY) $(ZIZMOR_TARGET)
