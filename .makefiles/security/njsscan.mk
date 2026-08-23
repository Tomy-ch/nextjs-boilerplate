## Node / JavaScript 特化の SAST（njsscan）
.PHONY: njsscan ## Node / JS 固有の脆弱なパターンを njsscan で検査する
.PHONY: njsscan-sarif ## 同じ検査を SARIF で書き出す（code scanning への取り込み用）

# opengrep（make sast）と対象は重なる。重ねているのは、あちらが汎用のルールセットを当てるのに
# 対し、こちらは **Node / Express / JS の作法に閉じたルール**を持つためで、拾う面が同じでない
# （判断は docs/adr/0110-security-operations.md）。
#
# **エンジンは semgrep 本体である。** opengrep を採った理由（OSS fork なので fork 先へライセンスの
# 判断を渡さない）はここでは通らないが、通す必要も無い —— njsscan が引くのは LGPL-2.1 の OSS CLI で、
# サブプロセスとして呼ぶだけであり、この配布物に semgrep のコードは入らない。
#
# **検査条件は 1 箇所に持つ。** ゲート（text）と code scanning への取り込み（SARIF）が同じ対象を
# 見ていなければ、落ちた内容と Security タブの一覧が食い違う。

# 手で書いたソースだけを対象にする。opengrep と同じ理由で生成物を外す —— 編集できないものの
# 所見は行動につながらず、直す先は契約か生成器になる。
# scripts / docs-viewer を外すのは、njsscan のルールが実行時の Node アプリを前提にしており、
# build 時にしか動かないものへ当てると「外から来ない値」を外から来る値として鳴らすため。
NJSSCAN_TARGETS := src mocks e2e vrt tokens .storybook

# --exit-warning: 所見があれば exit 1。**baseline が 0 件であることがこのゲートの前提**で、
# 0 件だからこそ新しい所見が読み飛ばす対象ではなく信号になる。
njsscan:
	@command -v njsscan >/dev/null 2>&1 || { echo "❌ njsscan が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@njsscan --exit-warning $(NJSSCAN_TARGETS)

# 取り込み用。ここでは落とさない（落とす判断は上の njsscan が持つ）。
NJSSCAN_SARIF_FILE ?= njsscan.sarif

njsscan-sarif:
	@command -v njsscan >/dev/null 2>&1 || { echo "❌ njsscan が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@njsscan --sarif --output $(NJSSCAN_SARIF_FILE) $(NJSSCAN_TARGETS)
