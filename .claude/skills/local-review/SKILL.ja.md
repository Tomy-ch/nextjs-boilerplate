> このファイルは `SKILL.md`（canonical / 英語）の日本語参考訳です。スキルとしては読み込まれません（参考用）。

# Local Review

実装者とは**別モデル**で回す、ローカルの敵対的・低バイアスなコードレビュー。Copilot もクラウド `/code-review` も使わない。実装者自身のモデルには盲点があり、その盲点を別モデルで拾うのが本質。`/code-review` の finder → verify パターンを下敷きにしつつ、すべてローカルで完結させ、さらにモックのコンポーネントテストでは構造的に届かない **build + リクエストのランタイム検証** を足す。

## 使うとき

- commit / PR 前に、実装者のモデル単独では出ないセカンドオピニオンが欲しいとき。
- 複数カーネルに跨る変更で、モックのコンポーネントテストは通るが RSC / Client 境界・`src/proxy.ts`・`adapters` のリクエスト経路が未検証のとき。
- バグ・認証/IDOR・レイヤ違反に絞った敵対的パスをかけたいとき。

以下には使わない:

- formatting / style — `pnpm fix` / `pnpm lint:ci`
- 静的な層境界の強制 — ADR [0021](../../../docs/adr/0021-frontend-responsibility.md) Enforcement は `eslint-plugin-boundaries` を選定しているが、**ESLint 実導入 PR はまだ着地していない**。現在の `pnpm lint:ci` は biome のみで、import 方向を一切検査しない。着地するまでは本スキルの `architecture` レンズが境界違反を捕まえる*唯一*の手段なので、静的ゲートが既に走った前提で手加減しないこと。着地後はレンズがその上に載る*意味的*なパスとなり、高シグナルな違反へ絞る。網羅的なレイヤ適合監査は専用の監査スキルの仕事だが、**こちらもまだ実体が無い**（BACKLOG GB-1）
- コメント以外の修正の適用 — コードレンズについてはソースに対し read-only。指摘するだけで直すのはユーザー。（例外: **コメント品質の指摘は Step 5.5 で自動適用する** — 冗長・ナレーション的なコメントは報告で終わらず実際に直す。）

## 中核アイデア — reviewer ≠ implementer

バイアス低減が設計上の制約であって、おまけではない。よって reviewer は **コードを書いた者とは別モデルの subagent** として動く:

- reviewer エージェント（`adversarial-reviewer` / `comment-reviewer` / `review-verifier`）は frontmatter で既定 **`sonnet`**。通常の Opus 実装者と異なる。
- **reviewer のモデルは Step 0 でユーザーが選ぶ。** 選択肢は `fable`（Fable 5）/ `sonnet` / `opus` / `haiku`、および *auto*（実装者と異なるモデルへ解決する既定）。選ばれたモデルは全 reviewer subagent へ `Agent` ツールの `model` 引数で渡す（この引数はエージェント定義の `sonnet` 既定より優先）— 深さなら `opus`、安価な発散なら `haiku`、独立した視点なら `fable`。
- **オーケストレーターは reviewer ≠ implementer を必ず保証する。** ユーザーが本セッションの実装者と同一モデルを選んだ場合、別モデルによるバイアス低減が損なわれる旨を警告し、続行前に確認する。黙って同一モデルにしない。
- reviewer subagent は **read-only**（エージェント定義に Edit/Write 権限なし）— finding を返すだけ。本スキルがソースを変更する唯一の場所は Step 5.5 で、そこでは **オーケストレーター**（subagent ではない）がユーザー確認後にコメント指摘を適用する。コードレンズが自動修正されることはない。

## Step 0 — スコープ確認

即座に `AskUserQuestion`。ベースは `gh repo view --json defaultBranchRef -q '.defaultBranchRef.name'` で取得（本リポジトリのベースは `release/*`）。未マージのコミットがあれば「変更ファイルのみ」を既定、なければ作業ツリー / 指定パスを既定。

```text
質問: どの範囲をレビューしますか？
選択肢:
  - 変更ファイルのみ（ベースブランチとの diff）  ← 未マージのコミットがある場合の既定
  - 作業ツリーの未コミット変更（git status の差分）
  - 特定のパス/ファイルを指定
  - キャンセル
```

### reviewer モデル選択

同じ `AskUserQuestion` 呼び出しの中で（スコープと並ぶ 2 問目として）、reviewer subagent を回すモデルを尋ねる:

```text
質問: レビュアーをどのモデルで実行しますか？（バイアス低減のため 実装者 ≠ レビュアー を推奨）
選択肢:
  - 自動（実装者と異なるモデルを既定選択）  ← 既定
  - fable（Fable 5）
  - sonnet
  - opus（深掘り）
  - haiku（安価・高速な発散パス）
```

*auto* は、実装者が `sonnet` でなければエージェント定義の既定（`sonnet`）へ、`sonnet` なら別ティアへ解決する。ユーザーが実装者自身のモデルを選んだ場合は中核アイデアに従って警告し、続行前に確認する。選ばれたモデルは Step 2 / Step 3 の全 `adversarial-reviewer` / `comment-reviewer` / `review-verifier` の `Agent` 呼び出しへ `model` 引数で渡す。

### フラグ

- `--no-comment` — Step 6 を抑止（PR へ投稿しない）。ローカルレポートのみを出す。**既定は opt-out**: 現ブランチに open な PR があれば、このフラグが無い限り Step 6 が残った finding をインラインレビューコメントとして投稿する。
- `--no-apply` — Step 5.5 を抑止（コメント指摘を自動修正しない）。代わりに報告し、他レンズと同様 Step 6（PR 投稿）へ流す。**既定は適用**: コメント品質の指摘は 1 度の確認後に作業ツリーへ自動修正される。

## Step 1 — コンテキスト収集

- ベース ref を解決しレビュー対象を作る: `git diff <base>...HEAD`（未コミットなら `git diff`）+ 変更ファイル一覧（`git diff --name-only ...`）。
- どの**カーネル / element** が触られたか検出する。何が在るかは ADR [0027](../../../docs/adr/0027-directory-structure.md) の物理レイアウト、各々が何を import してよいかは ADR [0021](../../../docs/adr/0021-frontend-responsibility.md) の依存マトリクスが正: `src/app/**`（3 element — route-segment `page`/`layout` / route-handler `route.ts` / metadata）、`src/features/<name>/**`、`src/model/**`、`src/components/**`、`src/adapters/server/**`・`src/adapters/client/**`、`src/capabilities/**`、`src/stores/**`、`src/config/**`、`src/errors/**`、`src/logging/**`、`src/observability/**` — に加えて**カーネルの外側にある起動 / ビルド境界エントリ**: `src/proxy.ts`、`src/instrumentation.ts`、`next.config.ts`。いくつかのカーネルはまだディスク上に無い（ADR 0027 は対応決定が下りた時点で作成する）ので、全部揃っている前提を置かず実在するものを検出する。
- **リクエスト時の seam** が触られたか — Route Handler（`src/app/**/route.ts`）/ Server Action（`src/features/<name>/actions.ts`）/ `src/proxy.ts` / レスポンスヘッダ設定（`next.config.ts` の `headers()`）/ **layout shell・Provider 合成**（`src/app/**/layout.tsx` — ADR [0026](../../../docs/adr/0026-layout-shell-mount.md)。Provider の欠落は当該ルートが実際に描画されて初めて落ちる）。Step 4-2 を回すかの判定。 <!-- skill-lint-ignore -->
- **生成 API 成果物**（`**/gen/**` — ADR [0072](../../../docs/adr/0072-api-type-generation.md) の型 / zod スキーマ）が触られたか。再生成は全 consumer に波及するので、変更ファイルだけでなくそれを import する `adapters` 変換と feature までレビュー範囲を広げる。
- **`src/**` 配下の非生成な本番 `.ts` / `.tsx`** が触られたか（除外: `*.test.ts(x)` / `*.spec.ts(x)` / `**/gen/**` / `Code generated … DO NOT EDIT` バナーを持つファイル）— `test-gap` レンズへ渡す変更シンボル一覧の材料。
- **そもそもテストランナーが構成されているか**を確認: `package.json` の `test` スクリプト、またはツリー内の `*.test.ts(x)` / `*.spec.ts(x)`。どちらも無ければ `test-gap` レンズは本実行で **無効**（Step 2 参照）— 黙ってスキップせず Step 5 のレポートに明記する。

## Step 2 — Finder の fan-out（別モデル、並列）

全 finder を並列起動（`Agent` 呼び出しを1メッセージにまとめる）。Step 0 でユーザーが選んだ reviewer モデルを全 `Agent` 呼び出しへ `model` 引数で渡す（*auto* がエージェント定義の既定へ解決する場合のみ省略可）。エージェントは 2 種類:

- **コードレンズ**は `adversarial-reviewer` — レンズごとに1体、`agentType: "adversarial-reviewer"`、`label` は `find:security` のように。
- **コメント次元**は専用の `comment-reviewer` — `agentType: "comment-reviewer"`、`label: "find:comment"`。1 段落のレンズより豊かな分類体系を持つコメント特化エージェントで、その finding が Step 5.5 の自動修正へ流れる。

| Finder | エージェント | 起動条件 |
| --- | --- | --- |
| `correctness` | adversarial-reviewer | 常時 |
| `security` | adversarial-reviewer | 常時（Route Handler / Server Action / `src/proxy.ts` / auth / 生成 API のリクエスト・レスポンス型が触られた時は特に） |
| `architecture` | adversarial-reviewer | 常時 |
| `runtime-gap` | adversarial-reviewer | Route Handler / Server Action / `src/proxy.ts` / Provider マウント / 生成 API 成果物が触られた時 — モックのコンポーネントテストが通らない継ぎ目 |
| `test-gap` | adversarial-reviewer | `src/**` 配下の非生成な本番 `.ts` / `.tsx` が触られ、**かつ**テストランナーが構成されている時（Step 1） |
| コメント品質 | **comment-reviewer** | diff がコードコメントを追加/変更した時（ほぼ常時） |

各 `adversarial-reviewer` プロンプトに必ず含める: レンズ名 + その定義、ベース ref + 変更ファイル一覧 + diff、`AGENTS.md` / 該当 `README.md` / 根拠となる ADR へのポインタ。

**`test-gap` レンズの定義**（このレンズは *code-origin* — テストファイルではなく変更された本番ソースを読む）: diff で追加/変更された本番シンボルごとに、論理分岐 / 送出するエラー型 / 境界条件 / null・undefined 防御を列挙し、対応するテストが各々へ到達し *区別可能な形で* アサートしているか確認する — 具体的なエラークラス（`await expect(fn()).rejects.toThrow(SpecificError)`）、区別可能な値や描画状態であって、素の `expect(fn).toThrow()` / `toBeTruthy()` では不足。報告する形は 2 つ: diff で変更された本番シンボルに **テストが一切無い**、および変更シンボルの到達可能な分岐が **未テストまたは空虚なアサート**。各 finding は diff 内の対象行へアンカーし、インライン投稿できるようにする。これは **高シグナルな部分集合** — *変更された*コードの到達可能なギャップを挙げるのであって、モジュール全体のシンボル網羅列挙は行わない。finding は read-only な提案（自動修正しない）。

**`test-gap` はテスト基盤の存在を前提とするゲート付き。** 本リポジトリにはまだテストランナーが入っていない（ADR [0090](../../../docs/adr/0090-testing-strategy.md) は Vitest + RTL + MSW + Playwright を選定しているが、ツール自体は `package.json` に無い）。Step 1 が構成済みランナーを見つけるまで、このレンズを **spawn しない** — 読むテストが無い状態では変更シンボルすべてを「未テスト」と報告し、シグナルではなくノイズになる。有効化はランナーを入れるだけでよく、本スキルの編集は不要。

`comment-reviewer` プロンプトに必ず含める: ベース ref + 変更ファイル一覧 + diff、および **行ポリシー**（diff スコープでは変更行のコメントのみを判定する）。全言語一律の基準（TS/TSX も非 TS も同じ — shell / `.mjs` / CSS / YAML。非 TS は例外ではなく、むしろ高リスク）、`AGENTS.md` を実行時に権威として読むこと、機能ディレクティブ / export 宣言のガードは既にエージェント側が持っている — ここで再指定したり緩めたりしない。渡すファイル一覧はコメントを持つソースに限定する: 生成ファイル（`**/gen/**`、`// Code generated … DO NOT EDIT`）、deny リスト、Markdown / docs 散文（コメント規則が統べるのはソースコメントであって独立した文書ではない — そちらは `doc-reviewer` の担当）を除外する。

## Step 3 — 敵対的 verify

全 finding を集め、(file, line, claim) で **dedup**。残った finding ごとに `review-verifier` subagent を1体（並列）起動し、単一 finding + ベース ref を渡す。`agentType: "review-verifier"`、`label` は `verify:<file>`、`model` は Step 0 でユーザーが選んだ reviewer モデル（reviewer ≠ implementer の規則は同じ）。

- **CONFIRMED** と **PLAUSIBLE** を残す。**REFUTED** は落とす（件数はレポート用に保持）。
- critical/high で単一判定が頼りないときは verifier を 2〜3 体立て多数決。重要な finding ほど単一意見より多様性。

## Step 4 — ランタイム検証（build + リクエスト）

subagent ではなく **オーケストレーター（メインセッション）** が行う（対話的 bash・実サーバープロセス・ユーザー確認が要るため）。Step 2 の `runtime-gap` レンズが *予測* したものを、実地で確証するか落とすかを決める場 — ただし本ステージが届く範囲に限る（4-2 の「本ステージが届かない範囲」を参照）。ゲートの異なる 2 段構成。

### 4-1 build 検証 — アプリコードが触られたら常時

ゲート: diff が `src/**` / `next.config.ts` / `src/proxy.ts` / `src/instrumentation.ts` に触れている。

`pnpm build` を実行する。これは遅い `pnpm lint:ci` / `pnpm typecheck` ではない。あちらはファイル単位であり、build が組み上げるモジュールグラフを構造的に見られない:

- **RSC / Client 境界違反** — `server-only` モジュールが client グラフから到達可能、server config を import するモジュールへの `"use client"`、`adapters/server` への client hook 混入（ADR [0024](../../../docs/adr/0024-adapters-server-client-split.md)）。
- **secret の client バンドル漏洩** — client 側の層から server config へ到達している。ADR [0030](../../../docs/adr/0030-environment-variable-management.md) が越境を許すのは `NEXT_PUBLIC_` リテラルのみで、違反が実体化するのはバンドルの中。
- **ビルド時 config 検証** — `next.config.ts` がスキーマを import して全量評価する（ADR 0030）ため、変数の欠落・不正はここで初めて落ちる。なお ADR 0030 の*もう一方*の検証点 `src/instrumentation.ts` の `register()` は**サーバ起動時**に 1 回走るものでビルド時には走らない。到達するのは Step 4-2 のみ。
- App Router 自身の生成型でしか出ない route / metadata の型エラー。

build 失敗は **それ自体が CONFIRMED な finding**。出力付きで報告する。ここで直さない（コードレンズは read-only）。

### 4-2 リクエスト検証 — リクエスト時 seam が触られた時のみ

ゲート: Step 1 が Route Handler（`src/app/**/route.ts`）/ Server Action（`src/features/<name>/actions.ts`）/ `src/proxy.ts` / レスポンスヘッダ設定（`next.config.ts` の `headers()`）/ layout shell・Provider 合成（`src/app/**/layout.tsx`）の変更を検出している。 <!-- skill-lint-ignore -->

1. 4-1 でビルドしたアプリを起動: `pnpm start --port <3000+N>`。並行 worktree のサーバーを叩いてしまわないよう、他と異なるポートを使う。バックグラウンドで走らせ、終わったら止める。
2. 対象パスへ `curl -i` し検証する:
   - 正常系のステータスとボディ形。
   - **生の上流ステータスを漏らしていないこと** — バックエンド障害は素通しの 4xx/5xx ではなく正規化された `errors` 分類として現れねばならない（ADR [0071](../../../docs/adr/0071-bff-api-integration.md)）。
   - 変更が生むはずのセキュリティヘッダ / CSP（ADR [0111](../../../docs/adr/0111-csp-security-headers.md) — 既定 seam は `next.config.ts` の `headers()`。nonce CSP は全経路を dynamic に倒すので、意図していなければそれ自体が finding）。
   - 変更が保護するつもりのパスについて、資格情報なしのリクエストが実際に拒否されること — ハンドラを読んで推測せず、証明する。
3. **`src/proxy.ts` の変更:** `matcher` が選ぶパスと除外するパスの両方を叩く。matcher の退行は単体テストにも build にも映らない（ADR [0043](../../../docs/adr/0043-middleware-policy.md)）。
4. **layout shell・Provider の変更:** 変更した layout の配下のルートを 1 つ要求し、描画されることを確認する。shell から落ちた Provider は hook から context を奪い、build 失敗ではなくランタイムエラーやエラーバウンダリとして現れる（ADR [0026](../../../docs/adr/0026-layout-shell-mount.md)）。

**本ステージが届かない範囲。** アサートするのは上記 4 点と matcher / shell の確認だけで、それ以外は見ない。`runtime-gap` レンズは本ステージが今日実行できないカテゴリを挙げうる — 主に**キャッシュ / 再検証**（ミューテーションが tag を無効化しない）と**リトライ / 冪等性 / breaker のセマンティクス**で、いずれも `adapters` 層とバックエンドを要し、ADR 0071 は具体形を実装 PR へ委ねている。これらの finding は 到達不能 として報告し、走らせていない検査を合格扱いにしない。

**本リポジトリにバックエンドは無い** — DB / 認証 / 業務ロジックは別サービスの責務（ADR [0011](../../../docs/adr/0011-no-docker.md) / [0070](../../../docs/adr/0070-backend-role-separation.md)）なので、スタブを構成しない限り Route Handler の上流呼び出しは失敗する。それは本ステージを飛ばす理由にならない。その*失敗*経路こそ ADR 0071 のエラー正規化が所有するものなので、そこをアサートする。バックエンド無しでは本当に到達できないもの（実際の成功レスポンス、別 subject への認可）は **Step 5 のレポートに 到達不能 と明記する**。決して模擬せず、合格として報告しない。

**破壊ガード:** Server Action は実バックエンドの状態を変えうる。対象に含まれ、実行が共有環境への書き込みになる場合は、事前にユーザーへ確認し（作業ツリーの外へ届く手順を持つスキルに ADR [0154](../../../docs/adr/0154-claude-skills-operations.md)「商用操作前のユーザ確認」が課す要件）復旧手段を述べる。

ランタイムで確証した不具合は CONFIRMED として build 出力 / curl 証拠付きでレポートに統合。

## Step 5 — レポート合成（日本語）

1つの日本語レポートを出す:

```text
## ローカルレビュー結果（reviewer: <model> / implementer: <model>）

スコープ: <base>...HEAD（<N> files） / lens: correctness, security, architecture, runtime-gap, test-gap, comment-style
未実行のレンズ: test-gap（テストランナー未導入のため無効）
ランタイム検証: 4-1 build 実施 / 4-2 リクエスト検証 実施（curl）・対象外（リクエスト時 seam の変更なし）・到達不能（バックエンド不在で未検証の経路: <経路>）

### CONFIRMED（要対応）
- [重大度] タイトル — path:行
  - 問題 / 根拠 / 修正案
  - 検証: verifier 判定（+ 該当すれば build / curl 結果）

### PLAUSIBLE（要確認・判断保留）
- ...

### コメント品質（Step 5.5 で適用）
- [重大度] 対象コメント — path:行 / 分類 / 実施したアクション（削除・書換・加筆）

### 補足
- REFUTED: <n> 件（finder が挙げたが verifier が否定）
- ランタイム検証でカバーした経路 / スキップした経路
```

重大度順、CONFIRMED を PLAUSIBLE より先に。ランタイムで何を検査し何をスキップしたか、そして **どのレンズが動かなかったか・なぜか** は必ず明記（黙って省くと「全部見た」と誤読される）。レポート内では **コメント品質** の finding を独立した節に保つ — それらは Step 5.5 で*処理*されるものであって、PR へ投稿されるものではない。

## Step 5.5 — コメント修正の適用（既定。`--no-apply` でスキップ）

本スキルがソースを変更する唯一の場所。verify 済みの **コメント品質** finding（CONFIRMED、およびユーザーが選んだ PLAUSIBLE）を自分で適用する — `comment-reviewer` subagent は決して編集しない。コードレンズはここでは自動修正せず、Step 6 へ回す。

編集前に 1 度だけ確認する:

- `AskUserQuestion`: 「コメント指摘 <N> 件をライフサイクル内で修正適用しますか？」 — 選択肢は「すべて適用」/「1件ずつ確認」/「適用しない（レポートのみ／PR コメント化）」。

各 finding が持つアクションを適用する — 内容の悪いコメントは **削除**、正しい振る舞い記述への **書換**、薄い What / 欠けた非自明な契約 / 欠けた良い Why の **加筆**。`誤り/陳腐化` の finding（What がコードと矛盾）は削除ではなく訂正する。以下のガードを守る（ここでの誤削除は本物のリグレッション）:

- **機能ディレクティブ / 指示コメントを決して削除しない**: `// @ts-expect-error`、`// @ts-ignore`、`// biome-ignore …`、`// eslint-disable` / `// eslint-disable-next-line` / `/* eslint-disable … */`（ADR [0002](../../../docs/adr/0002-formatter-linter.md) は biome が表現できない検査のために ESLint を残している）、`/** @jsxImportSource … */`、`// prettier-ignore`、`// Code generated … DO NOT EDIT`、shebang、shell / YAML のツールディレクティブ。（`"use client"` / `"use server"` はコメントではなく文字列ディレクティブ — こちらも触らない。）
- **保護パスを決して編集しない。** `AGENTS.md` の *AI Modification Scope* と *Protected Documentation* が権威: `AGENTS.md` 自身 / Accepted な ADR 本文 / `LICENSE` / `.claude/settings.json` の `permissions.deny` に載るものは、スキル実行中であっても触らない。ルート設定（`package.json` / `tsconfig.json` / `next.config.ts` / `mise.toml` / `biome.json` / `Makefile` / `.makefiles/` / `.github/` / `.claude/`）の保護解除は v1.0.0 未満の暫定運用によるものであり、コメント修正はそこへ手を入れる理由にならない。コメント指摘がこれらのパスに当たった場合は適用せず報告に留める。
- **export 宣言**: doc コメントが実際の契約（エラー意味論 / 単位 / 境界 / 副作用）を述べているなら、**書換 or 加筆であって削除は不可** — 型シグネチャがその情報を運ばないため。削除してよいのは、名前と型の純粋な言い換えに留まる場合のみ。どちらのケースかは `comment-reviewer` が export 宣言の finding ごとに明記する。明記が無ければ契約ありとみなして書換にする。
- **良いコメントは残す**: 正しく十分で実質のある What、および非自明な Why（根拠 / 効いている制約）は finding ではない — 剥ぎ取らない。書換・加筆は **What + 非自明な Why** を書き、**How** や開発の経緯は書かない。コメントは日本語で書く（AGENTS.md Language Rules）。編集はスコープ内のファイルのみ。生成ファイル / Markdown 散文 / deny リストには決して触れない。`Edit` を使い、finding（またはファイル）1 件ずつ進める。

編集後に検証する:

1. `pnpm fix` — フォーマット / 自動修正を吸収。
2. `pnpm lint:ci` — `--error-on-warnings` 付きの完全プロファイル。pre-commit hook と同じ。
3. 触ったファイルを `git diff` し、散文コメントだけが変わったことを確認（機能ディレクティブを巻き込んでいないか）。非 TS ファイルは変更ハンクを読み直す。
4. 失敗したら表に出して止める — 自動 revert しない（判断はユーザー）。commit はしない — 変更はユーザー（または後続の `/commit`）に残す。

`--no-apply` の場合は本ステップをスキップし、コメント finding を Step 6（他レンズ同様 PR へ投稿）へ流す。`--no-apply` と `--no-comment` を **両方** 指定された場合は受け皿が無くなるため、Step 5 のローカルレポートへ全件を列挙し、その節の見出しを「コメント品質（未適用・未投稿）」に変える — 起きていない適用を起きたことにしない。

## Step 6 — finding を PR インラインコメントとして投稿（既定。`--no-comment` で opt out）

既定では Step 5.5 の後、**コードレンズ**（correctness / security / architecture / runtime-gap / test-gap）で残った **CONFIRMED + PLAUSIBLE** の finding を、現ブランチの PR へ **インラインレビューコメント**として投稿する — 1 つの巨大コメントではなく、finding ごとに 1 件、その `path:line` へアンカーする。**REFUTED は決して投稿しない。** コメント品質の finding はここでは投稿しない — Step 5.5 で適用済みのため（`--no-apply` の場合のみ、この投稿に含める）。Step 5 のローカルレポートはいずれにせよ出力する。本ステップは追加分。

以下の場合は本ステップを丸ごとスキップ:

- `--no-comment` 付きで起動された、または
- 現ブランチに open な PR が無い（`gh pr view` が何も返さない）— ローカルレポートのみとし、必要なら PR 作成を提案する。

GitHub への投稿は外向きの操作なので、投稿前に **1 度だけ** 確認する — 件数と対象 PR を示す（`AskUserQuestion`: 「<N> 件の指摘を PR #<番号> にインラインコメントとして投稿しますか？」/「投稿する」「投稿しない（ローカルレポートのみ）」）。

**投稿前に伏せ字化する。** 本リポジトリは public であり、`security` の finding は指摘対象そのもの — 漏れたトークン、ハードコードされた認証情報、PII の実例 — を引用する。それをそのまま投稿すると、取り消せない場所へ秘密を再公開することになる。payload を組む前に、各 finding 本文を「証拠を再現する」形から「証拠を説明する」形へ書き換える: 秘密らしき具体値は `***REDACTED***` に置換し、代わりに `path:line` を示す。伏せ字化すると意味を失う finding（値そのものが指摘である場合）はローカルレポート限りとし、投稿せずサマリでその旨を述べる。

**`gh api` はこの呼び出しに使える。** `.claude/settings.json` は `Bash(gh api *)` を allow し、コミット済みの作業を失う形だけを deny している — `DELETE` を含むもの、および ref 操作（`git/refs`。その `force` 更新は API 側の force push にあたる）。レビュー投稿はどちらでもないので実行される。これらの deny はスキル実行中も有効なので、必要な呼び出しがブロックされたらその事実を提示しユーザーに判断させる。ブロックされたリクエストを `python3` / `pnpm exec tsx` など許可済みインタプリタ経由で送り直さない（ガードを満たすのではなく無効化する行為）。`permissions.deny` を自分で編集して解除することも決してしない。

権限層がこれを安全にしているのではない — パターン規則は助言的レビューと破壊的書き込みを区別できない。効いている統制は上の 1 度の確認なので、「コマンドが許可されているから」を理由にそれを省かない。

**API 呼び出しが失敗した場合のフォールバック:** `gh pr comment` でサマリコメントを 1 件投稿する — 真の行アンカーの代わりに `path:line` 参照付きでファイルごとにまとめる — そして Step 5 のレポートに「インラインではなくサマリにまとめた」ことを明記する。

### 手順

1. PR 番号・リポジトリ・コメントのアンカー先コミットを解決する:

   ```sh
   gh pr view --json number,url -q '.number'        # PR 番号
   gh repo view --json nameWithOwner -q '.nameWithOwner'
   git rev-parse HEAD                                # アンカー SHA
   git rev-parse @{u}                                # push 済み head — HEAD と異なれば警告
   ```

   アンカーコミットは PR へ push 済みのコミットでなければならない。ローカル `HEAD` ≠ `@{u}` なら先に push するようユーザーへ警告する（PR 上に無い `commit_id` のコメントは API が拒否する）。

2. どの finding をインラインにできるか判定する。GitHub のインラインコメントは PR diff に存在する行しか対象にできない。diff ハンクを解析する（`gh pr diff <PR> --patch` または `git diff <base>...HEAD`）:
   - 追加行/文脈行のハンク内の `(path, line)` → インラインコメント、`side: "RIGHT"`。
   - 削除行の `(path, line)` → インラインコメント、`side: "LEFT"`。
   - diff 外（reviewer が未変更の文脈を参照した）→ インライン **不可**。レビューサマリの `body` へ畳み込む。

3. 1 つの review を組み立て、全コメントをまとめて投稿する（N 件の単独コメントではなく、単一の review として）:

   ```sh
   gh api --method POST repos/<owner>/<repo>/pulls/<PR>/reviews --input payload.json
   ```

   `payload.json`: <!-- skill-lint-ignore -->

   ```json
   {
     "commit_id": "<SHA>",
     "event": "COMMENT",
     "body": "🔎 local-review (reviewer: <model>) — CONFIRMED <n> / PLAUSIBLE <m>\n\ndiff 外で行アンカー不可の指摘:\n- <path>: <要約>",
     "comments": [
       {
         "path": "<file>",
         "line": "<行番号>",
         "side": "RIGHT",
         "body": "🔎 [CONFIRMED · high] <問題の要約>\n\n根拠: <...>\n修正案: <...>\n検証: <verifier 判定>"
       }
     ]
   }
   ```

   `event: "COMMENT"` を使う — これは助言的なレビューであり、`REQUEST_CHANGES` / `APPROVE` は使わない。人間のレビューと区別できるよう、各コメント本文の先頭に `🔎 local-review`（または `🔎 [判定 · 重大度]` タグ）を付ける。

4. 頑健性: API がバッチを拒否したら（422 — diff に無い行）、該当コメントをサマリ `body` へ移して再試行する。事後に、何をインライン投稿し何をサマリへ回したかを報告する — finding を黙って落とさない。

## やる / やらない

- ✅ reviewer モデル ≠ implementer モデルを保証（Step 0 でユーザーが選択。実装者のモデルを選んだら警告 + 確認）。
- ✅ finder は並列（1メッセージ・複数 `Agent` 呼び出し）: コードレンズは `adversarial-reviewer`、コメント品質は `comment-reviewer`。
- ✅ レポート前に全 finding を独立 verify、REFUTED は落とす。
- ✅ アプリコードが触られたら `pnpm build`（Step 4-1）、リクエスト時 seam が触られたらリクエスト検証（Step 4-2）。
- ✅ 生成成果物が変更されたら、それを import する全 consumer まで *finder* の読解範囲（Step 1）を広げる — Step 4 は広げない。届く経路を検証するだけ。
- ✅ バックエンド不在で塞がっている経路は 到達不能 と明言する — 模擬しない、合格と呼ばない。
- ✅ 共有バックエンドの状態を変える Server Action の実行は事前にユーザー確認。
- ✅ コメント品質の指摘は Step 5.5 で 1 度の確認後に適用（削除 / 書換 / 加筆）し、`pnpm fix` + `pnpm lint:ci`。`--no-apply` でスキップ。
- ✅ 既定でコードレンズの CONFIRMED + PLAUSIBLE を PR へインラインレビューコメントとして投稿（Step 6）。`--no-comment` または open な PR が無い場合は抑止。
- ✅ PR 投稿（外向き操作）の前に 1 度だけ確認。各コメントは `path:line` へアンカーし、diff 外の finding はレビューサマリへ畳む。
- ✅ 投稿前に各 finding 本文から秘密らしき具体値を伏せ字化する — 本リポジトリは public で、投稿は取り消せない。
- ❌ `gh api` が許可されているからと Step 6 の確認を省く — 安全性を担保しているのは権限規則ではなく確認のほう。
- ❌ deny されたコマンドを許可済みインタプリタ経由で送り直す / `permissions.deny` を編集して解除する — ブロックを提示し、サマリコメントのフォールバックを提案すること。
- ✅ どのレンズが動かなかったか・なぜかをレポートに明記（テストランナー未導入の間の `test-gap`）。
- ❌ REFUTED を投稿する / `REQUEST_CHANGES` / `APPROVE` を使う — 投稿するレビューは助言的な `COMMENT` のみ。
- ❌ コードレンズを自動修正する — 指摘まで、直すのはユーザー。自動適用はコメント品質のみ（Step 5.5）。
- ❌ Step 5.5 で機能ディレクティブ（`// biome-ignore` 等）や契約を述べた export 宣言の doc コメントを削除する（書換にする）/ 生成ファイル・Markdown・deny リストに触れる / 自動 commit する。
- ❌ テストランナーが存在しない状態で `test-gap` を spawn する — 読むものが無いため変更シンボルすべてを挙げてしまい、ノイズになる。
- ❌ reviewer を implementer と同一モデルで回す。
- ❌ 思いつきの style nit を finding として出す / 網羅に見せるための水増し。
- ❌ verify 中に生成ファイルや deny リスト対象を編集する。

## チェックリスト

- [ ] `AskUserQuestion` でスコープ確認、ベース ref 解決。
- [ ] Step 0 で reviewer モデルを選択し、implementer と異なることを確認（同一なら警告 + 確認）。
- [ ] finder を並列 fan-out: コードレンズ（`adversarial-reviewer`）+ コメント品質（`comment-reviewer`）。`test-gap` はテストランナーが構成されている時のみ。
- [ ] 全 finding を独立 verify、REFUTED は除外（件数は保持）。
- [ ] アプリコードが触られたら Step 4-1 `pnpm build` 実施、リクエスト時 seam が触られたら Step 4-2 curl 実施。到達不能な経路は明記済み、状態を変える Server Action は事前確認済み。
- [ ] 1つの日本語レポート: CONFIRMED → PLAUSIBLE、コメント finding は独立節、ランタイムのカバー範囲と未実行レンズを明記。
- [ ] `--no-apply` でない限り: コメント finding を Step 5.5 で適用（機能ディレクティブは不変、契約を述べた export の doc コメントは削除でなく書換）し、`pnpm fix` + `pnpm lint:ci`。自動 commit はしない。
- [ ] `--no-comment` / PR 無しでない限り: 1 度確認のうえコードレンズの CONFIRMED + PLAUSIBLE をインライン PR コメントとして投稿（diff 外はサマリ本文へ）。REFUTED は除外、`event: COMMENT`。
