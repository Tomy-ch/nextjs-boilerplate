# セキュリティポリシー

## 脆弱性の報告

**公開の issue で報告しないでください。** issue は誰でも読めるため、報告そのものが未修正の
脆弱性の公表になります。

報告は GitHub の **Private Vulnerability Reporting** を使ってください。リポジトリの
**Security** タブ → **Report a vulnerability** から、メンテナだけが読める形で送れます。

<!-- boilerplate-only:replace-begin -->
この機能が無効な fork では、リポジトリのオーナーへ直接連絡してください。
<!-- boilerplate-only:replace-with -->
<!-- = 連絡先: <security@example.com>（fork 先で差し替えてください） -->
<!-- boilerplate-only:replace-end -->

報告に含めてほしいもの:

- 影響を受けるバージョン、または commit
- 再現手順（最小の再現コードがあれば添えてください）
- 想定される影響（何が読めるか / 何が書けるか / 何が止まるか）

## 対応の流れ

| 段階 | 目安 |
| --- | --- |
| 受領の連絡 | 3 営業日以内 |
| 一次評価（影響範囲と severity の判断） | 7 営業日以内 |
| 修正版の公開 | 評価の結果に応じて調整し、報告者へ都度連絡します |

`high` 以上は 48 時間以内に対応へ着手します（[ADR 0004](docs/adr/0004-library-management.md)）。

## サポート対象

| バージョン | サポート |
| --- | --- |
| 最新のリリース | ✅ |
| それ以前 | ❌ |

これは**テンプレートリポジトリ**であり、配信される成果物を持ちません。fork 先が自分の運用に
合わせて上の表を書き替えてください。

## このリポジトリが自分に掛けている検査

多層防御の構成は [ADR 0110](docs/adr/0110-security-operations.md) が持ちます。

| 層 | 手段 | どこで走るか |
| --- | --- | --- |
| 秘密の混入 | gitleaks | pre-push hook と CI（PR は差分、週次で履歴全体） |
| 依存の脆弱性 | Trivy fs / `pnpm audit` | CI。PR は報告、保護ブランチ宛 PR で止める |
| 自分が書いたコード | CodeQL | CI（PR / 保護ブランチへの push / 週次） |
| ワークフロー定義 | zizmor / actionlint | pre-commit hook と CI |
| 依存の更新 | Dependabot + cooldown | 週次 |

**検出を許容する場合は、抑止ファイルに理由と撤回条件を書きます。** 一括無効化はしません
（[ADR 0110](docs/adr/0110-security-operations.md) 3.4）。
