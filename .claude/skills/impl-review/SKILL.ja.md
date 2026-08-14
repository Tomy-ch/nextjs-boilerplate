> このファイルは `SKILL.md`（canonical / 英語）の日本語参考訳です。スキルとしては読み込まれません（参考用）。

# Local Review

実装者とは**別モデル**で回す、ローカルの敵対的・低バイアスなコードレビュー。Copilot もクラウド `/code-review` も使わない。実装者自身のモデルには盲点があり、その盲点を別モデルで拾うのが本質。`/code-review` の finder → verify パターンを下敷きにしつつ、すべてローカルで完結させ、さらにモックのコンポーネントテストでは構造的に届かない **build + リクエストのランタイム検証** を足す。

## 使うとき

- commit / PR 前に、実装者のモデル単独では出ないセカンドオピニオンが欲しいとき。
- 複数カーネルに跨る変更で、モックのコンポーネントテストは通るが RSC / Client 境界・`src/proxy.ts`・`adapters` のリクエスト経路が未検証のとき。
- バグ・認証/IDOR・レイヤ違反に絞った敵対的パスをかけたいとき。

以下には使わない:

- formatting / style — `pnpm fix` / `pnpm lint:ci`
- 静的な層境界の強制 — `pnpm lint:ci` が `eslint-plugin-boundaries`（ADR [0021](../../../docs/adr/0021-frontend-responsibility.md) Enforcement）と `pnpm check:architecture` を走らせており、import 方向は静的に**ゲートされている**。よって `architecture` レンズはその上に載る*意味的*なパスであり、マトリクスで表現できない違反（正当な import を通って型が漏れている / 責務が別カーネルに置かれている / 名目上だけ依存を反転させた抽象）に使う。ESLint が既に落とすものを再導出することに使わない。網羅的なレイヤ適合監査は専用の監査スキルの仕事だが、**それはまだ実体が無い**（BACKLOG GB-1）
- コメント以外の修正の適用 — コードレンズについてはソースに対し read-only。指摘するだけで直すのはユーザー。（例外: **コメント品質の指摘は Step 8 で自動適用する** — 冗長・ナレーション的なコメントは報告で終わらず実際に直す。）

## 中核アイデア — reviewer ≠ implementer

バイアス低減が設計上の制約であって、おまけではない。よって reviewer は **コードを書いた者とは別モデルの subagent** として動く:

- reviewer エージェント（`adversarial-reviewer` / `comment-reviewer` / `review-verifier`）は frontmatter で既定 **`sonnet`**。通常の Opus 実装者と異なる。
- **reviewer のモデルは Step 0 でユーザーが選ぶ。** 選択肢は `fable`（Fable 5）/ `sonnet` / `opus` / `haiku`、および *auto*（実装者と異なるモデルへ解決する既定）。選ばれたモデルは全 reviewer subagent へ `Agent` ツールの `model` 引数で渡す（この引数はエージェント定義の `sonnet` 既定より優先）— 深さなら `opus`、安価な発散なら `haiku`、独立した視点なら `fable`。
- **オーケストレーターは reviewer ≠ implementer を必ず保証する。** ユーザーが本セッションの実装者と同一モデルを選んだ場合、別モデルによるバイアス低減が損なわれる旨を警告し、続行前に確認する。黙って同一モデルにしない。
- reviewer subagent は **read-only**（エージェント定義に Edit/Write 権限なし）— finding を返すだけ。ソースを書き換えるのはちょうど 2 箇所で、いずれも subagent ではなく **オーケストレーター**が行い、いずれも明示的な確認を経る: Step 8 が verify 済みのコメント指摘を適用し、Step 6 が委譲した `/comment-sweep` の中でユーザーが承認したものを書き込む。コードレンズが自動修正されることはない。

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

### コメント在庫の委譲

同じ `AskUserQuestion` 呼び出しの中で（3 つ目の質問として）、触れたファイルのコメント在庫を `/comment-sweep` へ委譲するかを聞く。質問自体は **無条件** に出す — 委譲に噛ませる対象があるかを決める判定式は、この呼び出しの後、Step 1 で解決するためである。

```text
質問: 触れたファイルのコメント在庫を /comment-sweep へ委譲しますか？（既定: 委譲する（確認して適用））
選択肢:
  - 委譲する（確認して適用。Step 6 で確認を取って書き換える）  ← 既定
  - 委譲する（報告のみ。書き込まず検出結果だけ出す）
  - 委譲しない
```

`/comment-sweep` の第 3 のモードである自動適用は意図的に外してある。ここでのレビュアはすべてソースに対し read-only であり、本スキルが行う書き込みはすべて明示的な確認を経る。委譲先の掃引が無人のまま書き込めば、それは誰も同意していない唯一の書き込みになる。

この委譲が足すのは、同一の主題のもう半分である。

| | 見るもの |
| --- | --- |
| `comment-reviewer`（Step 2） | diff が**足した**コメント — その品質 |
| `/comment-sweep`（Step 6） | 触れたファイルが**抱えている**在庫 — その管轄 |

### フラグ

- `--no-comment` — Step 9 を抑止（PR へ投稿しない）。ローカルレポートのみを出す。**既定は opt-out**: 現ブランチに open な PR があれば、このフラグが無い限り Step 9 が残った finding をインラインレビューコメントとして投稿する。
- `--no-apply` — Step 8 を抑止（コメント指摘を自動修正しない）。代わりに報告し、他レンズと同様 Step 9（PR 投稿）へ流す。**既定は適用**: コメント品質の指摘は 1 度の確認後に作業ツリーへ自動修正される。

## Step 1 — コンテキスト収集

- ベース ref を解決しレビュー対象を作る: `git diff <base>...HEAD`（未コミットなら `git diff`）+ 変更ファイル一覧（`git diff --name-only ...`）。
- どの**カーネル / element** が触られたか検出する。何が在るかは ADR [0027](../../../docs/adr/0027-directory-structure.md) の物理レイアウト、各々が何を import してよいかは ADR [0021](../../../docs/adr/0021-frontend-responsibility.md) の依存マトリクスが正: `src/app/**`（3 element — route-segment `page`/`layout` / route-handler `route.ts` / metadata）、`src/features/<name>/**`、`src/model/**`、`src/components/**`、`src/adapters/server/**`・`src/adapters/client/**`、`src/capabilities/**`、`src/stores/**`、`src/config/**`、`src/errors/**`、`src/logging/**`、`src/observability/**` — に加えて**カーネルの外側にある起動 / ビルド境界エントリ**: `src/proxy.ts`、`src/instrumentation.ts`、`next.config.ts`。いくつかのカーネルはまだディスク上に無い（ADR 0027 は対応決定が下りた時点で作成する）ので、全部揃っている前提を置かず実在するものを検出する。
- **リクエスト時の seam** が触られたか — Route Handler（`src/app/**/route.ts`）/ Server Action（`src/features/<name>/actions.ts`）/ `src/proxy.ts` / レスポンスヘッダ設定（`next.config.ts` の `headers()`）/ **layout shell・Provider 合成**（`src/app/**/layout.tsx` — ADR [0026](../../../docs/adr/0026-layout-shell-mount.md)。Provider の欠落は当該ルートが実際に描画されて初めて落ちる）。Step 4-2 を回すかの判定。 <!-- skill-lint-ignore -->
- **生成 API 成果物**（`**/gen/**` — ADR [0072](../../../docs/adr/0072-api-type-generation.md) の型 / zod スキーマ）が触られたか。再生成は全 consumer に波及するので、変更ファイルだけでなくそれを import する `adapters` 変換と feature までレビュー範囲を広げる。
- **`src/**` 配下の非生成な本番 `.ts` / `.tsx`** が触られたか（除外: `*.test.ts(x)` / `*.spec.ts(x)` / `**/gen/**` / `Code generated … DO NOT EDIT` バナーを持つファイル）— `test-gap` レンズへ渡す変更シンボル一覧の材料。
- **`*.test.ts(x)` / `*.spec.ts(x)`** が触られたかを別に記録する。前項と合わせて**テスト観点の判定式**が決まる: `本番ソースが触られた OR テストファイルが触られた`。テストのみの変更は後者だけで成立し、それはまさに `test-gap` が見られないケースである（本番ソースを読むため）。4 状態のどれかで所管が決まる。
  - 判定式が真 **かつ** Step 5 の委譲が動く → 委譲先の所管。`test-gap` は走らせない
  - 判定式が真、委譲が不可、**本番ソースが触られた** → `test-gap` が高シグナルな部分集合として走る
  - 判定式が真、委譲が不可、**テストファイルのみが触られた** → **どちらも走らせない。** `test-gap` は列挙するシンボルを持たず、空の結果が「監査済み」と読めてしまう。テスト観点が完全に未検査になる唯一の状態なので、空のレンズで代替せず `テスト観点:` 行にそう書く
  - 判定式が偽 → どちらも走らせない。監査すべきテスト観点が無い
- **そもそもテストランナーが構成されているか**を確認: `package.json` の `test` スクリプト、またはツリー内の `*.test.ts(x)` / `*.spec.ts(x)`。どちらも無ければ `test-gap` レンズは本実行で **無効**（Step 2 参照）— 黙ってスキップせず Step 7 のレポートに明記する。
- Step 6 のための **掃引スコープ** を解決する: 変更されたコメントを持つソースファイル — 非生成の `.ts` / `.tsx`（`*.test.ts(x)` / `*.spec.ts(x)` / `**/gen/**` / `Code generated … DO NOT EDIT` バナーを持つファイルを除く）と、コメントを持つ非 TS ソース（shell、`.mjs` / `.cjs`、CSS、YAML）から、deny リストと Markdown / ドキュメント散文を除いたもの。Step 2 が `comment-reviewer` に適用する除外集合からテストをさらに除いたものである — `/comment-sweep` はテストファイルを掃引しない。掃引スコープが空なら Step 0 の選択に関わらず Step 6 は実行せず、Step 7 の `コメント在庫:` 行にそう書く。

## Step 2 — Finder の fan-out（別モデル、並列）

全 finder を並列起動（`Agent` 呼び出しを1メッセージにまとめる）。Step 0 でユーザーが選んだ reviewer モデルを全 `Agent` 呼び出しへ `model` 引数で渡す（*auto* がエージェント定義の既定へ解決する場合のみ省略可）。エージェントは 2 種類:

- **コードレンズ**は `adversarial-reviewer` — レンズごとに1体、`agentType: "adversarial-reviewer"`、`label` は `find:security` のように。
- **コメント次元**は専用の `comment-reviewer` — `agentType: "comment-reviewer"`、`label: "find:comment"`。1 段落のレンズより豊かな分類体系を持つコメント特化エージェントで、その finding が Step 8 の自動修正へ流れる。

| Finder | エージェント | 起動条件 |
| --- | --- | --- |
| `correctness` | adversarial-reviewer | 常時 |
| `security` | adversarial-reviewer | 常時（Route Handler / Server Action / `src/proxy.ts` / auth / 生成 API のリクエスト・レスポンス型が触られた時は特に） |
| `architecture` | adversarial-reviewer | 常時 |
| `cohesion` | adversarial-reviewer | 常時 |
| `runtime-gap` | adversarial-reviewer | Route Handler / Server Action / `src/proxy.ts` / Provider マウント / 生成 API 成果物が触られた時 — モックのコンポーネントテストが通らない継ぎ目 |
| `test-gap` | adversarial-reviewer | **fallback のみ** — Step 5 の `/test-review` への委譲が動かせなかった時に spawn する。それ以外ではテスト観点は委譲先の所管 |
| コメント品質 | **comment-reviewer** | diff がコードコメントを追加/変更した時（ほぼ常時） |

各 `adversarial-reviewer` プロンプトに必ず含める: レンズ名 + その定義、ベース ref + 変更ファイル一覧 + diff、`AGENTS.md` / 該当 `README.md` / 根拠となる ADR へのポインタ。

**`cohesion` レンズの定義。** `architecture` が問うのは*どの層が持つか*、`cohesion` が問うのは*同じ関数やファイルに何種類の依頼が降ってくるか*である。両者は重ならず、その間に実際の隙間がある — ある単位が寸分違わず正しいカーネルに座り、`eslint-plugin-boundaries` も `pnpm check:architecture` も通ったうえで、エラー文言を直したい人にネットワークを叩くコードを読ませ続けることがある。ツールチェーンのどれもそれを見ておらず、きれいさ・保守性を実際に持っている `full-verify` の `impl-verifier` はリポジトリ全体の監査でしか走らない。このレンズが無いと、その指摘は「持ち込んだ diff」ではなく「いつかの監査」まで待つことになる。

好みに堕ちないための規律: すべての finding が **異なる 2 つの変更理由と、それぞれを誰が依頼するか**を名指しし、そのうえで継ぎ目を名指しする。そう書けない finding は落とす — 失敗する入力を示せない `correctness` の finding を落とすのと同じである。分割は無料ではなく、継ぎ目が 1 つ増えるたびに全体を見るために開くファイルが 1 つ増える。その代金を払うのが 2 つの理由である。長さそのものは finding にならない。

**`test-gap` レンズの定義**（このレンズは *code-origin* — テストファイルではなく変更された本番ソースを読む）: diff で追加/変更された本番シンボルごとに、論理分岐 / 送出するエラー型 / 境界条件 / null・undefined 防御を列挙し、対応するテストが各々へ到達し *区別可能な形で* アサートしているか確認する — 具体的なエラークラス（`await expect(fn()).rejects.toThrow(SpecificError)`）、区別可能な値や描画状態であって、素の `expect(fn).toThrow()` / `toBeTruthy()` では不足。報告する形は 2 つ: diff で変更された本番シンボルに **テストが一切無い**、および変更シンボルの到達可能な分岐が **未テストまたは空虚なアサート**。各 finding は diff 内の対象行へアンカーし、インライン投稿できるようにする。これは **高シグナルな部分集合** — *変更された*コードの到達可能なギャップを挙げるのであって、モジュール全体のシンボル網羅列挙は行わない。finding は read-only な提案（自動修正しない）。

**Step 5 が委譲している間、`test-gap` は抑止する。** テスト観点には専任の所管ができた — `/test-review` が同じ変更に対し 5 レンズの監査を回し、このレンズが標本抽出しているだけの subject シンボル網羅と分岐 × 意味を持つ。Step 5 が委譲を実行するときは `test-gap` を **spawn しない** — 所管は 1 つ、二重報告なし。`test-gap` は委譲が辞退・不可だった実行のための fallback としてのみ残す。その fallback にも Step 1 のランナー確認が掛かる。

`comment-reviewer` プロンプトに必ず含める: ベース ref + 変更ファイル一覧 + diff、および **行ポリシー**（diff スコープでは変更行のコメントのみを判定する）。全言語一律の基準（TS/TSX も非 TS も同じ — shell / `.mjs` / CSS / YAML。非 TS は例外ではなく、むしろ高リスク）、`docs/rules.md`（Comment Rules 節があればそれ）と `AGENTS.md` を実行時に権威として読むこと、機能ディレクティブ / export 宣言のガードは既にエージェント側が持っている — ここで再指定したり緩めたりしない。渡すファイル一覧はコメントを持つソースに限定する: 生成ファイル（`**/gen/**`、`// Code generated … DO NOT EDIT`）、deny リスト、Markdown / docs 散文（コメント規則が統べるのはソースコメントであって独立した文書ではない — そちらは `doc-reviewer` の担当）を除外する。

## Step 3 — 敵対的 verify

全 finding を集め、(file, line, claim) で **dedup**。残った finding ごとに `review-verifier` subagent を1体（並列）起動し、単一 finding + ベース ref を渡す。`agentType: "review-verifier"`、`label` は `verify:<file>`、`model` は Step 0 でユーザーが選んだ reviewer モデル（reviewer ≠ implementer の規則は同じ）。

- **CONFIRMED** と **PLAUSIBLE** を残す。**REFUTED** は落とす（件数はレポート用に保持）。
- critical/high で単一判定が頼りないときは verifier を 2〜3 体立て多数決。重要な finding ほど単一意見より多様性。

### 保留するファイルを解決する

残った finding が確定したら、CONFIRMED な `architecture` / `correctness` の finding が書き換えそうなファイルを列挙する。**この一覧はここで 1 度だけ解決する。** Step 6 が `hold` payload として受け取り、Step 8 が同じファイルを除外する — これから変わるコードのコメントを磨くのは二度手間であり、しかもコメント修正の diff が本題の finding を埋める。各ステップで別々に導出すると保留するファイルがずれ、レポートが自己矛盾する。保留したファイルと理由は Step 7 のレポートに書き、待っている finding が決着したら改めて提示する。

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

**本リポジトリにバックエンドは無い** — DB / 認証 / 業務ロジックは別サービスの責務（ADR [0011](../../../docs/adr/0011-no-docker.md) / [0070](../../../docs/adr/0070-backend-role-separation.md)）なので、スタブを構成しない限り Route Handler の上流呼び出しは失敗する。それは本ステージを飛ばす理由にならない。その*失敗*経路こそ ADR 0071 のエラー正規化が所有するものなので、そこをアサートする。バックエンド無しでは本当に到達できないもの（実際の成功レスポンス、別 subject への認可）は **Step 7 のレポートに 到達不能 と明記する**。決して模擬せず、合格として報告しない。

**破壊ガード:** Server Action は実バックエンドの状態を変えうる。対象に含まれ、実行が共有環境への書き込みになる場合は、事前にユーザーへ確認し（作業ツリーの外へ届く手順を持つスキルに ADR [0154](../../../docs/adr/0154-claude-skills-operations.md)「商用操作前のユーザ確認」が課す要件）復旧手段を述べる。

ランタイムで確証した不具合は CONFIRMED として build 出力 / curl 証拠付きでレポートに統合。

## Step 5 — テスト観点を `/test-review` へ委譲

テスト観点はここでは監査しない。`/test-review` が所管し、このスキルの `test-gap` の抽出よりも深く見る — subject の export シンボル表を作り（テストが 1 つも無いシンボルはテストファイル起点の読み方では見えない）、関数ごとに分岐 × 意味の行列を回す。両方を走らせると同じギャップを 2 つの語彙で二重報告することになる。

この実行が既に解決したことを訊き直させないよう、payload を付けて chain する。

- `scope` — Step 1 で解決したファイル一覧。**ペアのテストが存在しない production ファイルも含める。** その不在こそ委譲先のシンボルレンズが報告する対象である
- `base_ref` — ブランチ base 比較で動いている場合
- `reviewer_model` — Step 2 で解決したモデル。reviewer ≠ implementer をスキル境界を跨いで保つ
- `skip_verifier` — この実行が検証を飛ばしている場合だけ渡す

返ってきたレポートは Step 7 のレポートの 1 節として埋め込み、**severity 語彙をそのまま保つ**（修正必須 / 補完推奨 / 再考 / 追加検討 + criticality）。このスキルの severity へ写すと「規則に違反している」と「この分岐が未検証である」の区別が失われる。

委譲が動かせない場合は、その旨をレポートに書いたうえで、この実行に限り `test-gap` レンズへ fallback する。観点を黙って未検査のままにしない。

## Step 6 — コメント在庫を `/comment-sweep` へ委譲

Step 1 の掃引スコープが空でなく **かつ** Step 0 でユーザーが委譲を選んだときに実行する。ここに置くのは、尊重すべき finding が Step 3 で既に確定していること、そしてこのステップが開きうる対話的な承認ループは、read-only な Step 5 の委譲と交錯させずその後に置くべきであるため。Step 7 より前に置くのは、その結果を後付けではなくレポートに載せるため。

`comment-reviewer`（Step 2）が裁くのは、この差分が**足した**コメントである。触れたファイルが既に**抱えている**コメントは見られないし、それらがしばしば必要とする判定 —— **移設**、根拠をそれを所管する ADR や README へ動かすこと —— も出せない。移設先の文書を書く必要があり、read-only のレビュアーがそれをしてはならないからである。

`comment-sweep` スキルを Skill ツールで起動し、以下を渡す。

- `scope` —— Step 1 の掃引スコープ。対象は**それらのファイルのコメント在庫の全量**であって変更行ではない。変更行は Step 2 で既に見ている
- `mode` —— Step 0 の選択に応じて `confirm` か `report`。`apply` は渡さない
- `base_ref` —— Step 1 で解決したベース
- `hold` —— Step 3 の後に保留したファイル（残った CONFIRMED の finding が書き換えそうなもの）。Step 8 が除外するのと同じ一覧である —— 1 度だけ解決して両方へ渡すこと。別々に決めると保留するファイルがずれ、レポートが自己矛盾する
- `claimed` —— 残った `comment-reviewer` の finding が既に所管しているコメントの `path:行`。これが無いと下記の畳み込みは実行主体の無い規則になる。掃引はファイル全体を読むので変更行にも当たり、衝突は稀ではなく構造上必ず起きる

チェインは **逐次・インライン**。本リポジトリの他のチェインと同じ形である。`report` モードでは委譲先は何も書かない。`confirm` モードではユーザーが承認したものだけを書き、移設先文書への書き込みも含む —— ユーザー自身が対話を選んだのだから、掃引側の ADR の問いは抑止しない。

**1 つのコメントに報告者は 1 人。**変更行のコメントは `comment-reviewer` のもの（Step 8 で適用）であり、掃引の対象はその周囲の在庫である。これを実行可能にするのが `claimed` payload である —— 委譲先は承認ループを開く前にそれらを落とすので、ユーザーが同じコメントを二度問われることも、Step 6 が書き換えた直後のコメントに Step 8 が旧文言で当たることも無い。例外は 1 つだけ逆向きに働く: 掃引の判定が **移設** で `comment-reviewer` が 削除 / 書換 のときは 移設 を残す。移設は短縮を含んでおり、落とせば「論拠をそれを所管する文書へ移す」唯一の判定 —— 掃引が存在する理由そのもの —— が失われる。

返ってきたレポートは、掃引の判定語彙（維持 / 削除 / 書換 / 移設）を保ったまま Step 7 のレポートの 1 節として埋め込む。ソースのコメントに一切触れない変更では委譲を飛ばし、`コメント在庫:` 行にその旨を書く。黙らせない。

## Step 7 — レポート合成（日本語）

1つの日本語レポートを出す:

```text
## ローカルレビュー結果（reviewer: <model> / implementer: <model>）

スコープ: <base>...HEAD（<N> files） / lens: correctness, security, architecture, cohesion, runtime-gap, comment-style（テスト観点は /test-review へ委譲）
テスト観点: <4 状態のいずれか。下記の定型から選ぶ>
コメント在庫: <3 状態のいずれか。下記の定型から選ぶ>
ランタイム検証: 4-1 build 実施 / 4-2 リクエスト検証 実施（curl）・対象外（リクエスト時 seam の変更なし）・到達不能（バックエンド不在で未検証の経路: <経路>）

### CONFIRMED（要対応）
- [重大度] タイトル — path:行
  - 問題 / 根拠 / 修正案
  - 検証: verifier 判定（+ 該当すれば build / curl 結果）

### PLAUSIBLE（要確認・判断保留）
- ...

### コメント品質（Step 8 で適用）
- [重大度] 対象コメント — path:行 / 分類 / 実施したアクション（削除・書換・加筆）

### コメント在庫（/comment-sweep 委譲結果）
- <委譲したときのみ。確認して適用: 判定の内訳・適用した内容・保留したファイル。報告のみ: comment-sweep が返した finding 全文をそのまま埋め込む>

### 補足
- REFUTED: <n> 件（finder が挙げたが verifier が否定）
- ランタイム検証でカバーした経路 / スキップした経路
```

**`コメント在庫:` 行は必須**で、次の 3 つのうち 1 つを厳密に取る。

- `掃引実施（/comment-sweep <確認して適用|報告のみ> / 維持 <a>・削除 <b>・書換 <c>・移設 <d>）`
- `未実施（ソースのコメントに触れる変更なし）`
- `未実施（委譲しなかった / 委譲が動かせず、在庫は未判定）`

3 番目の値は「辞退した」と「委譲が動かせなかった」の両方を覆うので、同じ括弧の中でどちらかを述べる。この行が無いと、足されたコメントしか見ていないレビューがファイルを掃引したものとして読めてしまう。`comment-reviewer` と `/comment-sweep` が主題を分けているのは、まさにその取り違えを避けるためである。

**`テスト観点:` 行は必須**で、Step 1 が解決した状態に対応する次の 4 つのうち 1 つを厳密に取る。

- `委譲実施（/test-review Lens 1-5 / CONFIRMED <n>・PLAUSIBLE <m>。レポートは別節に埋め込み）`
- `test-gap レンズのみ（変更シンボルの高シグナル・サブセット。全シンボル網羅は未実施）`
- `未実施（テストのみの変更で委譲できず、test-gap にも対象が無い）`
- `未実施（テスト関連の変更なし）`

この行が要るのはランタイム行と同じ理由である。無ければ `lens:` に `test-gap` が並んでいるだけで「テストは監査された」と読めてしまうが、実際には変更シンボルの部分集合しか見ていない。テスト分析が一切無い実行は痕跡すら残らない。弱い側の事実をそのまま書き、省略をカバレッジの代わりにしない。

重大度順、CONFIRMED を PLAUSIBLE より先に。ランタイムで何を検査し何をスキップしたか、そして **どのレンズが動かなかったか・なぜか** は必ず明記（黙って省くと「全部見た」と誤読される）。レポート内では **コメント品質** の finding を独立した節に保つ — それらは Step 8 で*処理*されるものであって、PR へ投稿されるものではない。掃引の節も同じで、判定は `/comment-sweep` の語彙（維持 / 削除 / 書換 / 移設）のまま置き、Step 6 を実行しなかったときは節ごと省く（`コメント在庫:` 行が既にその事実を伝えている）。

## Step 8 — コメント修正の適用（既定。`--no-apply` でスキップ）

本スキルが**自らの判断で**ソースを変更する唯一の場所。verify 済みの **コメント品質** finding（CONFIRMED、およびユーザーが選んだ PLAUSIBLE）を自分で適用する — `comment-reviewer` subagent は決して編集しない。コードレンズはここでは自動修正せず、Step 9 へ回す。

掃引の finding をここで再適用しない。`confirm` モードなら Step 6 がユーザーの承認済みのものを既に書いており、`report` モードなら意図的に手を付けていない。このステップの対象は `comment-reviewer` の finding だけである。

**保留したファイルを除外する。** Step 3 の後に解決した一覧（Step 6 へ `hold` として渡したもの）を導出し直さずそのまま再利用し、除外したファイルと理由をレポートに書く。

編集前に 1 度だけ確認する:

- `AskUserQuestion`: 「コメント指摘 <N> 件をライフサイクル内で修正適用しますか？」 — 選択肢は「すべて適用」/「1件ずつ確認」/「適用しない（レポートのみ／PR コメント化）」。

各 finding が持つアクションを適用する — 内容の悪いコメントは **削除**、正しい振る舞い記述への **書換**、薄い What / 欠けた非自明な契約 / 欠けた制約の **加筆**。`誤り/陳腐化` の finding（What がコードと矛盾）は削除ではなく訂正する。以下のガードを守る（ここでの誤削除は本物のリグレッション）:

- **機能ディレクティブ / 指示コメントを決して削除しない**: `// @ts-expect-error`、`// @ts-ignore`、`// biome-ignore …`、`// eslint-disable` / `// eslint-disable-next-line` / `/* eslint-disable … */`（ADR [0002](../../../docs/adr/0002-formatter-linter.md) は biome が表現できない検査のために ESLint を残している）、`/** @jsxImportSource … */`、`// prettier-ignore`、`// Code generated … DO NOT EDIT`、shebang、shell / YAML のツールディレクティブ。（`"use client"` / `"use server"` はコメントではなく文字列ディレクティブ — こちらも触らない。）
- **保護パスを決して編集しない。** `AGENTS.md` の *AI Modification Scope* と *Protected Documentation* が権威: `AGENTS.md` 自身 / Accepted な ADR 本文 / `LICENSE` / `.claude/settings.json` の `permissions.deny` に載るものは、スキル実行中であっても触らない。ルート設定（`package.json` / `tsconfig.json` / `next.config.ts` / `mise.toml` / `biome.json` / `Makefile` / `.makefiles/` / `.github/` / `.claude/`）の保護解除は v1.0.0 未満の暫定運用によるものであり、コメント修正はそこへ手を入れる理由にならない。コメント指摘がこれらのパスに当たった場合は適用せず報告に留める。
- **export 宣言**: doc コメントが実際の契約（エラー意味論 / 単位 / 境界 / 副作用）を述べているなら、**書換 or 加筆であって削除は不可** — 型シグネチャがその情報を運ばないため。削除してよいのは、名前と型の純粋な言い換えに留まる場合のみ。どちらのケースかは `comment-reviewer` が export 宣言の finding ごとに明記する。明記が無ければ契約ありとみなして書換にする。
- **良いコメントは残す**: 正しく十分で実質のある What、および**前提がその呼び出し箇所に在る制約**は finding ではない — 剥ぎ取らない。書換・加筆は **What + その制約**を書き、**How** や開発の経緯は書かない。前提が遠い根拠（上流サービスの挙動 / 運用ポリシー）は、ここで要求も移設もしない — レビュアーの判定のまま残す。コメントは日本語で書く（AGENTS.md Language Rules）。編集はスコープ内のファイルのみ。生成ファイル / Markdown 散文 / deny リストには決して触れない。`Edit` を使い、finding（またはファイル）1 件ずつ進める。

編集後に検証する:

1. `pnpm fix` — フォーマット / 自動修正を吸収。
2. `pnpm lint:ci` — `--error-on-warnings` 付きの完全プロファイル。pre-commit hook と同じ。
3. 触ったファイルを `git diff` し、散文コメントだけが変わったことを確認（機能ディレクティブを巻き込んでいないか）。非 TS ファイルは変更ハンクを読み直す。
4. 失敗したら表に出して止める — 自動 revert しない（判断はユーザー）。commit はしない — 変更はユーザー（または後続の `/commit`）に残す。

`--no-apply` の場合は本ステップをスキップし、コメント finding を Step 9（他レンズ同様 PR へ投稿）へ流す。`--no-apply` と `--no-comment` を **両方** 指定された場合は受け皿が無くなるため、Step 7 のローカルレポートへ全件を列挙し、その節の見出しを「コメント品質（未適用・未投稿）」に変える — 起きていない適用を起きたことにしない。

## Step 9 — finding を PR インラインコメントとして投稿（既定。`--no-comment` で opt out）

既定では Step 8 の後、**コードレンズ**（correctness / security / architecture / cohesion / runtime-gap / test-gap）で残った **CONFIRMED + PLAUSIBLE** の finding を、現ブランチの PR へ **インラインレビューコメント**として投稿する — 1 つの巨大コメントではなく、finding ごとに 1 件、その `path:line` へアンカーする。**REFUTED は決して投稿しない。** コメント品質の finding はここでは投稿しない — Step 8 で適用済みのため（`--no-apply` の場合のみ、この投稿に含める）。Step 7 のローカルレポートはいずれにせよ出力する。本ステップは追加分。

**掃引の finding（Step 6）は投稿しない。**在庫は本変更が持ち込んだものではなく、この PR が引き入れたのでもここで議論する場でもない既存の負債である —— 変更行に載っている分も含めて。件数はローカルレポートに書き、省略を見えるようにする。

以下の場合は本ステップを丸ごとスキップ:

- `--no-comment` 付きで起動された、または
- 現ブランチに open な PR が無い（`gh pr view` が何も返さない）— ローカルレポートのみとし、必要なら PR 作成を提案する。

GitHub への投稿は外向きの操作なので、投稿前に **1 度だけ** 確認する — 件数と対象 PR を示す（`AskUserQuestion`: 「<N> 件の指摘を PR #<番号> にインラインコメントとして投稿しますか？」/「投稿する」「投稿しない（ローカルレポートのみ）」）。

**投稿前に伏せ字化する。** 本リポジトリは public であり、`security` の finding は指摘対象そのもの — 漏れたトークン、ハードコードされた認証情報、PII の実例 — を引用する。それをそのまま投稿すると、取り消せない場所へ秘密を再公開することになる。payload を組む前に、各 finding 本文を「証拠を再現する」形から「証拠を説明する」形へ書き換える: 秘密らしき具体値は `***REDACTED***` に置換し、代わりに `path:line` を示す。伏せ字化すると意味を失う finding（値そのものが指摘である場合）はローカルレポート限りとし、投稿せずサマリでその旨を述べる。

**`gh api` はこの呼び出しに使える。** `.claude/settings.json` は `Bash(gh api *)` を allow し、コミット済みの作業を失う形だけを deny している — `DELETE` を含むもの、および ref 操作（`git/refs`。その `force` 更新は API 側の force push にあたる）。レビュー投稿はどちらでもないので実行される。これらの deny はスキル実行中も有効なので、必要な呼び出しがブロックされたらその事実を提示しユーザーに判断させる。ブロックされたリクエストを `python3` / `pnpm exec tsx` など許可済みインタプリタ経由で送り直さない（ガードを満たすのではなく無効化する行為）。`permissions.deny` を自分で編集して解除することも決してしない。

権限層がこれを安全にしているのではない — パターン規則は助言的レビューと破壊的書き込みを区別できない。効いている統制は上の 1 度の確認なので、「コマンドが許可されているから」を理由にそれを省かない。

**API 呼び出しが失敗した場合のフォールバック:** `gh pr comment` でサマリコメントを 1 件投稿する — 真の行アンカーの代わりに `path:line` 参照付きでファイルごとにまとめる — そして Step 7 のレポートに「インラインではなくサマリにまとめた」ことを明記する。

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
     "body": "🔎 impl-review (reviewer: <model>) — CONFIRMED <n> / PLAUSIBLE <m>\n\ndiff 外で行アンカー不可の指摘:\n- <path>: <要約>",
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

   `event: "COMMENT"` を使う — これは助言的なレビューであり、`REQUEST_CHANGES` / `APPROVE` は使わない。人間のレビューと区別できるよう、各コメント本文の先頭に `🔎 impl-review`（または `🔎 [判定 · 重大度]` タグ）を付ける。

4. 頑健性: API がバッチを拒否したら（422 — diff に無い行）、該当コメントをサマリ `body` へ移して再試行する。事後に、何をインライン投稿し何をサマリへ回したかを報告する — finding を黙って落とさない。

## やる / やらない

- ✅ reviewer モデル ≠ implementer モデルを保証（Step 0 でユーザーが選択。実装者のモデルを選んだら警告 + 確認）。
- ✅ finder は並列（1メッセージ・複数 `Agent` 呼び出し）: コードレンズは `adversarial-reviewer`、コメント品質は `comment-reviewer`。
- ✅ レポート前に全 finding を独立 verify、REFUTED は落とす。
- ✅ アプリコードが触られたら `pnpm build`（Step 4-1）、リクエスト時 seam が触られたらリクエスト検証（Step 4-2）。
- ✅ 生成成果物が変更されたら、それを import する全 consumer まで *finder* の読解範囲（Step 1）を広げる — Step 4 は広げない。届く経路を検証するだけ。
- ✅ バックエンド不在で塞がっている経路は 到達不能 と明言する — 模擬しない、合格と呼ばない。
- ✅ 共有バックエンドの状態を変える Server Action の実行は事前にユーザー確認。
- ✅ Step 0 でコメント在庫の委譲を聞き（既定: 委譲する（確認して適用））、委譲したら `scope` / `mode` / `base_ref` / `hold` / `claimed` を渡して Step 6 を実行。
- ✅ どのレポートでもコメント在庫の状態を `コメント在庫:` 行に明記 — 何も掃引しなかった実行を含めて。
- ✅ コメント品質の指摘は Step 8 で 1 度の確認後に適用（削除 / 書換 / 加筆）し、`pnpm fix` + `pnpm lint:ci`。`--no-apply` でスキップ。
- ✅ 既定でコードレンズの CONFIRMED + PLAUSIBLE を PR へインラインレビューコメントとして投稿（Step 9）。`--no-comment` または open な PR が無い場合は抑止。
- ✅ PR 投稿（外向き操作）の前に 1 度だけ確認。各コメントは `path:line` へアンカーし、diff 外の finding はレビューサマリへ畳む。
- ✅ 投稿前に各 finding 本文から秘密らしき具体値を伏せ字化する — 本リポジトリは public で、投稿は取り消せない。
- ❌ `gh api` が許可されているからと Step 9 の確認を省く — 安全性を担保しているのは権限規則ではなく確認のほう。
- ❌ deny されたコマンドを許可済みインタプリタ経由で送り直す / `permissions.deny` を編集して解除する — ブロックを提示し、サマリコメントのフォールバックを提案すること。
- ✅ どのレンズが動かなかったか・なぜか、そしてテスト観点が `/test-review` の委譲から来たのか `test-gap` の fallback から来たのかをレポートに明記。
- ❌ REFUTED を投稿する / `REQUEST_CHANGES` / `APPROVE` を使う — 投稿するレビューは助言的な `COMMENT` のみ。
- ❌ コードレンズを自動修正する — 指摘まで、直すのはユーザー。自動適用はコメント品質のみ（Step 8）。
- ❌ Step 8 で機能ディレクティブ（`// biome-ignore` 等）や契約を述べた export 宣言の doc コメントを削除する（書換にする）/ 生成ファイル・Markdown・deny リストに触れる / 自動 commit する。
- ❌ `/test-review` への委譲が走っている状態で `test-gap` を spawn する — 同じギャップを 2 つの語彙で二重報告することになる。
- ❌ `/comment-sweep` を自動適用モードで委譲する / 1 つのコメントを `comment-reviewer` と掃引の両方から報告する / 掃引の finding を PR に投稿する。
- ❌ 残った CONFIRMED の finding が書き換えそうなファイルへコメント修正を自動適用する / 保留一覧を Step 6 と Step 8 で別々に導出する。
- ❌ reviewer を implementer と同一モデルで回す。
- ❌ 思いつきの style nit を finding として出す / 網羅に見せるための水増し。
- ❌ verify 中に生成ファイルや deny リスト対象を編集する。

## チェックリスト

- [ ] `AskUserQuestion` でスコープ確認、ベース ref 解決。
- [ ] Step 0 で reviewer モデルを選択し、implementer と異なることを確認（同一なら警告 + 確認）。
- [ ] finder を並列 fan-out: コードレンズ（`adversarial-reviewer`）+ コメント品質（`comment-reviewer`）。`test-gap` は Step 5 の委譲が動かせなかった時の fallback としてのみ。
- [ ] Step 0 でコメント在庫の委譲を確認、Step 1 で掃引スコープを解決、結果の状態を記録。
- [ ] 全 finding を独立 verify、REFUTED は除外（件数は保持）。
- [ ] 保留するファイルを Step 3 の後に 1 度だけ解決し、Step 6（`hold`）と Step 8 の両方がそれを使った。
- [ ] アプリコードが触られたら Step 4-1 `pnpm build` 実施、リクエスト時 seam が触られたら Step 4-2 curl 実施。到達不能な経路は明記済み、状態を変える Server Action は事前確認済み。
- [ ] 委譲したときは Step 6 を実行（`scope` / `mode`（`apply` は渡さない）/ `base_ref` / `hold` / `claimed` を渡す）。
- [ ] 1つの日本語レポート: CONFIRMED → PLAUSIBLE、コメント finding は独立節、ランタイムのカバー範囲と未実行レンズを明記、`コメント在庫:` 行が 3 状態のいずれかで存在。
- [ ] `--no-apply` でない限り: コメント finding を Step 8 で適用（機能ディレクティブは不変、契約を述べた export の doc コメントは削除でなく書換）し、`pnpm fix` + `pnpm lint:ci`。自動 commit はしない。
- [ ] `--no-comment` / PR 無しでない限り: 1 度確認のうえコードレンズの CONFIRMED + PLAUSIBLE をインライン PR コメントとして投稿（diff 外はサマリ本文へ）。REFUTED は除外、`event: COMMENT`。
