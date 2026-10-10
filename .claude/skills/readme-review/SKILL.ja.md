> このファイルは `SKILL.md`（canonical / 英語）の日本語参考訳です。スキルとしては読み込まれません（参考用）。

# Readme Review

このスキルは、単一の README を「portal の manual としての価値を満たすか」のパターンと突き合わせて評価し、ユーザーが次の行動（README 補強・manifest 追加・portal 対象外として放置）を決められるスコアカードを出力します。

## 使うとき

- 新規 README を書いたあと、portal の manual として十分か知りたい
- `portal-manifest-sync` が `borderline` / `not-yet-manual-grade` に分類した README を深堀したい
- README が component の表面（Storybook と TSDoc が既に持つもの）を書いているだけではないか疑いたい
- 薄い README を厚くする前に「何が足りないか」のチェックリストが欲しい

以下の用途には使いません:

- リポジトリ全体のレビュー → `portal-manifest-sync` が同じ基準（後述）で 4 クラスに batch 分類する（部品リファレンスを外し、feature slice を Step 2b へ回したうえで）。本スキルは borderline ケースの個別深堀用
- README 編集 → `sync-readme`（drift 修正）または手動編集
- manifest 追加 → `portal-manifest-sync`（curation flow）に chain

## 他スキルへの source-of-truth 提供

後述の Step 2（P1〜P7 / N1〜N4 / 4 クラス閾値）は、`portal-manifest-sync` が batch 分類のために **実行時に参照** する。**重複定義しないこと**。基準が進化する場合（例: 新しい positive パターンが manifest entry から発見された）は本 SKILL.md だけ編集すれば、`portal-manifest-sync` の挙動も自動追従。

本スキルは引き続き、単一 README の **深堀分析**（強み / ギャップ / 補強提案 / 次アクションのフルスコアカード）の canonical 起動点。`portal-manifest-sync` は batch 性のためファイルごとに 1 行根拠だけ出す。

## 評価基準の導出根拠

評価パターンはハードコードした理論ではなく、`docs/portal/manifest.yaml` に現在登録されているエントリ
——「これは手引きに載る」の唯一の実例——から読み取ったものです。登録済みエントリの英語の canonical で
測った（散文はコードブロック・テーブル・見出しを除いて数える）共通点:

- 見出しの多くが分類名ではなく主張そのものになっている ——
  "The fetch endpoint declares the value classification"、"Why a separate package"、
  "Separate lightness by surface and text"
- H2 の上位は Related ADRs、Operations、What Belongs Here / What Does Not Belong Here、Structure、
  Test Responsibilities、Modules
- 18/19 がテーブルを使う。**Mermaid は 0/19** —— 図はここでは加点であって前提ではない
- P7 の散文の下限は登録済みの最小値であって、丸めた数ではない —— このファイルの数値を読まず、実行時に導く（Step 1）
- H2 は平均 8.6 個

manifest が大きく変わったらこの数値を取り直します。ADR
[0141](../../../docs/adr/0141-portal-operations.ja.md) は登録済み集合を manual-worthy の基準としているので、
基準が manifest に追随するのであって逆ではありません。

### 意図的に manual-worthy でない 2 つの形

どちらも件数が多く、候補と取り違えるとリポジトリ全体のレポートが読めなくなります。

- **部品リファレンス** —— `src/components/**` の README は Step 2 の N1 が名指しする固定の節の形を
  共有します。1 つの component の表面を
  書いたもので、このリポジトリの答えは Storybook（manifest の `meta.reference_links` の常設項目）と
  component 自身の TSDoc です。これが本リポジトリでの N1 の読み方です
- **feature slice** —— `src/features/` 配下の README は代わりに Step 2b の必須節検査で採点します。
  対象は `docs/templates/feature-readme.md` が宣言する節です

### キーワード更新ログ

Step 2 のキーワード集合は、`portal-manifest-sync` の実行で false-negative を観測するたびに拡張します。追加基準:

- 本当に manual 品質の README が、リストにない言い回しを使っている
- その言い回しが既存 manifest 登録エントリの少なくとも 1 件、またはユーザーが明示的に manual-worthy と判断した README に使われている

低品質 README を通すための追加はしない。正当な言い換えのスペクトルを取りこぼさないことが目的です。
いずれにせよ内容で判定します —— このリポジトリは主張そのものを見出しに書くため、リストの語が無くても
問いに答えている節があれば観点は満たされます。

## Step 0. ターゲット確認

`AskUserQuestion`:

1. **対象 README パス** — レビューする canonical の README: サフィックス無しのパスの英語の `README.md`（[0140](../../../docs/adr/0140-documentation-operations.ja.md)）。その `README.ja.md` ミラーは対象にしない。引数 / 直近メッセージにあれば候補として提示
2. **出力詳細度** — 簡潔スコアカード（デフォルト）/ パターン別フル breakdown

`*.ja.md` パスが渡された場合は、canonical の兄弟へ切り替え、その旨を伝える —— ミラーは canonical に追従するもので、単独では判定しない。

ターゲット確定前にファイルを読まない。

## Step 1. ターゲット読み込み

README 全文を読む。抽出:

- 全 H2 見出し
- ` ```mermaid ` ブロックの有無 / 件数
- テーブル (`|...|`) の有無
- 散文の字数（コード / テーブル / 見出しを除く）
- この実行での P7 の下限: `docs/portal/manifest.yaml` に登録されたエントリの散文の量のうち最小のもの。
  それぞれ英語の canonical で同じ方法で測る。以前の実行やこのファイルの数値を使い回さない

## Step 2. 各観点の評価

H2 見出しテキストだけでなく、各セクションの内容を読んで「観点を実質的に満たしているか」を判定。

### Positive 観点（満たすと +1）

| # | 観点 | シグナル |
| --- | --- | --- |
| P1 | **役割 / 境界** | `What Belongs Here` / `What Does Not Belong Here` の対、または `Role` / `Boundaries` / `Why …`。「受け入れない」側が、外した仕事の行き先を名指ししていること（外したとだけ書いていないこと） |
| P2 | **設計判断** | 判断を論じた節。主張そのものを見出しにしたもの（"The fetch endpoint declares the value classification"）や `Design` / `Trigger Strategy` / `Axis of Switching` / `Decisions This Layer Owns`。ルールの列挙ではなく理由 |
| P3 | **規約 / 禁止** | `Conventions` / `Placement and Naming` / `TSDoc Criteria` / `Storybook Display Conventions`、または許可と禁止を突き合わせた表 —— 読み手を拘束できる形の指示 |
| P4 | **実行機序** | `Execution Mechanics` / `Execution Mechanics and Evaluation Timing` / `Generation and Checks` / `Config Wiring` —— 何がいつ動き、何がトリガーかを書いている |
| P5 | **配下へのインデックス** | `Structure` / `Modules` / `… List` / `… Inventory` / `Hooks Placed Here` —— 配下を持つディレクトリについて |
| P6 | **運用** | `Operations`（登録済み集合で最も多い見出しの 1 つ）に実のある内容: 変更後に何を回すか、何が壊れるか、何を見るか |
| P7 | **散文の量** | 散文が Step 1 で導いた下限以上（コードブロック / テーブル / 見出しを除く）。英語の canonical で測る |

Mermaid 図は加点であって観点ではありません。登録済みエントリで使っているものはありません。

### Negative 観点（トリガすると −2）

| # | 兆候 | 判定 |
| --- | --- | --- |
| N1 | **コンポーネントリファレンス** | component README の形（Purpose / Role and Public Components / Use Cases / Responsibility Boundaries / Storybook and Tests）を持ち、その 1 つの component より大きなものを語る節を他に持たない。その component 自身の振る舞いを書いた節が増えても外れない → Storybook と component の TSDoc の領域 / out-of-scope-for-portal |
| N2 | **Stub** | H2 ≤1 かつ散文 200 字未満 |
| N3 | **Index-only** | 唯一の H2 が `Structure`（または同等の列挙）で、列挙するだけで叙述が無い |
| N4 | **Operational reference** | コマンド / フラグ / 使い方だけ —— スクリプトの起動面であって、判断が何も記録されていない。スクリプトの隣が置き場 |

N1〜N4 は保守的に適用します。役割・設計・実行機序の内容が実質的にあれば、列挙や component の見出しが
あっても N1 / N3 / N4 をトリガしないこと —— `src/components/README.md` が登録されているのは、まさに
その形をはるかに超えて語っているからです。

### 分類しきい値

- **manual-worthy**: positive ≥ 3 かつ negative トリガなし。feature README の場合は Step 2b の必須節がすべて present であることも要る
- **borderline**: positive 1〜2 かつ negative トリガなし
- **not-yet-manual-grade**: positive 0、または positive あっても N2/N3 がトリガ
- **out-of-scope-for-portal**: N1（部品リファレンス）または N4（スクリプトの起動面リファレンス）トリガ

## Step 2b. feature README の必須節チェック

**この段はターゲットが `src/features/` 配下のときだけ走ります** —— slice の中の 1 画面が自分の
README を持っている場合、その入れ子も含みます。`src/features/README.md` 自身は対象外です ——
あれは層 README で、層としての務めは他のカーネル README と同じく P1〜P7 で採点します。

**必須節の一覧をここに焼き込みません。**`docs/templates/feature-readme.md` を読み、冒頭のコメントが
宣言する `required-sections:` の一覧を必須の集合として扱います。feature README が何を持つべきかの正は
テンプレート側であり、節が増減してもこのスキルを書き換えずに追従します。

**H2 見出しから集合を導かないこと。**テンプレートは意図的に任意とした節も持ちます（見出しの名前を
固定しない設計判断の節と、一部の slice にしか要らないテンプレート適応の節）。それらを必須として扱うと、
リポジトリ内の全 README が落ちます。

下の表は、いま宣言されている各節が何を意味するかの読み方です。**一覧そのものではありません** ——
テンプレートの宣言と表が食い違ったらテンプレートが勝ち、表に説明の無い節も宣言されていれば必須です。

下の名前は、テンプレートが宣言する英語のセクション名です。各必須セクションについて、見出しの一致ではなく中身で判定します。

| 必須セクション | 満たしている状態 |
| --- | --- |
| What Belongs Here | その slice が何を引き受けるか。層 README の受入基準の再掲になっていない |
| What Does Not Belong Here | 隣へ渡すものと、その渡し先（`components` / `model` / 他 feature の facade）が名指しされている |
| Routes and Contracts | その slice が持つ route がすべて並び、`docs/spec/route/**` の対へ link が張られ、使う operationId が挙がっている（使わないなら、その旨と理由がある） |
| States and Design References | 出しうる状態それぞれに Storybook の story 識別子（`<title>/<export>`）が対応している。story が無いならその理由が書いてある |
| Structure | その slice が所有するファイル / ディレクトリの表がある |
| Kernel Dependencies | 引いているカーネルと、その用途が書いてある |
| Action Return Contract | Server Action ごとに置き場・戻り値・成功後・失敗時がある。無いなら `なし` |
| Test Perspectives | **その slice でしか出てこない**観点である（ADR 0090 の層別責務の再掲になっていない） |

それぞれを present / thin / missing で報告します。**thin** は見出しはあるが上の表の問いに答えて
いない状態です —— operationId の載っていない operationId の表、story の付いていない状態表、層の
宣言を繰り返すだけの Test Perspectives。

**書いてあることを信じず、突き合わせます。** feature README が story・operationId・route・Action を
名指ししているとき、それは照合できる主張です。

- story 識別子 → その slice の `*.stories.tsx` の `title:` と export 名
- operationId → `openapi/` に置かれたこのリポジトリの OpenAPI 契約 <!-- skill-lint-ignore -->
- 仕様書への link → `docs/spec/route/` 配下の実ファイル
- Action 名 → `"use server"` を持つ module の `export async function`

**解決しない主張は指摘であり、節の欠落より重い**です。読み手にとって、間違った案内は無い案内より
高く付きます。

**必須節に missing か thin がある feature README は `manual-worthy` になりません。**P1〜P7 の点数に
かかわらず `borderline` を上限とし、該当する節をギャップに並べます。

## Step 3. スコアカード出力

日本語。セクション:

```text
README Review: <path>

[判定] manual-worthy | borderline | not-yet-manual-grade | out-of-scope-for-portal

[強み] (満たす positive 観点)
  ✓ P1 役割 / 境界: 「受け入れないもの」が渡し先（components / model）を名指ししている
  ✓ P4 実行機序: いつ評価されるかを起動境界と RSC の 2 経路で書き分けている
  ✓ P6 運用: 変更後に回すものが 3 点（生成 / 突合 / 撮り直し）
  ✓ P7 散文 1,462 字

[ギャップ] (満たさない positive 観点)
  ✗ P2 設計判断を述べた節が無い
  ✗ P3 規約 / 禁止の明文化が無い

[アンチパターン] (トリガした negative)
  なし
  ※（または）⚠ N1 部品リファレンス: 用途 / 役割と公開 component / 利用ケース / 責務境界 / Storybook とテスト の定型のみ → Storybook と TSDoc の領域

[補強提案]
  - 「この層が要る理由」を 1〜2 段落足すと、読み手が層を必要性から理解できる
  - 「受け入れないもの」に渡し先を書き足すと、境界が判断に使える形になる

[portal 適性]
  manual-worthy → /portal-manifest-sync を回し、レポートを見たうえでこのパスを名指しして追加する
  （または）borderline → README 補強後に再 review 推奨
  （または）not-yet-manual-grade → 内容拡充が先、または portal 対象外でよい
  （または）out-of-scope-for-portal → Storybook / TSDoc の領域、portal 不要
```

verbose 時は、raw H2 リスト / 散文の字数 / テーブル件数 / H2 → 観点マッピング も併記。

## Step 4. 次アクション提案

判定に応じて 1 行サジェスト:

| 判定 | サジェスト |
| --- | --- |
| manual-worthy | "/portal-manifest-sync を回し、レポートを見たうえでこのパスを名指しして追加してください" |
| borderline | "P2/P3 等の不足 section を補ってから再 review を推奨" |
| not-yet-manual-grade | "/sync-readme で内容を拡充するか、portal 対象外として扱ってください" |
| out-of-scope-for-portal | "Storybook と TSDoc、あるいはスクリプトの隣で扱うべき内容です。portal manifest への追加は不要" |

## AI 修正スコープ

完全 read-only。

- 読む: 確認済みの対象 README（その `*.ja.md` ミラーは読まない）、P7 の下限のための登録済みエントリの canonical
- 書かない / stage しない / commit しない / push しない

ユーザーが review 結果を踏まえて改善を要求した場合: `sync-readme`（構造 drift）または手動編集を推奨。本スキル内では自動書き換えしない。

## 制約事項

- ❌ 評価ルールを manifest 実態から乖離した形でハードコードする — 上記基準は現時点の manifest snapshot から導出。convention が進化したら再導出
- ❌ "全観点を満たさない → 改善が必要" と短絡判定する — 意図的に簡素な reference もあり、その場合の正解は `out-of-scope-for-portal` であって "fix it" ではない
- ❌ README を manifest に自動追加
- ❌ README を編集
- ❌ ターゲット確認 `AskUserQuestion` をスキップ
- ✅ ユーザー向け出力は日本語
- ✅ 各観点判定に対して README の該当箇所 / 引用を根拠提示
- ✅ "内容を厚くすべき"（not-yet-manual-grade）と "別の場所が正しい"（out-of-scope-for-portal）を区別
- ✅ 意図的に最小限の README は「それでよい」と素直に判定する

## チェックリスト

- [ ] 対象 README パスを `AskUserQuestion` で確認した
- [ ] README 全文を読んだ
- [ ] 全 H2 見出しを列挙し観点にマッピングした
- [ ] 散文の字数を算出した（コード / テーブル / 見出しを除く）
- [ ] Mermaid / テーブルの有無を確認した
- [ ] 各 positive 観点（P1〜P7）を Yes/No + 根拠で評価した
- [ ] 各 negative 観点（N1〜N4）をチェックした
- [ ] feature README なら、必須節を `docs/templates/feature-readme.md` から読み、present / thin / missing で採点した
- [ ] README が名指しした story 識別子・operationId・仕様書 link・Action 名を出所と突き合わせた
- [ ] 最終分類が閾値と一致している
- [ ] 出力は日本語で、各観点に対する具体的根拠を併記
- [ ] 次アクション提案を含む
- [ ] ファイルを編集 / stage / commit していない
