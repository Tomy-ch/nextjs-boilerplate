## データフロー検査（Bearer）
.PHONY: bearer-scan ## 値がプロセスの外へ出る地点を、その値の分類と併せて見る

# Bearer は「値がプロセスの外（log 行 / 外向き要求 / 第三者クライアント）へ出る地点」を、その値が
# 何かの分類と併せて報告する。opengrep も CodeQL もパターンや taint 経路をそれ自体の条件で判定
# するだけで、**logger へ届いた文字列がメールアドレスであること**は知らない。
#
# **落とさない。** baseline が 0 件ではないため（誤検知の傾向が強く、抑止で 0 へ寄せると
# 「ルールの一括無効化」に近づく）。所見は code scanning へ送り、その変更が新しく持ち込んだ
# ものだけを GitHub 側の差分チェックが赤にする。CodeQL と同じ配線
# （docs/adr/0110-security-operations.md）。
#
# 除外は 2 つだけで、どちらも「秘密ではないと分かっている値」である。パスは走査の起点からの相対。
BEARER_SKIP := config/environment.fixture.ts,adapters/server/auth/development-token.ts

bearer-scan:
	@command -v bearer >/dev/null 2>&1 || { echo "❌ bearer が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@bearer scan src --exit-code 0 --skip-path '$(BEARER_SKIP)' $(BEARER_ARGS)
