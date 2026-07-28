## 依存脆弱性スキャン（Trivy）
.PHONY: trivy-fs ## 依存ライブラリの脆弱性を Trivy fs でスキャンする

# node_modules は pnpm-lock.yaml と同じ依存を二重計上するため除外する。
# .claude/worktrees は git worktree の実体であり、別ブランチの依存を本体の結果に混ぜないため除外する
# （trivy は .gitignore を見ないので、ignore 済みでも指定しないと走査される）。
# --skip-version-check: trivy 自身の更新確認の通信を止める（版は mise.toml が SSOT）。
TRIVY_SKIP_FLAGS := --skip-dirs node_modules --skip-dirs .claude/worktrees --skip-version-check

# --ignore-unfixed で修正版のある脆弱性だけを対象にし、exit code では落とさない（報告専用）。
# 修正版のない脆弱性はこの変更が持ち込んだものではないため push を止める理由にならず、
# 未修正分まで含めた厳格判定は保護ブランチ宛の昇格ゲートが CI 側で持つ
# （docs/adr/0110-security-operations.md）。
# .trivyignore.yaml は自動検出に頼らず --ignorefile で明示し、抑止の適用先を本ターゲットに閉じる。
trivy-fs:
	@command -v trivy >/dev/null 2>&1 || { echo "❌ trivy が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください。"; exit 1; }
	@trivy fs --scanners vuln --pkg-types library --severity CRITICAL,HIGH,MEDIUM --ignore-unfixed --ignorefile .trivyignore.yaml $(TRIVY_SKIP_FLAGS) .
