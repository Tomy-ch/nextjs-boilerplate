## 依存脆弱性スキャン（OSV）
.PHONY: osv-scan ## 依存ライブラリの脆弱性を OSV データベースで見る（報告専用）
.PHONY: osv-scan-release ## 昇格前に OSV の HIGH 以上でゲートする

# Trivy とも pnpm audit とも参照するデータベースが違う。件数は一致せず、突合して差分を潰そうと
# しない —— 和集合を正とし、どれか 1 つでも閾値に達したものを blocking として扱う
# （docs/adr/0110-security-operations.md 3）。
#
# 抑止は osv-scanner.toml が持つ。理由と撤回条件を各エントリへ書く様式は他のスキャナと同じ。
OSV_FLAGS := --lockfile pnpm-lock.yaml --config osv-scanner.toml

# 報告専用。Trivy の報告側と同じ理由で落とさない（3.1）。
osv-scan:
	@command -v osv-scanner >/dev/null 2>&1 || { echo "❌ osv-scanner が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@osv-scanner scan source $(OSV_FLAGS) || true

# 昇格（保護ブランチ宛 PR）の一点だけがゲート。osv-scanner は検出があれば非ゼロで終わるので、
# severity の閾値はここでは持たない —— 範囲は Trivy の昇格ゲートと揃えてある。
osv-scan-release:
	@command -v osv-scanner >/dev/null 2>&1 || { echo "❌ osv-scanner が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@osv-scanner scan source $(OSV_FLAGS)
