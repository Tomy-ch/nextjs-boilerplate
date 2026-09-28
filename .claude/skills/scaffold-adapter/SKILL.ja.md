> **このファイルは `SKILL.md` の日本語訳です。**
> 直接編集しないでください。内容の変更が必要な場合は canonical な `SKILL.md`（英語版）を更新し、その後この日本語訳を同期してください。
> Claude Code のスキルとしては `SKILL.md` のみが読み込まれます。このファイルはスキル本体ではなく、レビューや学習用の翻訳ドキュメントです。

# Scaffold Adapter

`adapters` の下に取得の口を 1 つ作る —— 正しい接続口を通ってバックエンドを呼び、応答を生成スキーマで検証し、
表示用の型を返す関数 —— を、カーネルの監査が何も挙げない形で、しかもその上に何かが建つ前に契約テストで
固定された状態で。

**置き場は生成器のものである。** `pnpm gen adapter <name>` がパス・ファイル名・骨組みを決め、このスキルは
生成器が書くはずのものを手で置かない。このスキルが足すのは生成器には分からない部分 —— 口がどの契約の
operation を呼ぶか、そこから導かれる分類と接続口、寿命を持つかどうか —— である。

## 使うとき

- feature か Route Handler が、どの adapter もまだ呼んでいない operation を必要としていて、その operation は
  取得済みの契約に既に在る。
- `scaffold-slice` が adapter の段に来て、名前と operation を文脈で渡してきた。

## このスキルを使わないとき

- **契約の変更。** 契約はバックエンドのものであり、`openapi/` は取得して固定するだけで、生成物は手で直さない
  （[ADR 0072](../../../docs/adr/0072-api-type-generation.md)）。Step 0 が operation の在否を確かめ、無ければ
  引き渡す。
- **既存の adapter モジュールへの関数の追加** —— そのモジュールを編集する。生成器は既に在るパスを拒み、
  このスキルはそれを迂回しない。
- **ブラウザ側の口**（`client/`） —— `pnpm gen adapter` が置くのは server 側だけである。
- **要求を持たない純粋な変換** —— 単位である。書いて `scaffold-test` を回す。
- **契約テストを手で書くこと** —— `scaffold-integration-test`。Step 6 が連鎖させる。

## このスキルが読むものと書くもの

**実行時に**読む。これらとこのファイルが食い違うときは出所が正であり、食い違いを報告する。

| 出所 | そこが決めるもの |
| --- | --- |
| `src/adapters/README.md` の frontmatter | `forbidden` タグ / `test-requirement` / `imports-allowed` |
| `src/adapters/README.md` の `## 監査の観点` | 口が満たすべき行。計画はその 1 行ずつに答える |
| `src/adapters/README.md` の分類・寿命・資格情報・URL の予算・taint の節 | どの接続口か、`allowAnonymous` を立てるか、寿命を持つか・どう持つか、結果を汚すか |
| `src/adapters/server/http/README.md` | 口が通る接続口と要求境界 |
| `openapi/<name>.gen.yaml` と `src/adapters/gen/` | operation と、その `security`・パラメータ・宣言された応答・生成スキーマ |
| `scripts/gen/` | `pnpm gen adapter` が何を置き、どんな次の手順を出すか |
| 同じ種類の operation を呼ぶ隣のモジュール | 要求・写し・taint の具体の形。食い違えば README が勝つ |

書くもの: `pnpm gen adapter` が置いたもの、そのあとはそれらのファイルへの編集だけ。`src/adapters/gen/` と
`openapi/` の下には書かない。

## Step 0. 前提条件

名前と operation（`operationId`）を、引数・`scaffold-slice` の文脈・`AskUserQuestion` のいずれかで決める。
そのうえで次を確かめ、**最初に落ちたところで止まる**。

1. **operation が取得済みの契約に在る。** 各 `operationId` を `openapi/*.gen.yaml` から探す。無ければ引き渡しを
   添えて止まる: 契約はバックエンド側で変わり、そのあと `openapi/sources.yaml` の `ref` が動き、
   `make ai-api-fetch` と `make ai-api-gen` が生成し直す（手順は `openapi/README.md` が持つ）。その移動は
   `scaffold-slice` が確認つきで行い、このスキルは行わない。
2. **生成物が契約と揃っている。** `make ai-api-gen-check`。ずれているなら、誰かが取得したまま生成していない。
   直すのは `make ai-api-gen` であって、`src/adapters/gen/` の編集ではない —— そこは生成物であり
   （`git check-attr linguist-generated -- <path>` がそう答える）、編集は `AGENTS.md` の trip wire である。
3. **置き先のパスが無い。** `pnpm gen adapter` は既に在るパスを拒み、このスキルも同じく拒む。
4. **口が返す表示用の型が在る**か、今回の実行に含まれている。adapter が返せるのは自分が import できる
   ものだけである —— `imports-allowed` を読む。型がまだ無ければ先に `scaffold-model` を回す（あるいは
   `scaffold-slice` に順序を任せる）。

## Step 1. カーネルを読み、口を導く

`src/adapters/README.md` を通読し、`src/adapters/server/http/README.md`、契約の operation とその生成
スキーマ、同じ種類の operation を呼ぶ隣のモジュールを 1 本読む。

下の問いそれぞれに、**それらの出所だけから** 1 つずつ答えを導き、答えごとにそれが来た文や項目を添える。

| 問い | 導く元 |
| --- | --- |
| 分類と接続口 | README の分類の節を、operation の `security` と、応答が主体で変わるかに当てる |
| 要求の `allowAnonymous` | README の資格情報の節を、operation の `security` に当てる |
| 寿命（`use cache`・profile 名・tag）か、寿命なし | README の寿命の節と、`next.config.ts` が宣言する profile |
| 結果の taint | README の taint の節と、表示用の型が運ぶ項目についての ADR 0112 の分類 |
| 表示用の型と写し | Step 0 の表示用の型と、生成された応答の型 |
| URL の予算 | operation が条件を query に載せるときの、README の URL の予算の節 |

**出所から答えられない問いがあれば、止まって引き渡す** —— 問い、読んだ出所、何が決まれば答えられるかを
名指す。好みで選んだ寿命、パスから当て推量した分類、`security` を読まずに立てた `allowAnonymous`、PII かが
不明なために省いた taint は、どれも型も lint も拒まない欠陥を出しうる —— `allowAnonymous` については README
自身がそう書いている。

## Step 2. 監査の行に対して計画する

frontmatter と `## 監査の観点` の表を読む。計画は**行 1 つにつき 1 行**の表として組む。

| 行（観点） | 口がどうその内側に留まるか |
| --- | --- |

- 根拠が `機械:` で始まる行はゲートが強制している。踏まないように計画し、判定し直さない。
- それ以外の行には Step 1 からの具体の答えを書く —— どの接続口か、なぜ公開面が生成型を名指さないか、
  どこで汚すか。
- 行を持たない `forbidden` タグは README の欠けである。タグに対して計画し、欠けを報告する。

コマンド（`pnpm gen adapter <name>`）、それが置くファイル、export するシンボル、Step 1 の表、Step 6 が作る
テストを添える。`AskUserQuestion` で確認する:
「この計画で adapter を置きますか？」 / 「修正したい」 / 「キャンセル」。

## Step 3. 生成器で置く

```sh
pnpm gen adapter <name>
```

止まったらそのメッセージを出して止まる。ファイルを手で作らない。生成器は自分の次の手順を出す —— この
スキルがまだ扱っていない部分に従う。

## Step 4. 骨組みを埋める

生成されたスタブを計画どおりの口に置き換える。

- 要求は Step 1 が導いた接続口を通り、生成スキーマを伴い、表示用の型を返す。export されるシグネチャに
  `src/adapters/gen/` 由来のものは現れない。
- 寿命と taint は Step 1 が導いたとおりに —— 導かなかったなら持たせない。
- **骨組みが持つ生成された `TODO:` の文を消す。** 計画が答えている。**新しいコメントは書かない** —— 口が
  どれを得たかは Step 7 が決める。
- **骨組みのテストを置き換える。** それはスタブの本体を固定しており、その本体はもう無い。生成器が置いた
  テストファイルを消す。1:1 ゲートはそれを `missing-test-file` として報告し、Step 6 が口の実際の分岐から
  書く。
- **依存を足さない。** 依存なしに口が書けないなら止まる。依存の追加は
  [ADR 0004](../../../docs/adr/0004-library-management.md) が持つ停止点である。

## Step 5. 書いた口を計画と突き合わせる

書いたファイルを Step 2 の表に対して 1 行ずつ読み返し、答えからずれた行はテストを書く前に直す。これは
書き手の確認であって監査ではない —— 監査は `arch-check` であり、`scaffold-slice` が最後に回す。

## Step 6. テスト

- **常に**: 新しいモジュールに `scaffold-integration-test` を連鎖させる。口は要求を持ち、それこそが README の
  `integration` の宣言が掛かる対象である。
- **単独のとき**: 単位の側（写しと、このモジュールについて 1:1 ゲートが挙げるもの）に `scaffold-test` を連鎖
  させる。`scaffold-slice` からのときは触らない —— オーケストレーターがスライス全体に `scaffold-test` を
  1 回回す。

## Step 7. コメントを決着させて引き渡す

単独のときは、ここで書いた宣言に対して `/settle-comments` を回す。実装の最後に無条件で走る段であり、書く前に
確認を取る。`scaffold-slice` からのときは、オーケストレーターが 1 回回す。

日本語で報告する: 置いたファイルと編集したファイル、Step 1 の導出とその出所、監査行の表、作ったテスト、
引き渡したものとその理由、README の欠け。commit しない。

## AI Modification Scope

書くのは `src/adapters/` の下だけで、`pnpm gen adapter` を通し、そのあとはそれが置いたファイルへの編集に
限る。`openapi/` と `src/adapters/gen/` はここでは read-only である。

## 制約

- ✅ 何かを置く前に、契約と生成物を確かめる
- ✅ `pnpm gen adapter` で置く。止まったら止まる
- ✅ 分類・接続口・`allowAnonymous`・寿命・taint を README と契約から導き、それぞれに出所を添える
- ✅ 出所の無い導出は止まって引き渡す
- ✅ 計画で `## 監査の観点` の全行に答え、書く前に計画を確認する
- ✅ `scaffold-integration-test` を連鎖させる
- ❌ `openapi/**`・`src/adapters/gen/**`、その他の生成物を編集する
- ❌ 生成器が書くはずのファイルを手で置く
- ❌ 寿命・分類・taint を好みで選ぶ
- ❌ 骨組みのテストにスタブを固定させたまま残す
- ❌ 依存を足す、あるいは迂回する
- ❌ README の規則をこのファイルへ書き写す

## チェックリスト

- [ ] operation が取得済みの契約に在る。`make ai-api-gen-check` が緑。置き先が空いている。表示用の型が使える
- [ ] README・http の README・契約・隣のモジュールを今回の実行で読んだ
- [ ] 導出はすべて出所まで辿れるか、引き渡した
- [ ] 計画が監査の全行に答えている。README の欠けを報告した。計画を確認した
- [ ] `pnpm gen adapter` で置いた。スタブと骨組みのテストを置き換えた。`TODO:` を消した。コメントを書いていない
- [ ] `scaffold-integration-test` を連鎖させた。`scaffold-test` を連鎖させた（単独）か、`scaffold-slice` に任せた
- [ ] `/settle-comments` を回した（単独）か、`scaffold-slice` に任せた。commit していない
