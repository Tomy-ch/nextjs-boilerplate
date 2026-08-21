## 落ちた基準画像を手元で見直す
#
# 見るのは「落ちた実行が判定した木」なので、いま編集している木は動かさない。使い捨ての作業ツリーを
# tmp/review/ の下へ生やし、そこで Storybook (story 単位) かアプリ (画面単位) を立てて、落ちた対象の
# URL を並べる (vrt/README.md / e2e/README.md)。
#
# 引数は CI のコメントがそのまま書き出す。撮影 (vrt.mk / e2e.mk) と入口を分けてあるのは、こちらが
# 比較も撮り直しも行わず、コンテナも置き場も要らないため。
.PHONY: vrt-review ## 落ちた story を使い捨ての作業ツリーで開く (CI のコメントが出す 1 行)
.PHONY: e2e-review ## 落ちた画面を使い捨ての作業ツリーで開く (CI のコメントが出す 1 行)
.PHONY: review-clean ## 見直しで生やした作業ツリーを登録ごと片付ける

# 見る対象のブランチと、CI の実行 id。RUN を渡すと、その実行が撮った一式も落として配る。
BRANCH ?=
RUN ?=

# 見る範囲。撮影の側 (vrt.mk / e2e.mk) が持つ VRT_ONLY / E2E_ONLY と同じ集合を、同じ名前で受ける。
# 宣言をここでも持つのは、片方のファイルの宣言に暗黙依存すると include の順序を変えただけで静かに
# 空になるため。
VRT_ONLY ?=
E2E_ONLY ?=

# 待ち受けるポート。開発サーバ (3000) / Storybook (6006) / make e2e (3100) のどれとも別にする。
# 塞がっていれば手前で止まるので、そのときは空いている番号をここへ渡す。
VRT_REVIEW_PORT ?= 6106
E2E_REVIEW_PORT ?= 3200

vrt-review:
	@pnpm exec tsx scripts/review vrt \
		--branch "$(BRANCH)" --only "$(VRT_ONLY)" --run "$(RUN)" --port $(VRT_REVIEW_PORT)

# 起動するのは本番ビルドである。画面の基準画像はそれで撮られているので、開発サーバで見ると
# 判定された絵とは別のものを見ることになる。
e2e-review:
	@pnpm exec tsx scripts/review e2e \
		--branch "$(BRANCH)" --only "$(E2E_ONLY)" --run "$(RUN)" --port $(E2E_REVIEW_PORT)

# 片付けは git の登録から先に外す。ディレクトリだけ消すと .git/worktrees に実体を失った登録が残り、
# 次に同じブランチを見ようとしたときの `git worktree add` がそこで断られる。
review-clean:
	@pnpm exec tsx scripts/review clean
