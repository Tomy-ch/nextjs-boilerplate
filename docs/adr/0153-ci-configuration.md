# CI 構成

GitHub Actions の **job 分割 / trigger 戦略 / CI ハードニング(SHA ピン・concurrency・最小 permissions)/ hooks mirror / required check / キャッシュ / matrix** を定める。go-boilerplate の workflows 運用(ADR 0073 / 0078)を翻案し、job 中身を TS 系ツールに差し替える。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([決定 5](../plan/pre-implementation-decisions.md))。本 ADR の内容自体はユーザ決定済み(go 準拠の翻案。plan「決定不要」表 B9)。日付 2026-07-13。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

AGENTS.md の `[TODO] CI Configuration`(BACKLOG B9)は、GitHub Actions の job 分割・required check・キャッシュ戦略・matrix・hooks との二重化を未決とし、暫定運用として「`.github/workflows/` を勝手に足さない / lint・typecheck・build をローカルで回す」を敷いていた。本 ADR がこれを確定させる。

go-boilerplate は workflows を **「1 関心事 = 1 ワークフロー」** で分割し、**SHA ピン**(**go 側**の ADR 0078)/ concurrency / 最小 permissions / **hooks mirror CI**(**go 側**の ADR 0073)/ upsert-pr-comment を共通ハードニングとする。本 ADR はこの骨格を言語非依存で翻案し、job 中身を biome / tsc / next build / vitest / playwright に差し替える。

**注意**: 本 ADR が言う「no-Docker」は本リポの [0011](0011-no-docker.md) を指す(go 側の ADR 0004 は別内容 = modular monolith)。go 側の Docker 前提ジョブ(image-scan / migration / boot-check 等)は本リポでは対象外。

## 決定

### 1. job 分割 = 1 関心事 = 1 ワークフロー

- ワークフローは関心事ごとに分ける(go 翻案)。本リポの CI job:
  - **lint**(`pnpm lint:ci` = biome full profile)/ **typecheck**(`pnpm typecheck` = tsc)/ **build**(`next build`。[0030](0030-environment-variable-management.md) のビルド時 env 全量検証を含む)/ **test**(vitest)/ **e2e**(playwright)
  - **境界検査**: ESLint boundaries は `lint:ci` に直列で載る([0002](0002-formatter-linter.md) / [0021](0021-frontend-responsibility.md))
  - **起動スモーク**: go の boot-check(実 graph 起動検査)の翻案として、`pnpm build` → `next start` → `curl /` ポーリングの起動検査を持つ(plan「決定不要」表 B9 / 移植計画 PR 2-1)
  - **生成物 drift ゲート**(型生成。[0072](0072-api-type-generation.md))/ **カバレッジゲート**(90%。[0090](0090-testing-strategy.md))。カバレッジの **PR レポート**([0090](0090-testing-strategy.md) が B9 へ引き渡した項)は下記 5 の PR コメント upsert 基盤で出力する(go octocov 相当。具体ツールは実装 PR で確定)
- go 固有ジョブ(migration / sql-lint / gen-go-check 等)は本リポでは対象外(言語・DB 固有。生成物 drift は上記の型生成 drift ゲートが担う)

### 2. trigger 戦略

- グループ分け(go の trigger 戦略表の翻案): **CI Checks**(全 PR / マージブロック)/ **Security**(全 PR + 週次スケジュール。[0110](0110-security-operations.md) B10)/ **Deployment**(保護ブランチへの push)/ **Documentation**(portal 配信。[0141](0141-portal-operations.md) D2)
- ブランチ運用は [0150](0150-git-workflow.md) に従う(`production` / `staging` / `develop` / `release/**`)

### 3. CI ハードニング(言語非依存・go からそのまま)

- **SHA ピン**: `uses: owner/repo@<40hex> # <tag>` 形式で actions を SHA ピンする(go ADR 0078 の翻案)。tag→SHA の SSOT を持ち、`--min-age-days` 相当の検疫で新規リリースを一定期間採用しない。CI で pin 検査を行い、未ピンは fail-closed。運用スキルは `actions-pin`(移植候補 C-6。依存監査系のため [0154](0154-claude-skills-operations.md) 運用系の体系に置く — `tools-upgrade` と同系)
- **concurrency**: 全ワークフローで `group: ${{ github.workflow }}-${{ github.ref }}` / `cancel-in-progress: true`(古い実行をキャンセル)
- **最小 permissions**: トップレベルを `contents: read` に絞り、job で必要分(`pull-requests: write` 等)のみ加算する二段構え

### 4. hooks mirror CI(go ADR 0073 翻案)

- lefthook([0151](0151-git-hooks.md))で「local == CI」を二重化する。**local hook = 高速フィードバック**(glob 絞り・キャッシュ有効)、**CI = 権威**(full・キャッシュ無効・drift ゲート)([0090](0090-testing-strategy.md) 二層実行と一致)
- 設計原則: glob-scoped(変更ファイル種別で hook を絞る)+ bypass-then-verify-once(commit split 中は `--no-verify`、最後に 1 回検証)。pre-push ではテスト(キャッシュ有効)/ typecheck を回し CI 到達前に落とす([0151](0151-git-hooks.md) の段階責務・速度目標 < 30 秒に従う。go 0073 の「pre-push = full test・キャッシュ無効」は、速度目標と [0090](0090-testing-strategy.md) 二層実行(ローカル = キャッシュ有効)に合わせて翻案し、full・キャッシュ無効・drift ゲートは CI 側に置く)

### 5. required check / PR ゲート

- 解析ステップは即 fail させず結果を capture → **PR コメントを upsert**(HTML マーカーで既存コメント検出 → update / create。go `upsert-pr-comment` の翻案。言語非依存でほぼそのまま)→ 最後に fail-closed(`exit 1`)
- 保護ブランチは required check + high-severity 検出でマージブロック([0150](0150-git-workflow.md) / [0110](0110-security-operations.md))
- **required check の粒度**(どの job を必須にするか)は実装 PR で確定する(lint / typecheck / build / test を基本必須、e2e は選択)

### 6. キャッシュ / matrix

- **キャッシュ**: `actions/setup-node` の `cache: pnpm`(+ `cache-dependency-path: pnpm-lock.yaml`)。加えて `next build` キャッシュ(`.next/cache`)を `actions/cache` で保持(go に相当なし・本リポ新設)
- **matrix = 非採用**: `runs-on: ubuntu-latest` 単一、Node バージョンは `mise.toml` を SSOT とし matrix 展開しない(go の単一ランタイム方針の翻案。[0003](0003-version-manager.md))

## 禁止事項

- ❌ actions を SHA ピンせず moving tag で使うこと(検疫付き SHA ピン必須)
- ❌ ワークフローに広い permissions を与えること(read-only 既定 + 局所加算)
- ❌ concurrency 制御なしで PR ごとに旧実行を積むこと
- ❌ CI を通すために hook を恒久 bypass すること(local == CI の二重化)
- ❌ go 固有ジョブ(image-scan / migration 等)を no-Docker の本リポに持ち込むこと([0011](0011-no-docker.md)。なお boot-check は上記の起動スモークとして翻案採用済み)

## 補足

- 本 ADR の Accepted に伴い、AGENTS.md の `[TODO] CI Configuration` 節の削除・書き換えを実施する(未実施 — AGENTS.md は Protected Documentation のため、変更案の提示とユーザ承認を経て適用する)
- workflows の実装・required check 指定・`actions-pin`(C-6)移植は本 ADR Accepted 後の実装 PR(移植計画 Phase 2)。portal 配信([0141](0141-portal-operations.md) D2 Phase 3)は Phase 2 完了後

## 関連 ADR

- [0151-git-hooks.md](0151-git-hooks.md) — lefthook(hooks mirror CI の local 側)
- [0090-testing-strategy.md](0090-testing-strategy.md)(B8)— 二層実行 / カバレッジゲート(CI job の中身)
- [0002-formatter-linter.md](0002-formatter-linter.md) — `lint:ci`(biome full + ESLint boundaries 直列)
- [0072-api-type-generation.md](0072-api-type-generation.md)(B4)— 生成物 drift ゲート(CI 組込み先)
- [0110-security-operations.md](0110-security-operations.md)(B10)— Security グループ(CodeQL / Trivy / gitleaks / Dependabot)
- [0141-portal-operations.md](0141-portal-operations.md)(D2)— Documentation グループ(GitHub Pages 配信)
- [0150-git-workflow.md](0150-git-workflow.md) — ブランチ運用 / 保護ブランチ(required check の適用先)
- [0011-no-docker.md](0011-no-docker.md) — no-Docker(image-scan 等の対象外ジョブの根拠)
- [0030-environment-variable-management.md](0030-environment-variable-management.md)(A7)— ビルド時 env 全量検証(build job への組込み先)
