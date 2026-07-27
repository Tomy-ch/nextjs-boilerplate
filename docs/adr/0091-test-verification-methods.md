# テスト検証手段方針(async RSC テストの寄せ先・a11y 自動テストの組込)

[0090](0090-testing-strategy.md) が明示保留した **async Server Components(RSC)テストの寄せ先**(#70)と、[0100](0100-accessibility-target.md) が手動チェックに委ねていた **a11y 自動テストの組込**(#72)の 2 点を確定する。いずれも既存 ADR の穴を塞ぐ decision であり、[0090](0090-testing-strategy.md) のテストピラミッド(unit / component / integration / e2e)tooling 上に載る **1 ドメイン(テスト層の検証手段)** として本 ADR に束ねる。

> **分割注記**: 本 ADR は当初「テスト・カタログ方針」として **Storybook / UI カタログの採否(#37)** も束ねていたが、ユーザの「1 ADR = 1 主題」方針に従い、Storybook は機能 seam でない開発ツール選択という別主題として [0054](0054-ui-catalog-storybook.md) へ分離した(採否判断も非採用 exclusion → 採用 decision へ転じたため、独立 ADR で再確定)。
>
> **#70 と #72 を分割しない理由(基準の一貫性)**: 0061(入力検証 vs 通知)や 0075(アップロード vs 決済 vs abuse)は **サブ項目が別主題・別関心事**だったため分割した。対して #70(RSC テストの寄せ先)と #72(a11y 自動テストの組込)は、いずれも **「[0090](0090-testing-strategy.md) のテストピラミッド上に載る *検証手段* の追補」という同一主題**であり(0090/0100 は *根拠となる親* であって別主題ではない)、`vitest-axe` / `@axe-core/playwright` も 0090 が採用したテストフレームワーク上に載る。したがって 1 ADR に束ねるのが 1 主題原則に整合する(Storybook のみが *ツール選択* という別主題ゆえ分離した)。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。独立起票。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない。**実装中に不都合が出たら本 ADR を補正する前提**）

## 背景

[0090](0090-testing-strategy.md) は層別責務(unit / component / integration / e2e)を確定したが、「**Server Components のテスト方針 / RSC・route handler・E2E の線引きは、Next.js の現実に合わせて実装時に確定する(本 ADR で先取りしない)**」と明示保留した(遡及監査 #70)。この保留のままだと最初のテスト PR で毎回この議論が再燃し、90% カバレッジゲート(0090)の充足手段も定まらない。0090 は living かつ**実装フェーズ直前**であり、triage は #70 を「前倒し確定は妥当(判定)」と位置づけた。

[0100](0100-accessibility-target.md) は a11y 検証を「biome 静的検査 + 手動チェック」で構成したが、**実行時 DOM に対する自動検査**(ARIA 整合・コントラスト実測)は空白のままだった(遡及監査 #72)。biome(静的)では検出できない観点が AA 目標(0100)の検証で手動レビュー頼みになる。

本 ADR は [0010](0010-standards-and-non-lockin.md) の 2 原則(標準準拠 / 非ロックイン判定)に基づいて 2 点を確定する。

## 決定

### 1. RSC テストの寄せ先(#70 — 0090 保留の前倒し確定)

- **async RSC は E2E(Playwright)/ integration(MSW)側へ寄せる**。unit(Vitest + RTL)の対象は **純粋ロジック(`model` / feature 内純関数。汎用 `utils` 置き場は作らない = [0021](0021-frontend-responsibility.md) 命名規律)に限定**する
- **正当性材料(vendor-independent / [0010](0010-standards-and-non-lockin.md) §2)**: async Server Components はサーバランタイム上のデータ取得に依存して描画されるため、その健全性は **HTTP 境界を含む通し**(ブラウザ経路 = E2E / HTTP をモックした境界 = integration)でこそ検証できる。React Testing Library の `render` は async Server Component を素直に扱えないという **React / Next.js の構造的現実**([0010](0010-standards-and-non-lockin.md) §1「プラットフォームの現実に乗る」)がこの寄せ先を規定するのであって、フレームワークの推奨に明け渡すのではない。unit を純粋ロジックに閉じることで、脆い RSC 描画 mock を積まずに 90% ゲート(0090)を充足できる
- 本 ADR が確定するのは**寄せ先(placement)**である。**MSW モックの具体パイプライン(orval→MSW の契約駆動モック)は B3(#73/#74)の責務**として引き渡し、本 ADR では二重に決めない([0090](0090-testing-strategy.md) の mock 戦略 = MSW / `vi.mock` と接続)

### 2. a11y 自動テストの組込(#72 — 0100 の検証手段の追補)

- **axe-core を実行時 a11y 自動検査として組み込む**。バインディングは 0090 が既に採用した各フレームワークに乗せる = **component 層に `vitest-axe`(Vitest + RTL)/ e2e 層に `@axe-core/playwright`**
- **正当性材料(vendor-independent / [0010](0010-standards-and-non-lockin.md) §2)**: AA 目標(0100)は、biome(静的)が表現できない**実行時 DOM の ARIA 整合・コントラスト**を機械検証する層を必要とする。この必要性は特定ベンダーに依存しない — axe-core は Lighthouse / Deque / 各種 `*-axe` ラッパが共有する事実上の a11y エンジンであり、「axe を正当化から抜いても、実行時 a11y を自動アサートする層を test に敷く」というパターンは AA 準拠それ自体から正当化される(数ある選択肢〈手動のみ / 他エンジン〉から、独立した根拠で axe を 1 要因として選んだ)。`vitest-axe` / `@axe-core/playwright` は 0090 で既決のフレームワークへの標準バインディングゆえに一意
- 依存追加は exact pin + `pnpm audit`([0004](0004-library-management.md))。適用粒度(どの component / 経路に axe アサートを敷くか)は実装 PR、CI 組込は [0153](0153-ci-configuration.md) へ

### 3. visual regression = Playwright のスクリーンショット比較を採用(#71)

- **visual regression を採用**し、実行基盤は **[0090](0090-testing-strategy.md) が既に採る Playwright のスクリーンショット比較**(`toHaveScreenshot()`)とする。追加のサービス・別ランナーは導入しない
- **正当性材料(vendor-independent / [0010](0010-standards-and-non-lockin.md) §2)**: 検出したいのは「意図しない見た目の変化」であり、これは DOM アサートでは表現できない。Playwright は E2E ですでに動いており、スクリーンショット比較はその**組込機能**であるため、専用 SaaS を正当化から抜いても「基準画像との差分を CI で比較する」というパターンは成立する
- **対象は Storybook の story を第一とする**([0054](0054-ui-catalog-storybook.md))。story がコンポーネント在庫リストであり、feature 画面より安定した比較単位になるため。画面単位の比較は主要ジャーニーに限る
- 基準画像は repo にコミットし、更新は**意図的な差分としてレビュー対象**にする。差分許容度(`maxDiffPixelRatio` 等)と OS / ブラウザ差の吸収方法は実装 PR([v1 実装計画](../plan/v1-implementation-plan.md) P6-4)で確定する

## 禁止事項

- ❌ async RSC を unit(Vitest + RTL)で無理に回すこと(脆い server render mock を積む)。E2E / integration へ寄せる
- ❌ unit の対象を純粋ロジック(`model` / feature 内純関数。汎用 `utils` 置き場は作らない = [0021](0021-frontend-responsibility.md) 命名規律)以外へ広げること
- ❌ #70 の MSW モックパイプライン機構を本 ADR で確定すること(B3〈#73/#74〉が所有。二重決定しない)
- ❌ axe(`vitest-axe` / `@axe-core/playwright`)を理由なく無効化すること、a11y 自動検査を feature 実装から切り離して「後付け」にすること([0100](0100-accessibility-target.md) 実装 PR 時担保と接続)
- ❌ a11y 関連依存を exact pin / `pnpm audit` なしに追加すること([0004](0004-library-management.md))

## 補足

- **#70 の性質**: 0090 の「線引きは実装時に確定(本 ADR で先取りしない)」保留の**前倒し確定**である。0090 は living かつ実装フェーズ直前のため妥当(triage 判定)。本 ADR は寄せ先を確定し、mock パイプラインは B3 へ引き渡すことで 0090 の mock 戦略・B3 の契約駆動モックと二重化しない
- axe の per-feature 適用粒度・CI 組込は実装 PR / [0153](0153-ci-configuration.md)(CI 構成)。visual regression(#71)は §3 で採用を確定した(0090 の 4 層への後付け = Playwright 組込機能)
- **UI カタログ(#37)は本 ADR の射程外**。当初束ねていた Storybook / UI カタログ主題は [0054](0054-ui-catalog-storybook.md) へ分離した(採用 decision として再確定)。カタログ性の担保は 0054 が所有する
- 本 ADR の内容(#70/#72)は [0090](0090-testing-strategy.md) が既に引き取った `[TODO] Testing Strategy` の外側にある追補・確定であり、AGENTS.md の追加改変は要さない。本 ADR Accepted に伴う BACKLOG(B8 / C2 関連行)の整合は反映対象

## 関連 ADR

- [0090-testing-strategy.md](0090-testing-strategy.md) — 層別責務 / mock 戦略 / カバレッジゲート(本 ADR が RSC 寄せ先と axe 組込を追補。RSC 保留の前倒し)
- [0100-accessibility-target.md](0100-accessibility-target.md) — WCAG AA / biome 静的検査 + 手動チェック(本 ADR が実行時 a11y 自動検査 = axe を追加)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — 標準準拠 / 非ロックイン(axe・RSC 寄せ先の vendor-independent 正当性材料の根拠)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — utils 置き場を作らない命名規律(unit を純粋ロジックへ閉じる根拠)
- [0004-library-management.md](0004-library-management.md) — a11y 依存の exact pin / audit
- [0054-ui-catalog-storybook.md](0054-ui-catalog-storybook.md) — UI カタログ(Storybook)方針(本 ADR から分離した別主題)
- [0071](0071-bff-api-integration.md)(B3・#73/#74)— MSW モックパイプライン(RSC integration テストの mock 機構の所有先。※ 0071 側に MSW の具体記述は未追記のため実装 PR で確定)/ [0153](0153-ci-configuration.md)(CI 構成)— axe の CI 組込
