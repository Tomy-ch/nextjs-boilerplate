## シークレットスキャン（gitleaks）
.PHONY: secret-scan ## push 予定のコミットのシークレットを gitleaks でスキャンする

# --redact: 検出値そのものを出力しない（hook / CI のログ経由の二次漏洩を防ぐ）
# --no-color: 非 TTY（lefthook / CI）で ANSI エスケープが化けないようにする
# 検出時は exit 1 で落ちる。秘密混入は fail-closed（docs/adr/0110-security-operations.md）。

# 走査対象は「HEAD から辿れて、どのリモートにも存在しないコミット」= これから push される範囲。
# 作業ツリーを見る dir モードを使わないのは、それが守りたい境界とずれているため:
#   - commit した後に作業ツリーから消した秘密を取りこぼす（blob は履歴に残り push される）
#   - push されない gitignore 済みファイル（env/.env.local 等）を誤検知し、hook の bypass 常用を招く
# リモート追跡参照が 1 つも無い状態（fork 直後の初回 push 等）では履歴全体が対象になる。
# 対象が広がる方向であり、取りこぼす方向ではない。
secret-scan:
	@command -v gitleaks >/dev/null 2>&1 || { echo "❌ gitleaks が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@gitleaks git . --no-banner --redact --no-color --log-opts="HEAD --not --remotes"
