## リポジトリの初期化
.PHONY: setup-repo ## リポジトリの初期化
.PHONY: setup-replace-license-copyright ## node_tool_runnerでLICENSEの著作権表示更新を実行

SETUP_DRY_RUN_FLAG := $(if $(DRY_RUN),--dry-run,)

setup-repo:
	@echo "🔧 設定を確認中..."

	@if git rev-parse --verify refs/tags/v0.0.0 >/dev/null 2>&1; then \
		echo "❌ タグ 【v0.0.0】 があります。初期化を停止します。"; exit 1; \
	fi

	@echo "✅ 初期化を開始します"

	@echo "🔧 ghコマンドのログインを開始します..."
	@make gh-login
	@echo "✅ ghコマンドのログインが完了しました。"

	@echo "🔧 タグの初期化を開始します..."
	@TAGS=$$(git tag); \
	if [ -n "$$TAGS" ]; then \
		for tag in $$TAGS; do \
			git tag -d $$tag; \
			git push origin :refs/tags/$$tag || true; \
		done; \
		echo "🧹 すべてのタグを削除しました。"; \
	else \
		echo "🟡 削除対象のタグが存在しません。"; \
	fi
	@echo "✅ タグの初期化を終了します。"

	@echo "🔧 v0.0.0のタグ打ちを開始します..."
	@git tag -a v0.0.0 -m "Initial boilerplate tag"
	@git push origin v0.0.0
	@echo "✅ v0.0.0のタグ打ちが完了しました。"

	@echo "🔧 ブランチ作成を開始します..."
	@if git show-ref --verify --quiet refs/heads/develop; then \
		echo "🟡 ブランチ 【develop】 は既に存在します。作成処理をスキップします。"; \
	else \
		git branch develop; \
	fi

	@if git show-ref --verify --quiet refs/heads/staging; then \
		echo "🟡 ブランチ 【staging】 は既に存在します。作成処理をスキップします。"; \
	else \
		git branch staging; \
	fi

	@if git show-ref --verify --quiet refs/heads/production; then \
		echo "🟡 ブランチ 【production】 は既に存在します。作成処理をスキップします。"; \
	else \
		git branch production; \
	fi

	@git push origin develop staging production
	@echo "✅ ブランチの作成を終了します。"

	@echo "🔧 デフォルトブランチの設定を開始します..."
	@REPO=$$(gh repo view --json name,owner -q '.owner.login + "/" + .name'); \
		gh api -X PATCH repos/$$REPO -f default_branch=production

	@git fetch --prune
	@ORIGINAL_BRANCH=$$(git branch --show-current); \
	git checkout production; \
	if echo $$ORIGINAL_BRANCH | grep -q "release/"; then \
		git branch -D $$ORIGINAL_BRANCH; \
		git push origin --delete $$ORIGINAL_BRANCH || true; \
	fi
	@echo "✅ デフォルトブランチの設定を終了します。"

	@echo "🔧 ルールセットの適用を開始します..."
	@make apply-branch-protection
	@echo "✅ ルールセットの適用を終了します。"

	@echo "🔧 ラベルの初期化を開始します..."
	@make delete-all-labels
	@make create-default-labels
	@echo "✅ ラベルの初期化を終了します。"

	@echo "🔧 リリースノートの初期化を開始します..."
	@if [ -d ".github/release" ]; then \
		find .github/release -type f ! -name "v0.0.0.md" -delete; \
		echo "🧹 v0.0.0.md 以外のリリースノートを削除しました。"; \
	else \
		echo "🟡 .github/release ディレクトリが存在しないためスキップします。"; \
	fi
	@echo "✅ リリースノートの初期化を終了します。"

	@git remote remove upstream || true
	@echo "✅ Initialization complete. Default branch: production"

setup-replace-license-copyright:
	@if [ -z "$(COPYRIGHT_HOLDER)" ]; then \
		echo "❌ COPYRIGHT_HOLDER を指定してください。例: make setup-replace-license-copyright COPYRIGHT_HOLDER='Example Inc.' COPYRIGHT_YEAR=2026"; \
		exit 1; \
	fi
	@pnpm exec tsx scripts/setup/replace-license-copyright.ts \
		--holder "$(COPYRIGHT_HOLDER)" \
		$(if $(COPYRIGHT_YEAR),--year $(COPYRIGHT_YEAR),) \
		$(SETUP_DRY_RUN_FLAG)
