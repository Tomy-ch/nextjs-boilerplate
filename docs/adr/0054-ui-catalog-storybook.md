# UI カタログ(Storybook)方針

コンポーネントの視覚的仕様の置き場 = **UI カタログ(Storybook)の採否**(#37)を確定する。これは機能 seam ではなく **開発ツール選択** であり、[0091](0091-test-verification-methods.md) §3 が当初「非採用 exclusion(tooling defer)」として着地させていた主題を、**ユーザの採用決定に伴い採用 decision へ転じた別 ADR として独立確定**する。

> **由来注記**: 本 ADR は [0091](0091-test-verification-methods.md)(旧「テスト・カタログ方針」)が束ねていた §3 Storybook / UI カタログを、ユーザの「1 ADR = 1 主題」方針に従って分離したピースである。0091 はテスト検証手段(async RSC テストの寄せ先 / a11y 自動テストの組込)に縮約され、UI カタログの帰属は本 ADR が所有する。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。独立起票。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない。**実装中に不都合が出たら本 ADR を補正する前提**）

## 背景

**Storybook 等の UI カタログ**の採否(遡及監査 #37)は、[0141](0141-portal-operations.md) の portal がドキュメント portal であって UI カタログではないため、コンポーネントの視覚的仕様の置き場が未定義のまま残っていた。triage はこれを「機能 seam でない開発ツール選択 = tooling defer」と判定し、旧 [0091](0091-test-verification-methods.md) §3 は当初これを **非採用 exclusion**(カタログ性は `components` カーネルの層別 README で担保 / `.stories.*` は存在しない前提)として着地させていた。

その後 **ユーザが Storybook / UI カタログの採用を決定**した。tooling defer の exclusion は「fork 先が要件に応じて足すのは妨げない」余地を残しており([0140](0140-documentation-operations.md) セットアップ時の直接編集による独自ベースライン)、本 boilerplate 自身がその余地を行使して採用ベースラインへ倒す判断である。採否が非採用 → 採用へ転じたため、旧 exclusion を上書きするのではなく、機能 seam でない開発ツール選択の 1 主題として本 ADR で採用 decision を確定する。

## 決定

- **UI カタログとして Storybook を boilerplate 本体に採用する**(採用 decision)。コンポーネントの視覚的仕様・使い方・状態バリエーションのカタログ置き場を Storybook が担う
- **カタログ性は Storybook を第一の担保とし、`components` カーネルの層別 README([0021](0021-frontend-responsibility.md) per-package README / [0141](0141-portal-operations.md) portal)の叙述と併走**させる。README は責務・設計意図の叙述、Storybook は視覚的仕様・インタラクションのカタログという役割分担で、ドキュメント portal(0141)と UI カタログを混同しない
- **`.stories.*` ファイルは対象コンポーネントに co-locate する**([0027](0027-directory-structure.md) の co-location に story ファイルを乗せる)。旧 0091 §3 が「非採用ゆえ co-location に story の扱いを足す必要はない」とした帰結は、採用に伴い反転する — story ファイルの co-location 扱いを 0027 の co-location 方針に含める(監査 #37 が指摘した co-location の曖昧点は、非採用ではなく採用側で解消する)
- Storybook 本体および addon の依存追加は **exact pin + `pnpm audit`**([0004](0004-library-management.md))。バージョン方針・CI 上のビルド/デプロイ組込は実装 PR / B9(CI 構成)へ引き渡す(本 ADR では二重に決めない)
- **story は「そのコンポーネントが何のためにあるか」を、開いた canvas から読める形で示す。** default 1 本で終えず、その部品自身が表現する状態(variant / disabled / invalid / 開いた状態など)へ canvas 上で到達できるようにする。**story 名が約束した状態に canvas が届いていないものはカタログとして成立していない**
- **画面固有の業務語彙・API・route を story に埋め込まない。** カタログは boilerplate を利用する人が参照する中立な面であり、業務文脈を伴う実例は feature 側の story か画面実装に置く
- **story の表示分類は実装の配置や依存方向を決めない。** 分類は閲覧のためのものであり、`title` の具体的な体系は `components/README.md` が所有する(本 ADR では固定しない)
- **a11y の自動検査を Storybook に載せる。** addon による検査を各 story に効かせ、違反ゼロを取り込みの完了条件に含める([0100](0100-accessibility-target.md) の自動検査手段の 1 つ)

## 禁止事項

- ❌ Storybook を「機能 seam」として扱い、アプリ本体のランタイム経路や機能フラグに結合させること(あくまで開発ツール = カタログである)
- ❌ ドキュメント portal([0141](0141-portal-operations.md))と UI カタログ(Storybook)の役割を混同し、叙述ドキュメントを Storybook へ、視覚カタログを portal へ二重化すること
- ❌ `.stories.*` を co-location 外(集約ディレクトリ等)に散在させること([0027](0027-directory-structure.md) co-location に従う)
- ❌ Storybook / addon 依存を exact pin / `pnpm audit` なしに追加すること([0004](0004-library-management.md))
- ❌ Storybook のバージョン固定方針・CI ビルド組込を本 ADR で確定すること(実装 PR / B9 が所有。二重決定しない)

## 補足

- **#37 の性質の転換**: 旧 [0091](0091-test-verification-methods.md) §3 は #37 を [0140](0140-documentation-operations.md) タクソノミー上の **exclusion**(名前付きの非採用判断)として着地させた。本 ADR はユーザ採用決定を受けて同じ #37 を **採用 decision** へ転じる。したがって「カタログ性は層別 README のみで担保 / `.stories.*` は存在しない」という旧 §3 の帰結は本 ADR が上書きし、Storybook + README 併走 / story co-location へ更新される
- Storybook の具体的な設定(builder / framework 統合・visual regression 連携〈#71〉等)は本 ADR の射程外で、実装 PR で確定する。visual regression(#71)は依然 tooling defer であり、Storybook 採用がそれを自動的に確定させるものではない
- 本 ADR は機能 seam でない開発ツール選択であり、[0090](0090-testing-strategy.md) のテスト層(unit / component / integration / e2e)とは独立である。テスト検証手段の確定は [0091](0091-test-verification-methods.md) が所有する

## 関連 ADR

- [0091-test-verification-methods.md](0091-test-verification-methods.md) — 本 ADR の分割元(旧「テスト・カタログ方針」§3)。現在はテスト検証手段(RSC 寄せ先 / a11y 自動テスト)へ縮約
- [0141-portal-operations.md](0141-portal-operations.md) — ドキュメント portal(UI カタログではない)。Storybook と役割分担
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — per-package README(カタログ性の併走供給元)
- [0027-directory-structure.md](0027-directory-structure.md) — co-location(`.stories.*` の配置先。採用に伴い story ファイルを co-location 対象に含める)
- [0140-documentation-operations.md](0140-documentation-operations.md) — タクソノミー / セットアップ時の直接編集による独自ベースライン(exclusion → 採用への転換根拠)
- [0004-library-management.md](0004-library-management.md) — Storybook / addon 依存の exact pin / audit
- BACKLOG B9(CI 構成)— Storybook のビルド / デプロイ CI 組込の所有先
