## portable な SAST（opengrep）
.PHONY: sast ## 自分が書いたコードの脆弱なパターンを opengrep で検査する
.PHONY: sast-sarif ## 同じ検査を SARIF で書き出す（code scanning への取り込み用）

# 依存スキャナが「引き込んだライブラリが既知の脆弱性を持つか」を問うのに対し、こちらは
# 「自分が書いたコードが脆弱なパターンを含むか」を問う（docs/adr/0110-security-operations.md）。
#
# Semgrep 本体ではなく OSS fork の opengrep を使う。ルール記法は互換で、抑止も
# `// nosemgrep: <rule-id>` がそのまま効く。CodeQL は GitHub の外へ持ち出せないため、
# private + GHAS 無しの fork 先では層ごと消える。持ち出せる SAST を別に持つのはそのため。
#
# **検査条件は 1 箇所に持つ。** ゲート（text）と code scanning への取り込み（SARIF）は
# 同じ対象・同じルール・同じ除外でなければ、落ちた内容と Security タブの一覧が食い違う。
# 変数へ括り出してあるのはそれを構造的に保証するためで、両方の行に書き写さない。

# ルールセット。owasp-top-ten を足すのは、言語別のセットが型の使い方を見るのに対し、
# あちらは攻撃の種類から引くため、拾う面が重ならないことによる。
OPENGREP_CONFIGS := --config p/javascript --config p/typescript --config p/owasp-top-ten

# 手で書いたソースだけを対象にする。生成物（src/adapters/gen / mocks/api）を外すのは、
# 編集できないものの所見が行動につながらないため。所見が出るなら直す先は契約か生成器である。
OPENGREP_TARGETS := src scripts tokens mocks e2e vrt docs-viewer .storybook
OPENGREP_EXCLUDES := --exclude node_modules --exclude dist --exclude coverage \
	--exclude src/adapters/gen --exclude mocks/api

# --taint-intrafile: ファイル内の taint 追跡を有効にする。パターン一致だけでは、値の出所が
# 別の行にある形を拾えない。
OPENGREP_FLAGS := $(OPENGREP_CONFIGS) --taint-intrafile $(OPENGREP_EXCLUDES)

# --error: 所見があれば exit 1。**baseline が 0 件であることがこのゲートの前提**で、
# 0 件だからこそ新しい所見が読み飛ばす対象ではなく信号になる。許容する所見はソースへ
# `// nosemgrep: <rule-id>` を理由付きで置き、コードの側に判断を残す。
sast:
	@command -v opengrep >/dev/null 2>&1 || { echo "❌ opengrep が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@opengrep scan $(OPENGREP_FLAGS) --error $(OPENGREP_TARGETS)

# 取り込み用。ここでは落とさない（落とす判断は上の sast が持つ）。
sast-sarif:
	@command -v opengrep >/dev/null 2>&1 || { echo "❌ opengrep が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@opengrep scan $(OPENGREP_FLAGS) --sarif --output $(SAST_SARIF_FILE) $(OPENGREP_TARGETS)

# 書き出し先。CI が上書きする。
SAST_SARIF_FILE ?= opengrep.sarif
