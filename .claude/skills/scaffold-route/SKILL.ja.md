> **このファイルは `SKILL.md` の日本語訳です。**
> 直接編集しないでください。内容の変更が必要な場合は canonical な `SKILL.md`（英語版）を更新し、その後この日本語訳を同期してください。
> Claude Code のスキルとしては `SKILL.md` のみが読み込まれます。このファイルはスキル本体ではなく、レビューや学習用の翻訳ドキュメントです。

# Scaffold Route

画面ではなく入口である `app` の element を 1 つ置き、`app` の監査が何も挙げない形にする。

`app` は権限の違う element をいくつも持ち、element はパスとファイル名の組で決まる
（[ADR 0025](../../../docs/adr/0025-app-layer-elements.ja.md)）。このスキルが扱うのは、要求を木の残りへ運ぶ 2 つ
—— **Route Handler** と **`app` 側の Server Action** —— である。`pnpm gen` はどちらの kind も持たないので、
置き場はここで README から導く —— そして最初に導くのは、その element がそもそも要るかどうかである。

## 使うとき

- ブラウザが同一オリジンを通して何かへ届く必要がある —— 続きの取得、直接は呼べない相手 —— のに、それを
  受ける Route Handler がまだ無い。
- 変更が action の内側で主体を断言しなければならず、それができるのは `app` だけで、その route の `app` 側
  `actions.ts` がまだ無い。
- `scaffold-slice` が route の段に来て、element と adapter の関数を文脈で渡してきた。

## このスキルを使わないとき

- **route segment**（`page.tsx` / `layout.tsx` / `loading.tsx` / `error.tsx`） —— 画面は見た目を確定させ、仕様書を
  伴う（[ADR 0143](../../../docs/adr/0143-spec-driven-development.ja.md)）。その順序は `new-feature` が持つ。
- **主体の断言が要らない Server Action** —— feature に留まり
  （`src/features/<name>/<screen>/actions.ts`）、feature の書き手が書く。どちらかは Step 1 が決める。
- **metadata ファイル**（`sitemap.ts` / `robots.ts` / 画像） —— 権限の違う別の element である。
- **既存の handler や action の変更** —— 直接編集する。
- **テストを手で書くこと** —— Step 6 が、それぞれを所有するスキルを連鎖させる。

## このスキルが読むものと書くもの

**実行時に**読む。これらとこのファイルが食い違うときは出所が正であり、食い違いを報告する。

| 出所 | そこが決めるもの |
| --- | --- |
| [ADR 0025](../../../docs/adr/0025-app-layer-elements.ja.md) | element の表 —— どのファイルがどの element か、それぞれが何を import してよいか、どの行を機械が強制するか |
| `src/app/README.md` の frontmatter / `## Operations` / `## Audit Criteria` | `forbidden` タグ、各 element がどの `test-requirement` で検証されるか、element が満たすべき行 |
| `src/app/api/README.md` | Route Handler が受け入れるものと断るもの、失敗の応答をどこで組むか |
| `architecture.ts` の `APP_ELEMENTS` | 境界検査が element ごとに掛ける import の制限 |
| `src/adapters/server/http/` | handler が入力を検証し、失敗を組むのに使う要求側の口 |
| `docs/playbook.md` の逆引き | Server Action がまずどこへ行き、いつ `app` へ移るか |
| 同じ種類の隣の element | 具体の形。食い違えば README が勝つ |

書くのは `src/app/` の下の `route.ts` 1 つか `actions.ts` 1 つ。それ以外は書かない。

## Step 0. 対象を決める

引数から、`scaffold-slice` の文脈から、あるいは `AskUserQuestion` で決める。

1. **element** —— Route Handler か Server Action か。
2. **route のパス** —— `src/app/` の木のどこで応えるか。
3. **何を呼ぶか** —— adapter の関数（在ること。無ければ先に `scaffold-adapter`）。
4. **誰が呼ぶか** —— Route Handler ならどの client か、Server Action ならどのフォームか。

## Step 1. element が要るか、どれかを決める

ADR 0025、`src/app/README.md`、`src/app/api/README.md` を通読し、Server Action について `docs/playbook.md`
の逆引きの行を読む。

- **Route Handler**: `src/app/api/README.md` が handler の受け入れるものを挙げている。データが要るだけの
  server レンダリングの画面は feature から adapter を呼び、handler を要さない。受け入れる場合のどれにも当たらない
  なら、そう言って止まる。
- **Server Action**: ADR 0025 は、主体の断言が要るかで住処を決める。要らないなら feature に属する ——
  そう言って止まる。`scaffold-slice` はそれを feature の段へ渡す。
- **このスキル経由で route segment を求められた**: 止まって `new-feature` を指す。

ここで止まるのは結果であって失敗ではない。どのセクションが決めたかを報告する。

## Step 2. 監査の行に対して計画する

`src/app/README.md` の frontmatter と `## Audit Criteria` の表を読む。主題がこの element である行だけを残し
—— route segment についての行は handler を縛らない —— どの行を外したか、なぜかを書く。計画は**残した
行 1 つにつき 1 行**の表として組む。

| 行（観点） | element がどうその内側に留まるか |
| --- | --- |

- 根拠が `機械:` で始まる行はゲートが強制している。踏まないように計画し、判定し直さない。
- それ以外の行には具体の答えを書く —— handler なら何を検証し、失敗をどの口で組むか。action なら
  **export する各 action の内側のどこで主体の断言を呼ぶか**と、何を確かめるか。
- 行を持たない `forbidden` タグは README の欠けである。タグに対して計画し、欠けを報告する。

ファイルパス、export するシンボル、呼ぶ adapter の関数、Step 6 が作るテストを添える。
`AskUserQuestion` で確認する: 「この計画で置きますか？」 / 「修正したい」 / 「キャンセル」。

## Step 3. element を書く

- **Route Handler**: 入力を検証し、adapter を呼び、それが返したものを返す。失敗は `src/app/api/README.md`
  が名指す口で組み、handler の中で組まない。runtime を変えない。生の `fetch`・業務の判断・集約を持たない。
- **Server Action**: `"use server"`。export する各 action は、何よりも先に主体の断言を呼び、フォームを
  描いた画面が保護されていることに依拠しない。server config を読まない。feature のフォームが期待する
  結果の形を返す。
- **コメントを書かない。** element がどれを得たかは Step 7 が決める。
- **依存を足さない。** 依存なしに element が書けないなら止まる。依存の追加は
  [ADR 0004](../../../docs/adr/0004-library-management.ja.md) が持つ停止点である。
- **利用者に見えるものを消さない。** 既存の見える流れを置き換える・組み替える入口は停止点である
  （`docs/rules.md` の *作業とエージェント*）。止まって訊く。

## Step 4. 書いた element を計画と突き合わせる

書いたファイルを Step 2 の表に対して 1 行ずつ読み返し、答えからずれた行はテストを書く前に直す。これは
書き手の確認であって監査ではない —— 監査は `arch-check` であり、`scaffold-slice` が最後に回す。

## Step 5. 境界で変わったものを名乗る

新しい Route Handler は、木が外と接する新しい辺であり、`docs/design/context-map.md` がその辺を記録している。
報告で新しい辺を名指し、`context-map` が足せるようにする。このスキルは地図を書かない。

## Step 6. テスト

各 element がどの宣言で検証されるかは `src/app/README.md` が述べている。決めつけずに読む。

- **Route Handler**: 新しい `route.ts` に `scaffold-integration-test` を連鎖させる。
- **Server Action**: 単独のときは、新しい `actions.ts` に `scaffold-test` を連鎖させる。`scaffold-slice` から
  のときは触らない —— オーケストレーターがスライス全体に `scaffold-test` を 1 回回す。

## Step 7. コメントを決着させて引き渡す

単独のときは、ここで書いた宣言に対して `/settle-comments` を回す。実装の最後に無条件で走る段であり、書く前に
確認を取る。`scaffold-slice` からのときは、オーケストレーターが 1 回回す。

日本語で報告する: element とそのパス、Step 1 の判断とその出所、外した行を含む監査行の表、作ったテスト、
README の欠け。commit しない。

## 制約

- ✅ element が要るかを ADR 0025 と README から決め、要らなければ止まる
- ✅ 計画で当てはまる `## Audit Criteria` の全行に答え、書く前に計画を確認する
- ✅ export する `app` 側の各 action の内側で主体を断言する
- ✅ Route Handler には `scaffold-integration-test` を連鎖させる
- ❌ route segment・metadata ファイル・feature 側の action を書く
- ❌ handler の中に生の `fetch`・業務の判断・応答の組み立てを置く
- ❌ コードを書きながらコメントを書く
- ❌ 依存を足す、見える要素を消す、あるいはどちらかを迂回する
- ❌ README の行や ADR の規則をこのファイルへ書き写す

## チェックリスト

- [ ] element・route のパス・adapter の関数・呼び手を決めた
- [ ] 要否と住処を ADR 0025 / README から決めた。要らなければ止まった
- [ ] 計画が当てはまる監査の全行に答えている。外した行を名指した。README の欠けを報告した。計画を確認した
- [ ] コメント無しで element を書いた。export する各 action で主体を断言した
- [ ] 境界の変化を報告で名指した
- [ ] element ごとのテストスキルを連鎖させた（action は `scaffold-slice` に任せた場合がある）
- [ ] `/settle-comments` を回した（単独）か、`scaffold-slice` に任せた。commit していない
