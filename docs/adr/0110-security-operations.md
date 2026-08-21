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

#### 1.1 mise 管理ツールの cooldown(手動 pin)

`mise.toml`([0003](0003-version-manager.md))の pin は Dependabot の対象外で、bump は手作業になる。**同じ検疫原則を適用する**: 窓は blast radius ではなく**上流の検知レイテンシ**に比例させる。悪意ある版が公開されてから撤回されるまでの時間を待つのが目的であり、そのツールが何を壊しうるかとは別の話である。

- **PyPI(`pipx:` backend)= 7 日**。npm と同じ根拠で導く(公開レジストリで、悪性パッケージの検知・撤回が同程度の速さで回る)
- bump では「最新」ではなく**「窓を満たす最新」**を採る。窓のために意図的に 1 つ前を採った pin は、その旨を `mise.toml` のコメントに書く(でないと次の担当者が「古い pin」として無条件に上げる)
- 窓の実装は `tools-upgrade` スキルの `min_age_days`

**エージェントスキルを配布するツールは審査項目が 1 つ増える**。ライブラリはビルド成果物に載るが、この種のツールは**開発者の権限で動き、何をマシン外へ送るかを自分で決める**。したがって pin の bump 時は版番号だけでなく、次の 2 つもレビュー対象とする。

- **CLI 表面の変化** — 上流がサブコマンドを足せば、`.claude/settings.json` の deny が塞いでいるつもりの範囲が黙って穴になる。deny をプラットフォーム名の列挙ではなくパターンで書くのはこのためである([0154](0154-claude-skills-operations.md) 外部スキル)
- **ツールの挙動を書き写したドキュメントとの整合** — `.claude/README.md` は既定値・API を呼ぶ経路・撤去手順を pin された版の事実として書いている。版が動けば同じ場所が古くなる

### 2. 秘密スキャン = gitleaks(fail-closed)

- **gitleaks** で秘密スキャンする。検知ルールは `useDefault` を土台とする
- **pre-push([0151](0151-git-hooks.md))と CI の双方**で回す。検出時は **fail-closed**。hook と CI は同じ `make secret-scan` を呼ぶ(ローカルと CI で振る舞いを揃える)
- **走査対象は「これから送られるコミット範囲」**(`gitleaks git` + `--log-opts`)。作業ツリーのスナップショット(`gitleaks dir`)は採らない。理由は 2 つあり、いずれも**守りたい境界とずれる**ため:
  - **取りこぼす**: commit したあと作業ツリーから消した秘密は、blob として履歴に残り push される。スナップショットには映らない
  - **誤検知する**: push されない gitignore 済みファイル(`env/.env.local` 等 — [0030](0030-environment-variable-management.md))を秘密として検出する。ローカルの正当な秘密で毎回 push が止まれば `--no-verify` の常用を招き、fail-closed が形骸化する
- **コミット履歴全体の走査は CI の定期実行が持つ**。マージ済み履歴に埋もれた秘密を拾う用途で、コミット数に比例して伸びるため hook には載せない
- 検出値はログに出さない(`--redact`)。hook / CI のログ自体が二次的な漏洩経路になるため
- **`useDefault` は gitleaks 本体の global allowlist を同伴する**。node_modules / 各種 lockfile / `.svg` 等が無条件に走査対象外となり、これは `.gitleaks.toml` からは打ち消せない。打ち消すには全ルールを自前で持つことになり既定ルールの更新追随を失うため、**追随を優先して除外範囲を把握したうえで受け入れる**。生成型([0072](0072-api-type-generation.md))など自前の除外は、誤検知が実際に出た時点で下記の抑止ポリシーに沿って追加する

### 3. 脆弱性スキャン(多層防御・go ADR 0077 翻案)

- **CodeQL SAST**: `languages: javascript-typescript`(go の `go` を差し替え)。trigger = PR + 保護ブランチ push + 週次 cron。`security-events: write` で SARIF アップロード。high-severity はマージブロック(ブロックの実体は branch protection / code scanning の required 設定側。go 同様、workflow 内の hard-fail には依存しない)
- **Actions 定義の静的解析(zizmor)**: CI の実行内容そのものを対象にする層。アプリのコードと依存を見る上の 3 者は、`.github/**` に書かれた `run:` や権限の与え方を見ない。**hook と CI の双方**で`--offline` で走らせ、**high の所見で fail-closed**、medium 以下は出力に残す。抑止は`.github/zizmor.yml` に理由付きで宣言し、下記 4 の抑止ポリシーに従う(検査の責務と落とし方は [0153](0153-ci-configuration.md) §1 が正)
- **Trivy fs 二段運用**:
  - **dev ゲート**(全 PR・advisory): `scan-type: fs` / `severity: CRITICAL,HIGH,MEDIUM` / **`ignore-unfixed: true`**(修正不能は無視)/ hard-fail しない + PR コメント
  - **release ゲート**(保護ブランチへの PR 限定・厳格): **`ignore-unfixed: false`**(未修正も可視化)で厳格化。**止めるのはこの一点だけ**である
- **依存監査ゲート**: **`pnpm audit` を既定**とする。go govulncheck 由来の「到達可能性(reachability)」フィルタは、`pnpm audit` に該当機能がなく、osv-scanner の call analysis も JS/TS 非対応のため、**現行ツールでは実装不能**である。したがって blocking 閾値は **severity(`high` / `critical`)と修正可能性(fixable)** で定める(未修正〈unfixable〉はノイズになりやすいため advisory 扱いとし、修正可能な high 以上を blocking)。運用 SLA(`high` 以上は 48 時間以内に対応着手)は [0004](0004-library-management.md) の既定を維持し、本項はその CI ゲート側の blocking 閾値を定める
- **スキャナ間で検出が食い違う場合は和集合を正とする**。Trivy fs と `pnpm audit` は集計単位(CVE 単位 / advisory 単位)も対象範囲も異なり、同一リポジトリに対して異なる件数を返す。片方だけを正とすると、そのツールが見ない領域(例: `pnpm audit` は npm advisory DB のみを見る)が恒久的な死角になる。**どちらか一方でも blocking 閾値に達したものは blocking として扱う**。両者の件数が一致しないこと自体は異常ではないため、突合して差分を潰そうとしない

#### 3.1 脆弱性スキャンを push のゲートにしない

`make trivy-fs` はローカルで手動実行できるが、**pre-push hook には接続しない**([0151](0151-git-hooks.md))。これは「今は検出件数が多いから」という状態依存の判断ではなく、**ゲートの形として成立しない**という判断である。

- **その場で解消できない**。秘密の混入は値を消して commit し直せば当事者だけで解消できる。依存の脆弱性は上流の修正版が出ていなければ解消できず、出ていても上流が推移的依存を pin していれば `pnpm.overrides` で上流の検証外の組み合わせを作るしかない。**自力で通せないゲートはゲートではなく障害物**であり、`--no-verify` の常用を教育する(これは [0151](0151-git-hooks.md) が禁じている状態そのもの)
- **変更と独立に状態が変わる**。CVE が公開されれば、コードを 1 行も変えていない push が昨日と違う結果になる。**変更を対象とするゲートに、変更と無関係に変動する信号は載せられない**
- **判断する権限がその場に無い**。「この脆弱性を抱えたまま出す」は誰かが引き受けるべき判断であり、それが成立するのは昇格(保護ブランチ宛 PR)の場面だけである。push は判断の場ではない

同じ理由で、脆弱性の報告先は **PR コメント**とする。hook の出力はレビューされず記録も残らないため、報告としても機能しない。

秘密スキャンが逆にすべての条件を満たす(その場で解消でき、変更と共に決まり、判断の余地が無い)ことが、両者の扱いが違う理由である。

### 3.4 抑止(ignore)ポリシー

スキャナの検出を許容する手段は、専用の抑止ファイルに限定する。全ファイルの冒頭に同じポリシーを明記し、様式を揃える。

| ファイル | 抑止の単位 |
| --- | --- |
| `.gitleaks.toml` | 検知ルールセットとパス単位の allowlist |
| `.gitleaksignore` | 検出 1 件(フィンガープリント `<path>:<rule-id>:<line>`) |
| `.trivyignore.yaml` | 脆弱性 ID 1 件(`paths` でパスを限定) |

- **ルールやスキャナの一括無効化は禁止**。抑止はファイル単位 or フィンガープリント単位に限定する。範囲を絞らない抑止は、同じ検知を踏む**新規のファイル・依存まで素通りさせる**
- **各エントリに理由を必ず書く**(gitleaks は「なぜ秘密でないか」、Trivy は `statement`)。理由を書けないものは抑止せず、値そのものを消すか依存を上げる
- **条件が変われば削除する**。恒久 allowlist にしない
- 抑止の妥当性そのものはレビュー時の人間判断に残る。機械が強制できるのは「抑止が上記の様式に載っていること」までである
- **本ポリシーが及ぶのは自リポジトリが書いた抑止だけ**である。gitleaks の `useDefault` が同伴する global allowlist(上記 2 参照)や Trivy 本体の既定除外はツール側に埋め込まれており、ここには現れない。**「抑止ファイルが空 = 何も除外されていない」ではない**

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
- ❌ スキャナのルールやチェックを一括で無効化すること(抑止は 3.4 の様式に限る)
- ❌ 理由の書かれていない抑止エントリを置くこと

## 補足

- スキャナのバージョンは `mise.toml` が SSOT([0003](0003-version-manager.md))。hook / CI とも同じ版のバイナリを使う
- `.github/` へのセキュリティ workflow の追加はユーザ指示のもとで行う(AGENTS.md AI Modification Scope)

## 関連 ADR

- [0153-ci-configuration.md](0153-ci-configuration.md)(B9)— Security グループの CI 組込み(本 ADR の実行基盤)
- [0004-library-management.md](0004-library-management.md) — `pnpm audit` / exact pin / major 別 PR(依存監査の土台)
- [0151-git-hooks.md](0151-git-hooks.md) — pre-push の段階責務(本 ADR のスキャンを走らせる第一段)
- [0003-version-manager.md](0003-version-manager.md) — gitleaks / Trivy のバージョン宣言(`mise.toml` が SSOT)
- [0011-no-docker.md](0011-no-docker.md) — no-Docker(image-scan / cosign / SBOM exclusion の根拠)
- [0072-api-type-generation.md](0072-api-type-generation.md) — 生成物 `src/adapters/gen/**`(誤検知が出た場合の allowlist 候補)
- [0150-git-workflow.md](0150-git-workflow.md) — 保護ブランチ(release ゲートの対象)
