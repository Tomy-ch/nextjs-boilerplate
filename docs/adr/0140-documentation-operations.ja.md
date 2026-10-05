> **このファイルは [`0140-documentation-operations.md`](0140-documentation-operations.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `0140-documentation-operations.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `0140-documentation-operations.md` だけです。このファイルは人間が読むための翻訳です。

# ドキュメント運用ポリシー

ドキュメントの **canonical 言語モデル(EN canonical / JA ミラー)/ ADR タクソノミー 4 分類 / `rules.md` の位置づけ / ADR の不可変性・採番ライフサイクル / per-package README 運用 / 運用スキル / 理由の単独所有** を定める。

## Status

Accepted

## v1.0.0 までの暫定運用

> **(このセクションは v1.0.0 時には消すこと)**

v1.0.0 未満の間は、下記「決定 4」の living 運用が効いている。

- **ADR 本文は直接上書きしてよい** — Protected Documentation の都度承認を解除する(AGENTS.md「Temporary Operating Rules until v1.0.0」セクションと対をなす。編集許可のいまの形と最終形は [0152](0152-agents-md-policy.ja.md) が持つ)
- **経緯・変遷を本文に残さない** — 「当初は X だったが Y に改訂」のような改定履歴・検討経緯を本文に書かない。決定の**現在形**だけを書く。経緯は git 履歴が持つ
- v1.0.0 到達時に本セクションを削除する。切替の条件と手順は決定 4 が持ち、本セクションに依存しない

## 背景

本リポジトリのドキュメントは、日本語の読者と、英語の frontmatter や英語のツール出力を前提に動く AI エージェント・ツールの両方に読まれる。canonical を 1 つに定めないと、どちらを直せば正なのかが決まらず、2 つのバージョンが別々に古くなる。

設計知識は性質の違う 4 種(decision / exclusion / rule / inventory)を含む。不変の記録と日々強制される制約と漂うインベントリを同じ文書に同居させると、インベントリが「根拠」の顔をしたまま腐り、制約が ADR 本文の中に埋もれて機械強制の対象にならない。分類の判定は [`docs/README.md`](../README.ja.md) が持ち、本 ADR はそれぞれの置き場と運用を定める。

## 決定

### 1. canonical 言語モデル: 英語の canonical と兄弟の日本語ミラー

- **三層**: 英語 canonical + 日本語ミラー + 生成 portal([0141](0141-portal-operations.ja.md))。canonical は**サフィックス無しのパス**で、英語で書く —— `docs/**`、レイヤー README、ルートの文書、`.claude/**` を問わない。日本語ミラーは同じディレクトリの兄弟 `<name>.ja.md` である。ミラーを除外するのは置き場ではなくサフィックスであり、並行ツリーは無い。AI エージェントは英語 canonical を読み、`*.ja.md` は読まない。例外は `canonicalize-doc` が指定された 1 組のペアを読むことだけである(この例外は AGENTS.md が持つ)
- **追跡されているサフィックス無しの `.md` はすべて英語 canonical と兄弟のミラーを持つ。例外は次の閉じた一覧だけである**:

  | ミラーを持たないもの | パス | 理由 |
  | --- | --- | --- |
  | ディレクトリごと読み込まれる | `.claude/agents/*.md` | Claude Code はこのディレクトリの `.md` をすべて agent 定義として読み込むので、兄弟の `.ja.md` は重複した、または不正な定義として読まれる。agent 定義が持つのは入力の受け取り方だけで([0155](0155-claude-skills-development.ja.md))、基準は `prompts/` にあり、そちらはミラーを持つ |
  | 読み込みの 1 行 | `CLAUDE.md` | 中身は `@AGENTS.md` だけである([0152](0152-agents-md-policy.ja.md)) |
  | 日本語の出力そのもの | `.github/release/**`、`.github/pull_request_template.md`、`.github/settings/baseline-store/readme-template.md` | AGENTS.md の Output Language が定める日本語の出力(リリースノート、PR 本文、別リポジトリへ生成する README)であって、従うべき canonical を持つドキュメントではない |
  | v1.0.0 のカットで消える | `docs/plan/**`、`docs/adr/BACKLOG.md` | 決定 4 の手順 4 | <!-- boilerplate-only:line -->
  | 生成物 | `docs/portal/**`、`linguist-generated` の付いたファイル | 生成器が canonical から書く([0141](0141-portal-operations.ja.md)) |

- **canonical はミラーへリンクしない** —— ミラーの名前を平文で挙げるのは構わない。両方を読むと同じものを 2 回読むことになり、ミラーがあることはサフィックスの規約として、ここと [`docs/README.md`](../README.ja.md) に 1 度だけ書く。ミラーからは canonical へリンクする
- **ミラーは 1 行目に同期の注記を置き、frontmatter を持たない。** frontmatter を読み書きするのは canonical 側だけなので、ミラーへコピーすれば、誰にも更新されないまま生成物を名乗るコピーになる。注記の文面:

  ```markdown
  > **このファイルは [`<name>.md`](<name>.md) の日本語訳です。**
  > 直接編集しないでください。変更は英語の canonical な `<name>.md` を先に更新し、そのうえでこの日本語訳を同期してください。
  > エージェントが読むのは `<name>.md` だけです。このファイルは人間が読むための翻訳です。
  ```

  `SKILL.ja.md` と `AGENTS.ja.md` は、3 行目でスキルや規約として読み込まれるものを述べる、それぞれの 3 行の注記を使う
- **翻訳は canonical に追従する**: canonical を先に更新し、ミラーを同じ変更で追従させる。canonical が常に権威である。知識を探すのも判定を当てるのも書き換えるのも canonical に対して行い、ミラーを inline で直さない。ペアの生成と同期は **`canonicalize-doc` スキル**で行う
- **ミラーは Web と開発一般の用語をカタカナか英語で書き、漢字の直訳語にしない**(`索引` ではなく `インデックス`。`canonical` は英語のまま)。用語表は `canonicalize-doc` が持つ
- **ワークフロー定義(`.github/workflows/**` と `.github/actions/**`)のコメントは英語で書く**(日本語規則の例外)。ワークフローは公開リポジトリのうち**外から最も読まれる部分**である —— 上流のバグ報告へ貼られ、最初に手を入れる場所であり、外の読み手が判断に使うハードニングの根拠(SHA ピン / 最小 permissions / fail-closed。[0153](0153-ci-configuration.ja.md))を載せている。加えて英語しか出さない道具の出力(`actionlint` / `shellcheck`)と直に並ぶ。`.github/` のそれ以外(issue / PR テンプレート・`settings/`・道具の設定)は日本語規則に従う —— 定義ではないものは道具の出力と並ばない
- AGENTS.md Language Rules の日本語出力の一覧に「Documentation」が無いのは、このモデルによる: canonical は英語であり、日本語ミラーはそれに追従する翻訳である

強制: 既存のすべてのペアの構造は skill-lint が見る —— canonical との見出しレベルの一致、ミラーの 1 行目の同期の注記、ミラーに frontmatter が無いこと。doc-links は canonical からミラーへのリンクを落とす(reason `mirror`)。ミラーの存在を見るのは `SKILL.md` と `AGENTS.md` だけで(skill-lint)、それ以外の canonical については散文 —— **寄せられない** —— 存在の検査は空のミラーを通し、ミラーが canonical と同じことを言っているかは意味の判断である。

### 2. ADR タクソノミー(4 分類)

分類の意味と判定は [`docs/README.md`](../README.ja.md) が持つ。本 ADR が定めるのは置き場と表記である。

| 分類 | 置き場 |
| --- | --- |
| **decision** | `docs/adr/` |
| **exclusion** | `docs/adr/`(Status に `Accepted (exclusion)`、decision と混在する場合は `Accepted (一部 exclusion)` と明記。例: `Accepted (exclusion)` = [0121](0121-i18n-strategy.ja.md) / [0130](0130-pwa-strategy.ja.md)、`Accepted (一部 exclusion)` = [0082](0082-client-observability.ja.md) / [0110](0110-security-operations.ja.md) / [0131](0131-cookie-consent.ja.md)) |
| **rule** | **`docs/rules.md`**(下記 3) |
| **inventory** | ADR には入れない。家は [`docs/reference/`](../reference/README.ja.md) —— コードに追随して変わるインベントリで、正はコード側、書き換えは対象のコードと同じ変更の中で行う。インベントリは根拠を持たず、選定の理由は ADR へリンクするだけ |

- **exclusion** はセットアップ時に直接編集して独自ベースラインを敷けるものとする(supersede-by-new-ADR モデルは setup 後の変更にのみ適用)
- **ADR の decision から自然に決まるものを、別の ADR で二重に決定しない。** tooling や reference は ADR を要さず、規約に昇格するものだけを ADR 化する

#### exclusion は撤回条件を同じ本文に持つ

**「やらない」と決めたら、再検討を開始する条件をその ADR の本文に書く。** 決定だけを残すと、なぜやらないのかは書かれても**いつなら考え直すのか**が残らず、前提が変わったことに誰も気づけない。条件は決定を持つ ADR が持ち、別の台帳へ出さない —— 出せば決定と条件が別々に古くなり、条件の側は誰からも指されないまま消える。

- **書くのは前提そのものの変化であって、状態ではない。** 道具がその機能を備えたとき / その性質が消えたとき / 標準がそれを定めたとき、が前提の変化である。「検出件数が 0 になった」「いまの実測が速い」「計測の点が低い」はいずれも条件にならない —— 採ると、前提が変わっていないのに決定が動く。**緑は規約が守られている証拠であって、機構が要らない理由ではない**
- **条件が成立しても自動的には撤回しない。** そこで ADR を読み直して判断し直す。条件は再検討の開始点であって結論ではない
- **条件を書けない「やらない」は、判断ではなく先送りである**
- **決着して変更まで出た issue に `wontfix` を付けない。** 後から見た人が「検討されずに放置された」と読む。決定の生存を持つのは ADR の本文であって、issue のラベルではない

強制: 散文。**寄せられない** —— 書かれた条件が前提の変化なのか状態なのかは、その決定の意味からしか決まらない。

### 3. `rules.md` = rule の集約先(AGENTS.md には積まない)

- **`docs/rules.md`** に rule 分類(日常強制される制約)を集約する。AGENTS.md は運用規約の集約ファイル([0152](0152-agents-md-policy.ja.md))であって rule の置き場ではなく、そこへ rule を積むと確実に肥大化する
- 各ルールには **`> Rationale: [ADR-NNNN](...)` の逆参照リンク**を付け、「ADR = なぜ(決定)/ `rules.md` = 日々強制される制約」の役割分担を体現する

### 4. ADR の不可変性・採番ライフサイクル

- **v1.0.0 未満(pre-v1)= living document**: ADR 本文を直接上書きし、改定履歴を残さない(pre-v1 なので過去記述の破棄を許容)。この運用は本 ADR が宣言し、各 ADR の Status はコピーを持たない
- **v1.0.0 から immutable**: accepted 後は Status 行のみ編集 / supersede = 本文編集ではなく新 ADR を追加し旧を superseded 化 / **番号は再利用しない**
- **採番はトピック順ブロック帯**(10 番台 = 主題ブロック。`docs/adr/README.md`)。帯の間の空き番号は将来の挿入用に予約する

**切替の条件は v1.0.0 のリリースそのもの**である。`release/v1.0.0` を切る変更で行い、ADR ごとに時期をずらさない —— 一部だけを immutable にすると、どの ADR が上書きしてよいのかを Status の外に持つことになる。

切替時に行うこと:

1. 全 ADR 本文から経緯・比較検討・反転の記述を除き、決定の現在形だけにする(禁止事項の「経緯を書かない」を、living 期間に混入した分まで遡って適用する)
2. 本 ADR の「v1.0.0 までの暫定運用」セクションと、AGENTS.md の「Temporary Operating Rules until v1.0.0」セクションを削除する
3. `.claude/settings.json` の `permissions.deny` に Accepted ADR 本文(`Edit(docs/adr/*-*.md)` / `Write(docs/adr/*-*.md)`)を足す。編集許可の最終形と復元手順は [0152](0152-agents-md-policy.ja.md) が持ち、同じ変更で行う
4. `docs/plan/**` と `docs/adr/BACKLOG.md` を削除し、その存在を前提にした機械の宣言(剥がしの対象・検査の除外・マーカー行数のベースライン)を同じ変更で外す —— どちらもこの状態を生んだ工程の文書であって、状態そのものではない。決めたことはその時点で ADR に在り、未決の追跡は issue トラッカーへ移っており、残るのは git が既に持つ履歴である <!-- boilerplate-only:line -->

以後の変更は supersede だけになる —— 新 ADR を起票し、旧 ADR は Status 行を `Superseded by NNNN` へ書き換える。

強制手段: 3 は Claude Code の `deny`(届かない範囲は [0152](0152-agents-md-policy.ja.md))。immutable な本文が Status 行以外で動いていないことは、`docs/adr/*-*.md` の差分を Status 行に限定する CI 検査として書ける —— 寄せられるが未実装。1 の「経緯かどうか」は文の意味判断で、機械へは寄せられない(レビューが見る)

### 5. per-package README 運用

- 各パッケージ / レイヤーの **README(canonical)を正**とし、監査・実装の実行時読込元とする([0021](0021-frontend-responsibility.ja.md) が各レイヤーの README を運用の正と定める規則と接続)
- README も canonical 言語モデル(上記 1)に従う: README が英語 canonical で、その日本語ミラーは兄弟の `README.ja.md` である
- **README は親子で境界を持つ。** 子ディレクトリが自分の README を持つなら、親はその子を 1 行の digest と参照リンクに留め、中身を再帰的に展開しない。展開すると同じ内容が 2 か所に住み、片方が遅れる
- **README の実ファイル列挙をゲートにしない。** README が並べたファイル名をパースして実体と突合する検査は、README の書き方を縛るだけで腐りを防げない。構造ドリフトは `sync-readme` の判断に委ねる(下記 6)

### 6. 運用スキル

- **canonicalize-doc**(EN/JA ペア生成・同期)/ **sync-readme**(構造ドリフト検出・整合)/ **readme-review**(内容の manual-worthy 判定)を、それぞれ翻訳・構造ドリフト・内容レビューの運用に充てる([0155](0155-claude-skills-development.ja.md) 公認の開発系スキル。配置・命名・frontmatter 規約は [0154](0154-claude-skills-operations.ja.md) と共通)

### 7. 理由の単独所有 — 手順の文書は逆参照で済ませる

- **判断の理由は ADR が単独で持つ。** `.makefiles/README.md` / `.claude/skills/*/SKILL.md` / レイヤー README が書くのは **何が起きるか(挙動)と、どう使うか(手順)** だけで、なぜそれを選んだかは `> Rationale: [NNNN](...)` の逆参照で済ませる(上記 3 の `rules.md` と同じ形)
- **SKILL は単体で読まれる前提だが、自己完結させるのは手順であって理由ではない。** エージェントが操作を変えるのに要る事実(fail-closed で落ちる / ロックファイルを書かない / 承認は 1 回分)は SKILL 側に置き、**その挙動を選んだ論証は置かない**。理由は読んでも操作が変わらず、ADR を直したときに追随されないまま残る
- 判定は「**それを読まなかった読み手が違う操作をするか**」の一問による。しないなら理由であり、置き場は ADR である

## 禁止事項

- ❌ decision / exclusion を `rules.md` に、rule を ADR 本文に書くこと(タクソノミーの取り違え)
- ❌ pre-v1 の ADR に改定履歴表を積むこと(living document。直接上書き)
- ❌ v1 前に ADR を immutable 扱いして supersede-by-new-ADR を強制すること(pre-v1 は living)（強制: 散文 —— **寄せられない**。ADR を immutable として扱うかは運用の判断で、ファイルの形に現れない）
- ❌ 改定の経緯・比較検討・反転の日付をドキュメント本文に書くこと(決定の現在形のみを書く。経緯は git 履歴が持つ)
- ❌ `*.ja.md`(日本語ミラー)を AI エージェントの canonical 読込元にすること(エージェントは英語 canonical を読む)（強制: 散文 —— **一部寄せられる**。Claude Code の読込は `.claude/settings.json` の `permissions.deny` に `Read(**/*.ja.md)` を置けば落とせるが規則は無い。翻訳を同期するスキルの読込との両立と、他のエージェントの読込元は機械で縛れない）
- ❌ AGENTS.md に rule を積むこと(rule は `rules.md` へ)
- ❌ 同じ理由付けを ADR と手順の文書(README / SKILL)の両方に書くこと(上記 7。手順側は逆参照だけを持つ)
- ❌ README のファイル列挙を実体と突合するゲートを置くこと(上記 5)（強制: 持たない —— 採らない決定。README のファイル列挙を突合するゲートは置かれておらず、足す変更はゲートの追加として diff に現れる）

## 補足

- 本 ADR は [0141](0141-portal-operations.ja.md)(portal 運用)の親決定であり、canonical → portal 生成の三層戦略の上流に立つ

## 関連 ADR

- [0152-agents-md-policy.md](0152-agents-md-policy.ja.md) — AGENTS.md 構成方針(運用規約の集約ファイル。rule の置き場は `rules.md` に分ける)
- [0155-claude-skills-development.md](0155-claude-skills-development.ja.md) — Claude スキル運用・開発系(canonicalize-doc / readme-review / sync-readme / portal-manifest-sync の公認。配置・命名・frontmatter は [0154-claude-skills-operations.md](0154-claude-skills-operations.ja.md) と共通)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.ja.md) — レイヤー別 README 運用(per-package README = 正)
- [0141-portal-operations.md](0141-portal-operations.ja.md) — 生成 portal(本 ADR の三層戦略の第 3 層)
- [0121-i18n-strategy.md](0121-i18n-strategy.ja.md) / [0130-pwa-strategy.md](0130-pwa-strategy.ja.md) — exclusion ADR の実例(`Accepted (exclusion)`)
- [0082-client-observability.md](0082-client-observability.ja.md) / [0110-security-operations.md](0110-security-operations.ja.md) — 一部 exclusion ADR の実例(`Accepted (一部 exclusion)`)
- [`docs/README.md`](../README.ja.md) — 4 分類の判定と行き先
- [`docs/reference/README.md`](../reference/README.ja.md) — inventory の家(コードに追随するインベントリの契約)
