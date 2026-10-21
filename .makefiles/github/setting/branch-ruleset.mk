## ブランチ保護ルールを設定する
.PHONY: branch-protection-apply ## .github/settings/ のブランチルールセットを対象リポジトリにPOST

BRANCH_RULESETS := .github/settings/branch-protection.json .github/settings/work-branch-history.json

branch-protection-apply:
	@set -e; \
	REPO=$$(gh repo view --json name,owner -q '.owner.login + "/" + .name'); \
	echo "🔧 $$REPO へブランチルールを適用します..."; \
	for RULESET in $(BRANCH_RULESETS); do \
		RESPONSE=$$(mktemp); \
		if ! gh api \
			--method POST \
			-H "Accept: application/vnd.github+json" \
			-H "X-GitHub-Api-Version: 2022-11-28" \
			/repos/$$REPO/rulesets \
			--input $$RULESET \
			--verbose \
			> $$RESPONSE 2>&1; then \
				echo ""; \
				echo "❌ $$RULESET の適用で gh api が失敗しました。"; \
				echo "------ GitHub API の応答 ------"; \
				cat $$RESPONSE; \
				echo "------------------------------"; \
				echo ""; \
				echo "👉 上のエラーを確認してください。"; \
				echo "👉 API の互換性が原因の場合は、パッケージマネージャで GitHub CLI (gh) を更新してください。"; \
				echo ""; \
				rm -f $$RESPONSE; \
				exit 1; \
		fi; \
		rm -f $$RESPONSE; \
		echo "  ✔ $$RULESET"; \
	done; \
	echo "✅ ブランチルールを $$REPO に適用しました。"
