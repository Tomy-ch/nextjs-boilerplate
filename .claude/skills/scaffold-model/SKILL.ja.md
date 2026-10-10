> **このファイルは `SKILL.md` の日本語訳です。**
> 直接編集しないでください。内容の変更が必要な場合は canonical な `SKILL.md`（英語版）を更新し、その後この日本語訳を同期してください。
> Claude Code のスキルとしては `SKILL.md` のみが読み込まれます。このファイルはスキル本体ではなく、レビューや学習用の翻訳ドキュメントです。

# Scaffold Model

`model` カーネルへモジュールを 1 つ置く —— 表示用の型、外部由来の識別子の brand とその構築関数、あるいは
それらに対する最小限の純粋関数 —— を、カーネル自身の監査が何も挙げない形で。

このスキルは自前の規則を持たない。`model` が何を受け入れ、何を断り、断りをそれぞれどう判定するかは、
毎回カーネル README から読む。型の規律は ADR 0029 から読む。このファイルが持つのは**順序**である ——
そもそもここに置くべきかを決め、監査の行に対して計画し、書き、その上に何かが建つ前に別のモデルに型を
採点させる。

## 使うとき

- 表示用の型が 2 か所以上から参照されようとしている —— 2 つの feature、または adapter とそれが仕える
  feature。
- バックエンドから届く識別子に、adapter が返す前に branded type とその構築関数が要る。
- `scaffold-slice` が model の段に来て、型の名前と形を文脈で渡してきた。

## このスキルを使わないとき

- **1 つの feature しか使わない型** —— その feature の内側に置く。Step 1 がこれを決めて止まる。
- **契約の型の写し** —— wire の形は `src/adapters/gen/` に留まり、そこから表示用の型への写しは adapter の <!-- skill-lint-ignore -->
  ものである。契約を手で写すことは [ADR 0072](../../../docs/adr/0072-api-type-generation.ja.md) が断っている。
- **既存の model モジュールの変更** —— 直接編集する。
- **テストを書くこと** —— `scaffold-test`。単独で走るときはこのスキルが連鎖させる。

## このスキルが読むものと書くもの

**実行時に**読む。これらとこのファイルが食い違うときは出所が正であり、食い違いを報告する。

| 出所 | そこが決めるもの |
| --- | --- |
| `src/model/README.md` の frontmatter | `forbidden` タグ / `test-requirement` / `imports-allowed` |
| `src/model/README.md` の `## What Belongs Here` / `## What Does Not Belong Here` / `## Operations` | そのモジュールがここに属するか、ファイル・型・関数の命名 |
| `src/model/README.md` の `## Audit Criteria` | 書いたモジュールが満たすべき行。計画はその 1 行ずつに答える |
| [ADR 0029](../../../docs/adr/0029-type-design-discipline.ja.md) | 判別可能 union / branded な識別子 / 境界で 1 度だけ parse / `satisfies` |
| [ADR 0027](../../../docs/adr/0027-directory-structure.ja.md) / [ADR 0028](../../../docs/adr/0028-naming-convention.ja.md) | 平置きかサブディレクトリか、綴り |
| `src/model/` の隣のモジュール | その場の形 —— brand と構築関数の書き方、union の判別のさせ方 |
| [`type-design-reviewer`](../../agents/type-design-reviewer.md) | 書いた型を採点する。基準は `.claude/skills/impl-review/prompts/type-design.md` |

書くのは `src/model/` の下のモジュール 1 つと、カーネル README がモジュール表を持っていればその行だけ
（その後、`canonicalize-doc` を通してその `README.ja.md` ミラー）。
それ以外は書かない。

## Step 0. 対象を決める

名前は引数から、あるいは `scaffold-slice` の文脈から取る。無ければ `AskUserQuestion` で訊く。

1. **名前**（kebab-case）と、その値が画面で何を意味するかの 1 行。
2. **誰が参照するか** —— どの feature か、adapter が返すか。
3. **形** —— 項目、取りうる状態、どの項目がバックエンドから来る識別子か。

形を作らない。意図しか無いなら訊く。表示用の型は画面が見せると約束するものであり、その約束は user のもの
である。

## Step 1. `model` に属するかを決める

`src/model/README.md` を通読し、受け入れの節を Step 0 の答えに当てる。

- **1 つの feature からしか参照されない** → その feature の内側に属する。そう言って止まる。
- **adapter が返す** → adapter が返せるのは自分が import できるものだけである。`src/adapters/README.md`
  の `imports-allowed` を読む。adapter が返す型は feature には住めないので、選択肢はこのカーネルか
  adapter のモジュール自身かになる。README がどちらかを決めていなければ訊く。
- **契約が返さない値を計算する、あるいは業務ルールを判定する** → README が断っている。断っている行を
  名指して止まる。そのルールはバックエンドのものである。

ここで止まるのは結果であって失敗ではない。どの節が決めたかを報告する。

## Step 2. 監査の行を読み、それに対して計画する

`src/model/README.md` の frontmatter と `## Audit Criteria` の表を読み、次に ADR 0029 を、次に具体の参照として
隣のモジュールを 1〜2 本読む（食い違えば README と ADR が勝つ）。

計画は**監査の行 1 つにつき 1 行**の表として組む。

| 行（観点） | 計画したモジュールがどうその内側に留まるか |
| --- | --- |

- 根拠が `機械:` で始まる行はゲートが強制している。踏まないように計画し、ここで判定し直さない。
- それ以外の行には具体の答えを書く —— どの項目を brand にするか、どの状態で union を組むか、なぜその
  関数が判定ではなく最小限の表示ロジックなのか。
- 行を持たない `forbidden` タグは README の欠けである。タグそのものに対して計画し、欠けを報告する。

ファイルパス、export するシンボルとその種類、`scaffold-test` に書かせるテストファイルを添える。
`AskUserQuestion` で確認する: 「この計画で model を置きますか？」 / 「修正したい」 / 「キャンセル」。
`scaffold-slice` からでも同じように確認する —— 層ごとに個別に確認を取る。

## Step 3. モジュールを書く

計画が名指したものを正確に書き、計画に無いものは書かない。

- **コメントを書かない。** 実装はコメントを書かない。モジュールがどれを得たかは Step 6 が決める。
- **`as` を使わない、公開面に `unknown` を置かない、外部由来の識別子を素の `string` にしない** —— これは
  ADR 0029 と README が監査する行であり、計画が既に答えている。
- **`imports-allowed` を越えて import しない。** `config` から要りそうな値は引数で受け取る。
- **依存を足さない。** 依存なしにモジュールが書けないなら止まる。依存の追加は
  [ADR 0004](../../../docs/adr/0004-library-management.ja.md) が持つ停止点である。

README がモジュール表を持っていれば、その表の言い回しでモジュールの行を足す —— README は canonical なので英語で書く。
そのうえで `canonicalize-doc` へ連鎖させ、その `README.ja.md` ミラーを同じ変更で同期する。

## Step 4. `type-design-reviewer` で型を採点する

**Agent ツール**で [`type-design-reviewer`](../../agents/type-design-reviewer.md) を起動し（model は
`sonnet`。型を書いたモデルと採点するモデルを分けるため）、次を渡す。

- `scope` —— `changed`
- `files` —— Step 3 で書いたモジュール
- `staticVerdict` —— `未取得`

所見は返ってきたとおりに示す。1 件ずつ、いま適用するかを user に訊く。承認されたものを適用し、残りは報告に
残す。レビュアーは read-only であり、編集はすべて承認のあとにこのスキルが行う。

このパスがどのファイルに対して走ったかを記録する。後でこの変更について `/impl-review` を見積もるとき、同じ
モジュールへの型設計のパスは既に済んでいる —— 見積もりにそう書く。

## Step 5. テスト

このカーネルの `test-requirement` は frontmatter から読む（Step 2）。単独のときは、新しいモジュールに
`scaffold-test` を連鎖させる。`scaffold-slice` からのときは触らない —— スライスが置いた単位すべてに対して、
オーケストレーターが `scaffold-test` を 1 回回す。

## Step 6. コメントを決着させて引き渡す

単独のときは、ここで書いた宣言に対して `/settle-comments` を回す —— 実装の最後に無条件で走る段であり、
書く前に確認を取る。`scaffold-slice` からのときは、オーケストレーターが最後に 1 回回す。

日本語で報告する: 書いたファイル、計画の監査行の表、`type-design-reviewer` の所見と適用したもの・残したもの、
見つけた README の欠け。commit しない。

## 制約

- ✅ `src/model/README.md` / ADR 0029 / 隣のモジュールを今回の実行で読む
- ✅ 計画で `## Audit Criteria` の全行に答え、書く前に計画を確認する
- ✅ Step 1 が `model` に属さないと言ったら止まる
- ✅ 書いた型を `sonnet` の `type-design-reviewer` で採点する
- ❌ 1 つの feature しか使わない型を置く
- ❌ 契約の型を写す、または `src/adapters/gen/` から import する <!-- skill-lint-ignore -->
- ❌ コードを書きながらコメントを書く
- ❌ 依存を足す、あるいは迂回する
- ❌ README の行や ADR 0029 の規則をこのファイルへ書き写す

## チェックリスト

- [ ] 名前・参照元・形を決めた。どれも作っていない
- [ ] 受け入れを README から決めた。断られたら止まった
- [ ] 計画が監査の全行に答えている。README の欠けを報告した。計画を確認した
- [ ] コメント無しで、`imports-allowed` の内側でモジュールを書いた。モジュール表があれば行を足し、README のミラーを同期した
- [ ] 書いたファイルに `type-design-reviewer` を走らせた。所見は承認されたものだけ適用した
- [ ] `scaffold-test` を連鎖させた（単独）か、`scaffold-slice` に任せた
- [ ] `/settle-comments` を回した（単独）か、`scaffold-slice` に任せた。commit していない
