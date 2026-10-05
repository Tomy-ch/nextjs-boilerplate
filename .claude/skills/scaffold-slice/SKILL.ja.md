> **このファイルは `SKILL.md` の日本語訳です。**
> 直接編集しないでください。内容の変更が必要な場合は canonical な `SKILL.md`（英語版）を更新し、その後この日本語訳を同期してください。
> Claude Code のスキルとしては `SKILL.md` のみが読み込まれます。このファイルはスキル本体ではなく、レビューや学習用の翻訳ドキュメントです。

# Scaffold Slice

feature スライスを 1 つ、契約から内側へ向かって作る —— 表示用の型、取得の口、スライスの住処、`app` の
入口 —— それぞれを所有するスキルを連鎖させ、そのあと作ったものを監査する。

このスキルは**自分ではソースを書かない**。ファイルはすべて子スキルか `pnpm gen` から来て、そのどれもが
自分のカーネル README を読み、自分の計画を確認する。ここに在るのは順序、各段が次へ渡すもの、連鎖が
止まる場所である。

画面の見た目から始める `new-feature` の、契約から始める側の対である。**2 つは `pnpm gen feature` で出会う**:
このスキルがスライスを置き、見た目・story・仕様書・画面のテストは `new-feature` に残る。`new-feature` は
置かれた画面を story から引き取る。

## 使うとき

- スライスがバックエンドの提供する operation から始まり、契約から `app` の入口までの道筋を一貫して作る
  必要がある。
- 新しい表示用の型・新しい口・新しい入口がすべて要り、依存の順に作ればどれも 2 度書かずに済む。

## このスキルを使わないとき

- **画面の見た目・story・仕様書を確定させること** —— `new-feature`。このスキルはその手前で止まり、置いた
  画面を引き渡す。
- **1 つの層だけ** —— `scaffold-model` / `scaffold-adapter` / `scaffold-route` を直接回す。
- **既存スライスの変更** —— 編集する。どの子も既に在るパスを拒む。
- **レビュー** —— `impl-review` と `test-review` は `AGENTS.md` の Review Phase Protocol における peers
  である。このスキルは判断を user へ渡し、それらを呼ばない。

## 実行時に読むもの

| 出所 | そこが決めるもの |
| --- | --- |
| `docs/playbook.md` | このスキルが先回りしてはならない画面の順序と、ゲートの判定の持ち主 |
| `openapi/README.md` | 契約の取得と生成し直しの手順 |
| 子スキルの `SKILL.md` | 各段が入力に何を要し、何を返すか |
| `architecture.ts` の `KERNELS` | 出口の検査を絞るカーネル名 |

これらがこのファイルと食い違う場合は、**あちらが正である**。このファイルに従わず、食い違いを報告する。

## Step 0. スライスを決める

何かを書く前に `AskUserQuestion` を呼ぶ。

1. **feature 名**（kebab-case）と、スライスが持つ**画面**（kebab-case）。
2. スライスが呼ぶ **operation**（`operationId`）。
3. スライスが返す**表示用の型**と、そのうちどれを 2 つ以上の feature が使うか。
4. スライスに要る**入口**（あれば） —— ブラウザ側の呼び手のための Route Handler、主体を断言しなければ
   ならない変更のための `app` 側 Server Action。

既に在るもの —— feature、画面のディレクトリ、operation 用の adapter モジュール —— を検出し、子に失敗させる
のではなく計画からその段を落とす。できあがった連鎖を示して確認する。

## Step 1. 契約

各 operation が `openapi/*.gen.yaml` に在ること、`make ai-api-gen-check` が緑であることを確かめる。 <!-- skill-lint-ignore -->

- **operation が無い** → 契約はバックエンドのものである
  （[ADR 0072](../../../docs/adr/0072-api-type-generation.ja.md)）。バックエンドが公開していなければ、止まって
  引き渡す。公開しているなら、`openapi/sources.yaml` の `ref` をそれを含むコミットへ動かすことを提案し、
  編集の前に `AskUserQuestion` で確認する。
- **`ref` を動かしたら**、`make ai-api-fetch`、次に `make ai-api-gen` を回す。`openapi/*.gen.yaml` と <!-- skill-lint-ignore -->
  `src/adapters/gen/` を手で直さない —— どちらも生成物で、編集は `AGENTS.md` の trip wire である。 <!-- skill-lint-ignore -->
- **生成し直しが共有スキーマを変える。** `src/adapters/gen/` の下の差分を読み、変わったスキーマを import <!-- skill-lint-ignore -->
  している全モジュールを探して報告に並べる。このスライスのための変更が、この連鎖のどのテストも通らない
  隣を壊しうる。

## Step 2. 表示用の型 —— `scaffold-model`

Step 0 の表示用の型のうち共有されるものごとに、名前と形を渡して `scaffold-model` を連鎖させる。型は別の
場所に属すると言って止まることがある。その判断を、決めた節とともに、新しい住処を所有する段へ持ち越す ——
adapter のモジュールを名指したなら Step 3 へ、feature を名指したなら Step 4 のあとの feature の書き手へ。

adapter の前に来るのは、adapter がこれらの型を返し、import するからである。`model` は `adapters` から何も
import しないので、依存は一方向に流れる。

## Step 3. 取得の口 —— `scaffold-adapter`

名前と operation を渡して `scaffold-adapter` を連鎖させる。それは `pnpm gen adapter` で置き、分類・接続口・
寿命・taint を自分の README から導き、`scaffold-integration-test` を連鎖させる。**それが導出を引き渡したら、
連鎖はここで止まる**: 以降の段はすべて口の上に建つ。

## Step 4. スライスの住処 —— `pnpm gen feature`

```sh
pnpm gen feature <name> --screen=<screen>
```

Step 0 が画面のディレクトリを既に見つけていれば飛ばす。生成された view・story・画面の組み立てを埋めない ——
見た目はまだ確定しておらず、`docs/playbook.md` はテストと分離を見た目のレビューのあとに置いている。
スライスの README はテンプレートから英語の canonical だけが置かれ、それを埋めて `README.ja.md` ミラーを
`canonicalize-doc` で同期するのは `new-feature` である。

## Step 5. 入口 —— `scaffold-route`

Step 0 の入口ごとに、element・route のパス・adapter の関数を渡して `scaffold-route` を連鎖させる。element が
要らないと言って止まることがある —— たとえば主体の断言が要らない Server Action は feature に属する。それを
記録して続ける。

## Step 6. テスト —— `scaffold-test`

Step 2〜5 が置いた単位 —— model のモジュール、adapter の単位の側、`app` 側の action —— に対して
`scaffold-test` を 1 回連鎖させる。**画面の view と画面の組み立ては外す** —— それらのテストは見た目を待ち、
書くのは `new-feature` である。結合テストは Step 3 と Step 5 が既に連鎖させている。

## Step 7. コメントを決着させる

連鎖が触れたすべての宣言に対して `/settle-comments` を 1 回回す。実装の最後に無条件で走る段であり、書く前に
確認を取る。子はこの段に任せている。

## Step 8. 出口の検査 —— `arch-check`

`arch-check` を「変更ファイルのみ」の形で起動する: その形はマージベースから作業ツリーまでを未追跡も含めて
読むので、この連鎖がコミットせずに書いたものが見え、fan-out は連鎖が触れたカーネルに限られる。静的検査の問いは
`arch-check` 自身に訊かせる。結果は **report-only** —— ここでは何も止めず、何も直さない。報告は返って
きたとおりに、件数も含めて中継する。

## Step 9. 引き渡す

日本語で報告する。

- 各段とその結果 —— 走った / 飛ばした（理由） / 止まった（何で止まったか、引き渡しとともに）
- カーネルごとのファイル
- Step 1 の共有スキーマの利用者（あれば）
- `arch-check` の報告と、`type-design-reviewer` が Step 2 で model のモジュールを既に採点したこと
- **画面**: 置いたが確定していない —— `new-feature` で続ける。`new-feature` はそれを story から引き取る
- `AGENTS.md` の Review Phase Protocol が、`/impl-review` と `/test-review` を回すかをスキルごとに、それぞれが
  何を返しそうかの見積もりとともに user へ問うこと —— 伝えるだけで、回さない

**commit しない。push しない。** どちらも `/commit` と `/submit-pr` を通じて user のものである。

## AI Modification Scope

このスキルを起動することが、連鎖が `src/` の外で行う唯一の書き込みへの明示の指示になる: 確認のあとの
`openapi/sources.yaml` の `ref` と、それに続いて `openapi/` と `src/adapters/gen/` を書き直す生成器である。 <!-- skill-lint-ignore -->
それ以外はすべて子スキルが `src/` の下に、それぞれが宣言する範囲の内側で書く。

## 制約

- ✅ 依存の順に段を回す: 契約 → model → adapter → feature → 入口 → テスト → コメント → 監査
- ✅ 止まった最初の段で停止し、その引き渡しを出す。先行する書き込みを巻き戻さない
- ✅ 計画の確認は各子に取らせる
- ✅ `arch-check` を「変更ファイルのみ」の形で回し、報告をフィルタせずに中継する
- ✅ スキルの報告とコードコメントは日本語。文書は英語の canonical として書き、その `.ja.md` ミラーは `canonicalize-doc` で同期する
- ❌ ソースを直接書く —— ファイルはすべて子か生成器から来る
- ❌ 生成物を編集する、または確認なしに契約の `ref` を動かす
- ❌ 画面の見た目・story・仕様書・画面のテストを埋める —— `new-feature` が持つ
- ❌ `impl-review` / `test-review` を呼ぶ
- ❌ 依存を足す、見える要素を消す、あるいはどちらかを迂回する —— どちらも `AGENTS.md` の停止点であり、
  それに当たった子は連鎖を止める
- ❌ hook と CI を先回りして lint 全体 / テスト全体を回す

## チェックリスト

- [ ] スライスを決め、既に在る部分を検出した。連鎖を確認した（Step 0）
- [ ] operation が在り、生成物が揃っている。`ref` を動かしたなら確認を取った。共有スキーマの利用者を並べた（Step 1）
- [ ] `scaffold-model` → `scaffold-adapter` → `pnpm gen feature` → `scaffold-route` を順に回したか、引き渡しとともに止まった（Step 2〜5）
- [ ] 置いた単位に `scaffold-test` を 1 回回した。画面の単位は外した（Step 6）
- [ ] 連鎖の宣言に `/settle-comments` を 1 回回した（Step 7）
- [ ] `arch-check` を「変更ファイルのみ」の形で回した。報告は返ってきたとおりに中継した（Step 8）
- [ ] 画面を `new-feature` へ引き渡した。レビューの判断を user へ渡した。commit していない（Step 9）
