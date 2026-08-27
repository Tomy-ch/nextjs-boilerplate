---
test-requirement: unit
coverage-exclusions:
  - "scripts/*/index.ts"
  - "scripts/lighthouse/diagnose.ts"
  - "scripts/openapi/check-generated.ts"
  - "scripts/openapi/extract-limits.ts"
  - "scripts/openapi/fetch-api.ts"
  - "scripts/portal/build-site.ts"
  - "scripts/portal/gen-*.ts"
  - "scripts/setup/*/index.ts"
  - "scripts/setup/lib/runtime.ts"
---

# scripts

リポジトリを検査・生成・操作する道具を置く。アプリの振る舞いではないので、suite も CI のジョブも
アプリ本体と分けてある（[0090](../docs/adr/0090-testing-strategy.md)）。設定は
[`vitest.scripts.config.ts`](../vitest.scripts.config.ts)。

## 負う観点

**`unit`。**値を渡して答えを確かめる。ここに居るのは lint とゲートそのもので、壊れると「違反なし」を
報告する向きに倒れる。だから見るのは分岐が実行されたかではなく、**その分岐に固有の結果が出ているか**
である（[testing-conventions](../docs/testing-conventions.md)）。カバレッジは 100% を課しているので、
数字の側は情報を持たない。

外から来る文書を読むモジュール（Playwright のレポート、`git` の出力、レジストリの応答）は、**形が
崩れた入力を観点に含める。**0 件へ縮退させると「失敗なし」と読めてしまう。

## 検査から外すもの

宣言は [`lib/untested-modules.ts`](lib/untested-modules.ts) が持ち、カバレッジの母数と 1:1 ゲートが
同じ配列を読む。入口ファイル・契約からの生成物・判定を持たないモジュールの 3 つで、それぞれ理由と
撤去条件を添えてある。**外すのは検査が意味を持たないものだけ**で、「いまは書けていない」は理由に
ならない。

## 実行

| コマンド | いつ |
| --- | --- |
| `make scripts-test-cached` | pre-commit |
| `make scripts-test` | pre-push / CI（`scripts-check`）。カバレッジ 100% を課す |
