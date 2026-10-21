> **このファイルは `SKILL.md` の日本語訳です。**
> 直接編集しないでください。内容の変更が必要な場合は canonical な `SKILL.md`（英語版）を更新し、その後この日本語訳を同期してください。
> Claude Code のスキルとしては `SKILL.md` のみが読み込まれます。このファイルはスキル本体ではなく、レビューや学習用の翻訳ドキュメントです。

# 依存脆弱性の修正版への更新

このスキルはセキュリティ advisory の一覧を受け取り、**そこに名指しされた npm パッケージだけ**を
修正版へ動かす。対象を意図的に絞っている —— 無関係な更新まで連れ込んだ advisory パッチは、もう
セキュリティの変更としてレビューできない。たまたま古い隣の依存は、報告に 1 行書いて触らない。

変更はすべて、このリポジトリが既に宣言している方針を通る ——
[0004](../../../docs/adr/0004-library-management.ja.md) の exact pin、
[0110](../../../docs/adr/0110-security-operations.ja.md) の公開経過のウィンドウと抑止の様式、
`pnpm-workspace.yaml` の `overrides` ブロック冒頭に書かれた規約。**実行時にそれらを読むこと。
このファイルはその値をひとつも再掲しない。**

このファイルが同じディレクトリの `SKILL.md` の日本語参考訳である（スキルとしては読み込まれない。
人間の参照用）。

## When to Use

- 利用者が脆弱性の報告 —— `pnpm audit`、Trivy / OSV の所見、Dependabot alert、手書きの一覧 ——
  を貼り、指摘されたパッケージを塞ぎたいとき。
- `.github/workflows/dependency-scan.yaml` の `dependency-audit` job が修正版のある high / critical で
  落ちたとき、または PR 上の OSV / Trivy の報告が、この変更で塞ぐべきものを名指ししたとき。
- Dependabot のセキュリティ更新が単独では着地できないとき —— 修正が推移的依存で override が要る、
  または修正版がまだ公開経過のウィンドウの内側にある。

## Do NOT use this skill for

- **定期の更新。** 週次の更新は Dependabot が持つ（`.github/dependabot.yml`）。このスキルが動かすのは
  advisory が名指ししたものだけ。
- **`mise.toml` の pin** —— mise 経由で npm レジストリから引くツールを含む —— は `/tools-upgrade`。
  Node.js 本体は `/node-upgrade`。SHA で固定した Actions は `/actions-pin`。
- **依存の追加。** 脆弱なパッケージを別のものへ置き換えるのは新しい依存であり、`AGENTS.md` の
  停止点である。[0004](../../../docs/adr/0004-library-management.ja.md) の選定基準を通し、その
  テンプレを PR に貼る。このスキルは「修正版が無い」で終わり、そう報告する。
- **ウィンドウの内側の版が安全かの判定。** それは `/supply-chain-triage` が持つ。このスキルはそこへ連鎖し、
  返った帯を判断へ運ぶだけである。

## AI Modification Scope

このスキルの起動は、`AGENTS.md` がリポジトリ直下のファイルに掛けている保護を緩める明示の指示に
あたる —— 下のファイルに限り、この実行の間だけ。

許可:

- workspace が宣言する各 importer の `package.json` —— advisory が名指ししたパッケージの版だけを、
  exact pin のまま。
- `pnpm-lock.yaml` —— `pnpm install --lockfile-only` の出力としてだけ。手で編集しない。
- `pnpm-workspace.yaml` —— `overrides` ブロックだけ。`minimumReleaseAgeExclude` は
  **利用者がその項目そのものを承認した後に限る**（Step 5）。
- `osv-scanner.toml` / `.trivyignore.yaml` —— 利用者がその advisory 1 件について承認した項目だけ。
- 生成物 —— その `make` ターゲットの出力としてだけ（Step 7）。

このスキルの間でも触らないもの:

- `pnpm-workspace.yaml` のウィンドウと他の解決ポリシー —— `minimumReleaseAge`、
  `minimumReleaseAgeStrict`、`minimumReleaseAgeIgnoreMissingTime`、`trustPolicy*`、
  `blockExoticSubdeps`、`strictDepBuilds`、`allowBuilds`、`verifyDepsBeforeRun`、`engineStrict`、
  `nodeVersion`。**それは方針であってパッチではない。**そのどれかを 1 回の実行だけ上書きする CLI
  フラグも同じく使わない。
- `AGENTS.md`、Accepted ADR の本文、`permissions.deny` に載るもの。
- advisory が名指ししていないパッケージ。

## Step 0. advisory を読み解き、方針を読む

1. 引数か直近の利用者メッセージから、**パッケージ・導入済みの版（あれば）・修正版の候補・
   GHSA / CVE の ID・深刻度**の組を取り出す。よくある形（`pnpm audit` の塊、Trivy / OSV の行、
   1 行 1 パッケージ）を受け付ける。同じパッケージを名指しする項目はまとめる —— 1 回の移動で
   その advisory 全部が塞がり、報告はすべての ID を挙げる。
2. **本当の修正下限は、貼られた文ではなく advisory データベースから取る。** パッケージは、引用された
   版より初回修正版が高い 2 件目の advisory を抱えていることがある:

   ```sh
   gh api /advisories/<GHSA-id>
   gh api "/advisories?ecosystem=npm&affects=<pkg>"
   ```

   データベースと一覧が食い違えばデータベースを採り、要約でその旨を言う。
3. `pnpm-workspace.yaml` を通読する: `packages:`（importer）、`minimumReleaseAge`（**分単位** ——
   1440 で割ると日数）、`minimumReleaseAgeStrict`、現在の `minimumReleaseAgeExclude`、`overrides:` の
   上のコメントと既存の override の全項目。候補を既に名指しする除外があれば、その版のためにウィンドウが
   意図して開けられている。
4. [0110](../../../docs/adr/0110-security-operations.ja.md) のツールの cooldown、直接証拠で解除できる代理としてのウィンドウ、抑止のポリシーを読む。**workspace が
   公開経過のウィンドウを宣言していない、または ADR が定める npm のウィンドウと食い違うなら、止まって 2 つの出典を
   報告する** —— 権威を主張する 2 つの出典の食い違いは `AGENTS.md` の trip wire であって、どちらかを
   選ぶ値ではない。

読んだウィンドウとその出所を述べる。この手順が終わるまで、どのファイルにも触らない。

## Step 1. 各パッケージの所在を突き止める

パッケージがどこに居るかを決めるのは lockfile であって、名前ではない。

```sh
pnpm why <pkg> -r        # which importers pull it, through which path, at which versions
```

項目ごとに記録する:

| 項目 | 取り方 |
| --- | --- |
| importer | そのパッケージを木に含む workspace のメンバー |
| 解決済みの版 | `pnpm why` から —— 1 つのパッケージが同時に複数の major で解決されうる |
| 直接 / 推移的 | その importer の `package.json` に名前がある → 直接。無ければ推移的で、引いている親を添える |
| 暴露面 | 配信される importer（ブラウザかサーバへ）の実行時依存か、開発時だけか —— `pnpm why` の経路から読む |

木に居ないパッケージは **not-present** として報告し、飛ばす。`mise.toml` のツール・Node.js・Action と
判明したものは *Do NOT use* に挙げたスキルへ回す。

## Step 2. 動かし方を決める

木に居る項目ごとに:

- **デフォルト: 導入済みの major 系列で最も低い修正版。** 候補が複数ある advisory からは、導入済みの
  major に合うものを採る。
- **major 越え**（導入済みの系列に修正が無い）: 破壊的変更の可能性として印を付ける。1 件ずつ問い
  （Step 5）、[0004](../../../docs/adr/0004-library-management.ja.md) により単独の PR にして CHANGELOG
  の破壊的変更を引用する。
- **ダウングレード防止:** 導入済みより低い版は選ばない。そうなる項目は `needs-manual` とする。
- **修正版が存在しない:** 動かすものが無い。`no-fix` として Step 5 へ運ぶ。

次に手段を決める:

- **直接依存** → その importer の `package.json` の exact な版。
- **推移的依存** → まず、**親**の新しいリリースが既に修正版を引いているかを見る。引いていて、その
  親自身が直接依存なら、親を動かすほうが綺麗で override が要らない。そうでなければ `overrides` の
  項目で、`pnpm-workspace.yaml` の規約により**親が宣言した範囲の内側に留める**。その範囲を読む:

  ```sh
  pnpm view <parent>@<parent-version> dependencies.<pkg>
  ```

  修正版が親の宣言範囲の**外**にあるなら、override は上流が検証していない組み合わせを作る。それは
  `out-of-range` —— 1 件ずつ問い（Step 5）、自分の判断では当てない。

## Step 3. 公開経過のゲートを当てる

移動先になる版の公開時刻を取る:

```sh
pnpm view <pkg> time --json
```

ここで `npm` そのものは使わない（[0001](../../../docs/adr/0001-package-manager.ja.md)）。

| 区分 | 条件 | 効果 |
| --- | --- | --- |
| **clear** | ウィンドウより古い、または既に `minimumReleaseAgeExclude` に名指しされている | 適用対象 |
| **blocked** | ウィンドウより新しい | resolver が拒む —— `minimumReleaseAgeStrict` の下ではウィンドウを過ぎた一致が無ければ解決が失敗し、検査は frozen-lockfile の再生にも及ぶので CI も拒む。解除される時刻（公開時刻 + ウィンドウ）を報告する |

範囲指定は**ウィンドウを過ぎた**一致の中で最新の版へしか動かないので、override は失敗せずに advisory の
下限より下へ着地しうる。実際に何へ解決されたかは Step 7 で読み直す。

**ウィンドウを下げる・strict を切る・フラグを渡す、のいずれでも blocked の版を入れられる状態にしない。**
版単位の除外が唯一の扉で、それを開けるのは利用者である（Step 5）。

## Step 4. ゲートが捕まえたものをトリアージする

`blocked` の項目ごとに、Step 5 の前に **`/supply-chain-triage`** を 1 件 1 回ずつ連鎖する。
エコシステム `npm`、パッケージ、候補の版、**lockfile が現に持っている基準の版**、ウィンドウ、区分、
移動を強いている advisory を渡す。

トリアージは報告のみで、帯（`LOW` / `MEDIUM` / `HIGH` / `CRITICAL` /
`INSUFFICIENT-EVIDENCE`）を返す。ウィンドウか証拠かの判断はすべてあちらのもので
（[0110](../../../docs/adr/0110-security-operations.ja.md)：ウィンドウは直接証拠で解除できる代理である）、このスキルは帯を問いへ運ぶだけで、
そこから何も決めない。**LOW の帯は利用者への証拠であって、除外してよいという許可ではない。**

blocked が無ければこの手順は飛ばす。

## Step 5. 要約し、clear は当て、残りは 1 件ずつ問う

要約を日本語で、区分ごとにまとめて出す:

```text
依存脆弱性パッチ（窓 <N> 日 / pnpm-workspace.yaml の minimumReleaseAge 由来）

適用（同じ major の最小修正版・窓を通過・確認なし）:
  - <pkg> <installed> → <fixed>  [<importer>, 直接|推移的 (<parent> 経由)]  (<GHSA> / <severity>)

要確認:
  - major 越え     : <pkg> <installed> → <fixed>  [...]  (<GHSA>)
  - 上流範囲の外   : <pkg> <fixed> は <parent> の宣言 <range> の外  (<GHSA>)
  - 窓の内側       : <pkg> <fixed>  (公開 <date> / <clear-date> に解除)  トリアージ: <band>
  - 修正版なし     : <pkg>  (<GHSA> / <severity>)

未検出 / 要手動:
  - ...
```

非対称は意図したものである —— 塞ぐことこそ、利用者がこのスキルを起動した目的である:

- **clear・同じ major・親の範囲の内側 → 問わずに当てる。**
- 以下はすべて **`AskUserQuestion` で 1 項目 1 判断として問い**、選択肢はデフォルトで未選択にする。
  ファイルに既にある前例は、次の項目の承認にならない。
  - **major 越え** —— 当てるか、現在の系列に留めて advisory を開いたままにするか。
  - **範囲外の override** —— 項目に添える正当化を示して当てるか、親が範囲を広げるのを待つか。
  - **blocked** —— 解除日まで待つか、その版そのものの `minimumReleaseAgeExclude` 項目を足すか。
    選択肢の説明にトリアージの帯を入れ、項目の費用を述べる: 誰かがその行を消すまで、すべての
    checkout が方針の免除を抱える。
  - **修正版なし** —— 理由を添えて `osv-scanner.toml` / `.trivyignore.yaml` に抑止を記すか、開いた
    ままにするか。[0004](../../../docs/adr/0004-library-management.ja.md) は、すぐ直せない high に
    ついて、暴露と緩和策を記した issue を求める。`/new-issue` を通した下書きを申し出る（起票は
    あちら自身の確認の後に限る）。

適用対象が無く、承認されたものも無ければ、書き込みなしで Step 8 へ飛ぶ。

## Step 6. 当てる

`pnpm-lock.yaml` は手で編集しない。作り直す。

**直接依存。** その importer の `package.json` に exact な版を書き、次を回す:

```sh
pnpm install --lockfile-only
```

**推移的依存。** `pnpm-workspace.yaml` の `overrides` に、既存の項目と同じ形で項目を足す ——
セレクタは**脆弱な範囲**を、値は**次の major までの修正済みの範囲**を名指しする:

```yaml
  # <parent> (<who pulls it>) の推移的依存。<where it runs, when that matters>
  # <GHSA-id> (<severity>): <what the vulnerability does, one line>
  # <parent> の宣言は <declared range> で <fixed> はその内側。<parent> が <fixed> 以上を要求したら撤去する。
  "<pkg>@<vulnerable range>": ">=<fixed> <<next-major>"
```

- 項目を自然に失効させるのはセレクタの範囲である: 上流がそこを越えれば項目は何にも一致しなくなり、
  パッケージを古い版に留め続けられない。
- **major 系列ごとに 1 項目。** 複数の major で解決されるパッケージは、各セレクタをその major に
  閉じる。
- **同じパッケージ・同じ major の既存項目は、重ねずに引き上げる** —— セレクタを広げ、下限を上げ、
  新しい advisory をそのコメントへ足す。
- 承認された範囲外の override は、コメントにその旨を明記し、検証されていない組み合わせを代わりに
  実際に動かす検査を名指しする。

その後 `pnpm install --lockfile-only`。

`pnpm update <pkg>` は直接依存にしか届かず、`pnpm audit --fix` は修正版のある advisory すべてへ
一度に override を書き、このファイルが求めるコメントを持たない —— **どちらも使わない**。

**承認された除外。** `minimumReleaseAgeExclude` に、そのキーの上のコメントが求める形で項目を足す。
それは `make suppression-expiry` が読む形でもある:

```yaml
minimumReleaseAgeExclude:
  # <GHSA-id> の修正版。<where it runs>。
  # 窓が明ける <YYYY-MM-DD> に外す。
  - <pkg>@<version>
```

- **`<pkg>@<version>` で書き、名前だけにしない** —— 名前だけの免除は以後のすべての公開を素通しにする。
- **block 形式で 1 行 1 項目。** flow 形式の項目（`[...]`）は自分の行を持たないので、上のコメントを
  結び付けられず、検査がその項目を落とす。
- **日付は日本時間の暦日**で、ウィンドウが明けた（公開時刻 + ウィンドウ）後の最初の丸 1 日にする: 週次の検査は暦日で
  比べ、ウィンドウが明ける前に行を消すとすべての install が壊れる。

**承認された抑止。** `osv-scanner.toml` / `.trivyignore.yaml` の冒頭と
[0110](../../../docs/adr/0110-security-operations.ja.md) の抑止のポリシーが述べる形で書く —— 脆弱性 ID 1 件、
ここでなぜ許容できるかの理由、それを退役させる条件。

## Step 7. 検証する

判定は CI のものである。ここでゲートを回し直さない
（[`docs/playbook.md`](../../../docs/playbook.ja.md) の *Do not pre-run the gates*）。手元でやるのは、
push の前に CI が教えてくれないことだけ:

```sh
pnpm install --frozen-lockfile --ignore-scripts   # the install CI runs; proves the lockfile replays under the policy
pnpm why <pkg> -r                                 # every resolution now at or above the fix floor
```

- frozen install が公開経過の違反で落ちるなら、ウィンドウの内側の版が覆われていない —— 除外が欠けているの
  であって、ウィンドウが長すぎるのではない。
- 解決がまだ下限より下なら、範囲がウィンドウを過ぎた古い版へ着地している。範囲を締めて押し込まず、報告する。
- **除外か抑止を書いた後は**、`make suppression-expiry` を 1 度回す（`AGENTS.md` に従い静音の
  `ai-` 形で）。それらの項目の様式を見る唯一の検査で、PR ではなく週次で走る。
- **動かしたパッケージが `make api-gen` の経路に居るなら**、それを回して書き出したものを残す。
  `gen-drift` workflow は、生成物がそのターゲットの出力と違う PR を落とす。

その後 CI が、このスキルが触ったパスから PR 上で判定する: `dependency-scan.yaml`（Trivy fs の報告と、
修正版のある high / critical で落ちる `make audit`）、`osv-scan.yaml`、`dependency-review.yaml`
（PR が足した high / critical で落ちる）。それぞれ CI が報告したとおりに報告する。major 越えの
typecheck とテストも同じく CI のものである。

失敗しても巻き戻さない。報告して、利用者に決めさせる。

## Step 8. 報告する

日本語で:

- 動かしたパッケージを importer ごとに、版の差分・手段（exact pin / 親の更新 / override）・塞いだ
  advisory の ID すべてと共に。
- 足した / 引き上げた override と、その撤去条件 —— **override は暫定である**。親が修正版を要求したら
  消す。
- 足した除外と、**それを消すべき日付**。利用者が持つ後続作業として述べる。
- 足した抑止と、それを退役させる条件。
- blocked の各項目のトリアージの帯と、答えられなかった軸。
- 断られた・先送りされた・`no-fix`・`not-present`・`needs-manual` の項目と、開いたまま残る advisory。
- Step 7 の手元の結果と、どの CI job がこの変更を判定するか。

stage・commit・push はしない。利用者がツリーを確認し、`/commit` を回す。

## Notes

- **狙い撃ちであって一括ではない。** 無関係に古いパッケージは報告の 1 行であり、更新はしない。
- **除外はウィンドウの引き下げではない。** 除外が免除するのは `pkg@version` 1 つで、`minimumReleaseAge` を
  下げればすべての依存が一度に、黙って免除される。前者の手段として後者を示さない。
- **workspace 1 つ、lockfile 1 つ。** `pnpm-workspace.yaml` の除外と override は workspace が宣言する
  すべての importer に効くので、1 項目でそのすべてを覆う。
- **冪等。** 当て終えた後にもう一度回すと、名指しされたパッケージはすべて下限以上にあり、何も
  書かない。

## Checklist

- [ ] advisory を読み解きパッケージ単位にまとめた。修正下限は advisory データベースから読んだ
- [ ] ウィンドウ・strict・除外・override を `pnpm-workspace.yaml` から読み、ADR 0110 と突き合わせた
- [ ] 各パッケージを `pnpm why -r` で突き止め、直接 / 推移的・親・暴露面を記録した
- [ ] 同じ major の最小修正版を選び、major 越え / 範囲外 / 修正版なし / ダウングレードに印を付けた
- [ ] 公開時刻を読み、blocked の項目はすべて `/supply-chain-triage` を通した
- [ ] clear で同じ major の項目は問わずに当て、それ以外の判断は 1 項目ずつ問うた
- [ ] 直接は exact pin、推移的はコメント付きの範囲セレクタの override で当てた。lockfile は作り直し、編集していない
- [ ] 除外は advisory・暴露面・日本時間の日付を持つ `pkg@version` で、ウィンドウの設定には触れていない
- [ ] frozen install と `pnpm why` を確かめた。除外か抑止の後は `make suppression-expiry`、経路に居るなら `make api-gen`
- [ ] 後続作業を含む日本語の報告を出した。stage・commit・push はしていない
