# セキュリティ運用

**依存更新(Dependabot + cooldown)/ 秘密スキャン(gitleaks)/ 脆弱性スキャン(Trivy fs 二段・CodeQL)/ 依存監査ゲート / SECURITY.md / 多層防御** を定める。go-boilerplate のセキュリティ運用(ADR 0077 多層防御)を翻案し、no-Docker([0011](0011-no-docker.md))で対象外になる部分を exclusion として記録する(go ADR 0078 の SHA ピンは CI ハードニング側の主題であり、本リポでは [0153](0153-ci-configuration.md) が持つ)。

## Status

Accepted (一部 exclusion)

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([0140](0140-documentation-operations.md))。本 ADR の内容自体はユーザ決定済み(go 準拠の翻案。設計フェーズの「決定不要」表 B10)。日付 2026-07-13。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

AGENTS.md の `[TODO] Security Operations`(BACKLOG B10)は、`pnpm audit` 閾値・Dependabot / Renovate・SECURITY.md・秘密スキャンを未決とし、暫定運用として「新規依存追加時に `pnpm audit`([0004](0004-library-management.md))/ セキュリティツールを勝手に CI・pre-commit へ組み込まない」を敷いていた。本 ADR がこれを確定させる。

go-boilerplate は **多層防御**(**go 側**の ADR 0077: SAST + 秘密スキャン + 依存脆弱性 + 到達性フィルタ)/ Dependabot cooldown / gitleaks / Trivy 二段 / CodeQL を確立している。本 ADR はこれを翻案する。

**注意**: 本 ADR の「no-Docker」は本リポの [0011](0011-no-docker.md) を指す(go 側 ADR 0004 は別内容)。go 側の Docker 前提のサプライチェーン機構(image-scan / cosign / SBOM / provenance)は本リポでは**対象外**として exclusion 記録する(後述)。

## 決定

### 1. 依存更新 = Dependabot + cooldown(Renovate 不採用)

- **Dependabot を採用**する(Renovate は不採用)。cooldown(更新 PR を出すまでの待機日数)を semver 別に設定する(go の翻案):
  - **patch = 5 日 / minor = 7 日 / major = 30 日**(default 5 日)。`github-actions` エコシステムは default 5 日
  - **セキュリティアップデートは cooldown をスキップ**して即時 PR
- エコシステムは **`npm`**(+ `github-actions`)。1 エコシステム = 1 グループ PR、open PR 上限・週次。major 更新は別 PR([0004](0004-library-management.md) と一致)

### 2. 秘密スキャン = gitleaks(fail-closed)

- **gitleaks** で秘密スキャンする。設定は `useDefault` + **allowlist に生成物**(生成型 `src/adapters/gen/**`([0072](0072-api-type-generation.md))/ lockfile 等)を除外
- **CI** で回す。PR 全体(path 制限なし = 秘密は任意ファイルに出る)を対象とし、検出時は **fail-closed**。pre-push([0151](0151-git-hooks.md))は typecheck / test のみで gitleaks を含まない。local 側への追加は 0151 の hook 方針が整備された段階で検討する

### 3. 脆弱性スキャン(多層防御・go ADR 0077 翻案)

- **CodeQL SAST**: `languages: javascript-typescript`(go の `go` を差し替え)。trigger = PR + 保護ブランチ push + 週次 cron。`security-events: write` で SARIF アップロード。high-severity はマージブロック(ブロックの実体は branch protection / code scanning の required 設定側。go 同様、workflow 内の hard-fail には依存しない)
- **Trivy fs 二段運用**:
  - **dev PR ゲート**(全 PR・advisory): `scan-type: fs` / `severity: CRITICAL,HIGH,MEDIUM` / **`ignore-unfixed: true`**(修正不能は無視)/ hard-fail しない + PR コメント
  - **release ゲート**(保護ブランチへの PR 限定・厳格): **`ignore-unfixed: false`**(未修正も可視化)で厳格化
- **依存監査ゲート**: **`pnpm audit` を既定**とする。go govulncheck 由来の「到達可能性(reachability)」フィルタは、`pnpm audit` に該当機能がなく、osv-scanner の call analysis も JS/TS 非対応のため、**現行ツールでは実装不能**である。したがって blocking 閾値は **severity(`high` / `critical`)と修正可能性(fixable)** で定める(未修正〈unfixable〉はノイズになりやすいため advisory 扱いとし、修正可能な high 以上を blocking)。運用 SLA(`high` 以上は 48 時間以内に対応着手)は [0004](0004-library-management.md) の既定を維持し、本項はその CI ゲート側の blocking 閾値を定める
- **スキャナ間で検出が食い違う場合は和集合を正とする**。Trivy fs と `pnpm audit` は集計単位(CVE 単位 / advisory 単位)も対象範囲も異なり、同一リポジトリに対して異なる件数を返す。片方だけを正とすると、そのツールが見ない領域(例: `pnpm audit` は npm advisory DB のみを見る)が恒久的な死角になる。**どちらか一方でも blocking 閾値に達したものは blocking として扱う**。両者の件数が一致しないこと自体は異常ではないため、突合して差分を潰そうとしない

### 3.5 CSP 適合ゲート

- **配信ヘッダが [0111](0111-csp-security-headers.md) の宣言と一致することを CI で検査する**。ビルド成果物 / 起動したアプリのレスポンスヘッダを取得し、CSP と主要セキュリティヘッダの有無・値を宣言と突合して fail-closed にする
  - > Rationale: [0111](0111-csp-security-headers.md)
- 対象は CSP と、0111 が定める同伴ヘッダ(`Strict-Transport-Security` / `X-Content-Type-Options` / `Referrer-Policy` / `Permissions-Policy` 等)。**検査するのは「宣言と実配信の一致」**であり、ヘッダの内容そのものは 0111 が正
- 実装は [0153](0153-ci-configuration.md) の Security グループに 1 job として置く([v1 実装計画](../plan/v1-implementation-plan.md) P6-2)

### 4. SECURITY.md

- **`SECURITY.md` を置く**。脆弱性報告フロー(Private Vulnerability Reporting 誘導 / 連絡先 / Supported Versions)を定める(go の報告フロー節の翻案。連絡先は fork 先で差し替える placeholder)
- go の後半「release artifact 検証(cosign / provenance / SBOM)」節は Docker 前提のため**含めない**(下記 exclusion)

### 5. release ゲート vs dev PR ゲート

- **dev PR = advisory 寄り**(Trivy `ignore-unfixed:true` / audit は actionable のみ / CodeQL・gitleaks は fail-closed)、**release(保護ブランチへの PR)= 厳格化**(Trivy `ignore-unfixed:false`。severity リストは dev と同一で、未修正の可視化が差分)。この二段は言語非依存で載る([0153](0153-ci-configuration.md) の Security グループ)。Trivy / CodeQL のマージブロックの実体は required check / branch protection([0150](0150-git-workflow.md))側に置く(go 方式の翻案)

## exclusion(no-Docker で対象外)

go-boilerplate にはあるが、本リポは [0011](0011-no-docker.md)(no-Docker / PaaS・静的 CDN 配送)のため**採用しない**:

- ❌ **コンテナ image スキャン**(Trivy image / SBOM 生成)— アプリ本体の Docker イメージがない
- ❌ **cosign によるイメージ署名 / SLSA provenance / SBOM attestation**(go 側の ADR 0088 相当)— 配送成果物がコンテナイメージでない
- ❌ **Dependabot の `docker` エコシステム**(go は image ディレクトリ群を監査対象に持つ)— 監査対象の Dockerfile がない(上記 1 のとおり `npm` + `github-actions` のみ)
- これらは「意図的にやらない」判断として記録する([0140](0140-documentation-operations.md) タクソノミー: exclusion = ADR)。fork 先が独自にコンテナ配送する場合は fork 先判断で追加する

## 禁止事項

- ❌ Renovate を併用すること(Dependabot に一本化)
- ❌ セキュリティアップデートに cooldown を効かせること(即時 PR)
- ❌ gitleaks / CodeQL の検出を fail-closed にしないこと(秘密・SAST high は必ずブロック)
- ❌ 依存監査を「全 severity 一律 hard-fail」にすること(修正可能な `high` / `critical` のみ blocking = ノイズ抑制。到達可能性フィルタは JS/TS では実装不能)
- ❌ image-scan / cosign / SBOM / provenance を no-Docker の本リポに持ち込むこと([0011](0011-no-docker.md))

## 補足

- 本 ADR の Accepted に伴い、AGENTS.md の `[TODO] Security Operations` 節の削除・書き換えを実施する(未実施 — AGENTS.md は Protected Documentation のため、変更案の提示とユーザ承認を経て適用する)
- セキュリティツールの CI・hook 組込み実装は本 ADR Accepted 後の実装 PR(移植計画 Phase 2 / Phase 1 の秘密・脆弱性スキャン)。`.github/` への追加はユーザ指示のもとで行う(AGENTS.md AI Modification Scope)

## 関連 ADR

- [0153-ci-configuration.md](0153-ci-configuration.md)(B9)— Security グループの CI 組込み(本 ADR の実行基盤)
- [0004-library-management.md](0004-library-management.md) — `pnpm audit` / exact pin / major 別 PR(依存監査の土台)
- [0151-git-hooks.md](0151-git-hooks.md) — pre-push の段階責務(typecheck / test)。gitleaks は CI で実行し、local 側への追加は 0151 の hook 整備段階で検討
- [0011-no-docker.md](0011-no-docker.md) — no-Docker(image-scan / cosign / SBOM exclusion の根拠)
- [0072-api-type-generation.md](0072-api-type-generation.md) — 生成物 `src/adapters/gen/**`(gitleaks allowlist の対象)
- [0150-git-workflow.md](0150-git-workflow.md) — 保護ブランチ(release ゲートの対象)
