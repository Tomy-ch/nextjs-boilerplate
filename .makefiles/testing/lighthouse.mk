## 画面ごとの Core Web Vitals
#
# `e2e/lib/screens.ts` が宣言する画面を 1 枚ずつ Lighthouse で開き、LCP / CLS / TBT を
# performance-budget.yaml の上限と照らす (ADR 0101)。
#
# 起動は画面を通した検証 (e2e.mk) をそのまま使う —— 本番ビルドをホストで起動し、終わったら
# 片付ける。同じものを 2 組持つと、起動待ちも後片付けもポートの衝突検査も二重になり、片方だけを
# 直した状態が生まれる。
#
# **ブラウザはコンテナではなくホストで動かす。**撮影 (vrt / e2e) がコンテナを使うのは、基準画像の
# 一意性がフォントのラスタライズに懸かるためである。ここが比べるのは画素ではなく数値なので、
# 固定すべきはブラウザの版であり、それは pnpm-lock.yaml の @playwright/test が全ての機械で固定
# している。一方で判定は TypeScript で書かれており、node_modules を入れた OS 向けに解決される
# esbuild がコンテナの中では動かない。
.PHONY: lighthouse ## 画面ごとの Core Web Vitals を測り、予算と照らす
.PHONY: lighthouse-report ## 直前の実行が残した LHR から、動いた要素と重い script を引く

# 基準画像は要らない。撮るのではなく測るので、置き場が空でも判定は成立する。代わりに、測る
# ブラウザがホストへ入っていることを確かめる (入っていれば何もしない)。
lighthouse: E2E_PRECHECK := pnpm exec playwright install chromium

# 画面を通した検証 (3100) とも開発サーバ (3000) とも別にする。同じポートを使うと、既に何かが
# 待ち受けている環境で「起動を待つ」が他人のサーバへの疎通で満たされ、その相手を測ってしまう。
lighthouse: E2E_PORT := 3300

# 待ち受けは loopback に固定する。画面を通した検証がホストの宛先を docker の bridge から引くのは
# ブラウザがコンテナの中に居るためで、ここはブラウザもホストに居るのでその経路が要らない。
#
# **固定しないと Linux の CI で落ちる。** bridge の gateway (172.17.0.1 等) で待ち受けると、
# テスト専用の session 発行口が見る Host がその IP になり、開ける宛先の集合
# (src/adapters/server/auth/development-access.ts) のどれとも一致せず 404 が返る。役割の要る画面が
# 開けない。**直すときに宛先の集合を広げてはいけない** —— あれは設定を誤って公開したときに被害を
# 手元へ留める線で、広げれば任意の役割の session を発行する口の露出面がそのぶん広がる。
lighthouse: E2E_HOSTNAME := 127.0.0.1

lighthouse: E2E_COMMAND = E2E_BASE_URL=http://$$hostname:$(E2E_PORT) pnpm exec tsx scripts/lighthouse
lighthouse: e2e-run

lighthouse-report:
	@pnpm exec tsx scripts/lighthouse/diagnose
	@echo ""
	@echo "📄 LHR そのものは tmp/lighthouse/<画面名>-<試行>.json にあります。https://googlechrome.github.io/lighthouse/viewer/ へ落とすと全項目を読めます。"
