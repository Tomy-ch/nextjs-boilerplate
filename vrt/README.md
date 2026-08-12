# vrt

Storybook の全 story を基準画像と比べ、**意図しない見た目の変化**を検知する
（[0091](../docs/adr/0091-test-verification-methods.md) §3）。

DOM のアサートでは「class 名が変わっていない」ことしか言えず、見た目が変わっていない保証には
ならない。退行の主因は画面ごとの個別変更ではなく、design token や layout shell を触って全画面が
同時に動くことなので、部品の側で捕まえる。

## 使い方

```bash
make vrt          # Storybook を build して全 story を比較する
make vrt-update   # 基準画像を撮り直す（差分を意図した変更として受け入れる）
make vrt-push     # 撮り直した一式を置き場へ送り、サブモジュールのポインタを進める
make vrt-report   # 直前の実行の HTML レポートを開く
```

**置き場へ送るのは `make vrt-push` だけ**である。サブモジュールの中で直接コミットすると撮り直し
どうしが繋がり、掃除でどれも落とせなくなる（後述）。

`VRT_ARGS` で Playwright へそのまま引数を渡せる。

```bash
make vrt VRT_ARGS='--project=light --grep "Action/Button"'
```

## コンテナの中でしか撮らない

フォントのラスタライズは OS でも CPU アーキテクチャでも変わる。基準画像が一意なのは
**どのイメージで撮ったか**によってであり、撮った人の環境によってではない。そこで実行は
[`docker-compose.dev-tools.yml`](../docker-compose.dev-tools.yml) の `vrt_runner`
（digest と `platform` まで固定した Playwright 公式イメージ）に閉じてある。ホストで直接
`playwright test` を起動した場合は、比較する前に落ちる。

CI も同じ `make vrt` を回す。手元と CI で判定が割れないのは、両方が同じイメージを引くため。

## 正当な変更も、まず赤くなる

VRT が言えるのは「変わった」までで、「変わってよいか」は人が決める。だから**意図した変更も
いったん差分として上がる**。これは仕組みの欠陥ではなく、判定を人へ渡す形そのものである。

差分が出た PR には、**どの story がどれだけずれたかの一覧表**がコメントで付く。加えて
`vrt-diff` artifact に期待 / 実際 / 差分の 3 枚と HTML レポートが入る。ここまで見て、

- **退行なら実装を直す**
- **意図した変更なら承認する**

### 撮り直しと承認は別の操作

**撮り直す**手段は 2 つある。

| | 操作 | 向き先 |
| --- | --- | --- |
| `vrt-retake` ラベル | PR にラベルを付ける | 表に出ていた story だけを CI が撮り直し、置き場へ push してポインタを進める |
| 手元 | `make vrt-update VRT_ONLY=<id>,<id>` → `make vrt-push` | Docker がある環境で撮り直す。fork からの PR はこちらだけ |

**どちらも承認ではない。**撮り直しは「画素を見られる形にする」操作でしかない。撮り直した一式は
置き場へ push され、PR コメントに**置き場の compare ビューへのリンク**が付く。そこに GitHub 標準の
画像差分（2-up / swipe / onion-skin）が出る。**見た目を判断するのはそこ**であり、ruleset の
`require_last_push_approval` が「bot の push のあとに人が承認する」ことを強制する。

compare のリンクを置くのは、画像そのものをコメントへ貼らないため。長すぎて読めないうえ、置き場が
非公開だと **GitHub の画像プロキシが匿名でアクセスするので 404 になる**（見る人の権限は関係ない）。
リンクなら GitHub の UI の中なので、見る人の認証がそのまま効く。

撮り直しに掛かる制約は 2 つ。

- **直前の実行が報告した story に限る**。範囲は報告の JSON から読むので、表に出ていない差分が
  基準画像へ黙って入ることはない
- **base より遅れているブランチでは撮り直せない**。判定されるのは base へマージした結果の木
  (`refs/pull/N/merge`)なので、遅れた head で撮った画像は判定される木と食い違う

ラベルは処理後に外れるので、次の変更ではまた付け直すことになる。

**ラベルは VRT の実行が完了してから付ける。**撮り直す範囲はその実行が残した報告から読むので、
走行中に付けても「まだ完了していません」で止まる（何を撮るべきか分からないまま撮らない）。

> 大量の差分（design token を触ったときなど）は、人が 1 枚ずつ見ることを期待できない。これは
> 仕組みで塞げない限界として置いてある。件数を表の先頭に出しているのは、せめて「何枚動いたか」
> が判断の入口に来るようにするため。

## 何を撮るか

- 対象は **story の全数**。`storybook-static/index.json` から列挙するので、story を足せば
  黙って対象に入る。撮影対象を story 側の申告制にすると、新しく足した story が対象外のまま
  残る
- 外すときは [`lib/excluded-stories.ts`](lib/excluded-stories.ts) へ**理由と撤去条件を添えて**
  宣言する。story 側にタグを 1 行足すだけで黙らせられる状態は作らない。実体を失った宣言
  （消した / 改名した story を指すもの）は落ちる
- 配色テーマは `light` / `dark` の 2 つを撮る。dark は token の切り替えでしか出ない見た目で、
  他にこれを機械検証している層が無い
- viewport は 1 帯（1280×720）だけ。帯を増やす Responsive VRT と、ブラウザを増やす
  Cross Browser は別途扱う

## 揺らぎを止めてある

同じ story が撮るたび違う画像になると、gate は「毎回赤い」か「差分を無視する」のどちらかへ
倒れる。次を固定してある。

| 揺らぎの元 | 止め方 |
| --- | --- |
| CSS の animation / transition | 撮影時に停止（`animations: "disabled"`） |
| Framer Motion（CSS animation ではない） | `reducedMotion: "reduce"` で初期状態のまま撮る |
| フォントの遅延読み込み | `document.fonts.ready` を待ってから撮る |
| テキストカーソル | 非表示（`caret: "hide"`） |
| 日付・時刻の表示 | `timezoneId` と `locale` を固定 |

許容する差分は置いていない（`maxDiffPixels: 0`）。同じイメージで撮る前提が成り立っている以上、
閾値を持たせるとその幅に収まる退行が黙って通る。

## 基準画像は別のリポジトリに置く

`__screenshots__` は**サブモジュール**で、実体は基準画像だけを持つ別リポジトリ（以下「置き場」）に
ある。中身は `<系統>/<テーマ>/<story id>.png` で、系統は story の見出しの先頭区画
（`Action` / `Features` / `Page` …）。

分けてあるのは PNG のためである。すでに圧縮済みなので git の delta も zlib も効かず、更新 1 回が
ほぼ丸ごと 1 枚ぶんずつ**永久に**積まれる。design token を触れば全数が動くので、同じリポジトリに
置くと本体の clone が数か月で使い物にならなくなる。

置き場は**ただの置き場**で、workflow もルールセットもラベルも持たない。更新も掃除もすべて本体の
make と workflow から流し込む。

### 撮り直しは「一式まるごと 1 コミット」

撮り直すたびに、置き場には**全数ぶんの木を持つコミットが 1 つ**増える。親は常に置き場の根
（README だけのコミット）で、撮り直しどうしを繋げない。

- 繋げると古い一式が新しい一式の祖先になり、掃除でどれも落とせなくなる
- 根を共有させるのは、GitHub の compare が無関係な履歴どうしを比較できないため

同じ内容の PNG は git が blob として共有するので、一式ぶんの実体が毎回増えるわけではない。

### 掃除

生きた ref（`production` / `staging` / `develop` / `release/*` / `hotfix/*` の先端、直近のタグ、
開いている PR の head）が指す一式だけを残し、他は消す。**過去のコミットへ遡ると基準画像は揃わない**
のが前提である。

| | |
| --- | --- |
| 報告 | [`vrt-images-prune.yaml`](../.github/workflows/vrt-images-prune.yaml) が月次で測り、閾値を超えたときだけ issue を立てる |
| 実行 | `make vrt-images-prune`（`DRY_RUN=1` で一覧だけ） |

実行を人に残すのは、消したものを戻せないためである。保持の条件は
[`scripts/vrt-images/retention.ts`](../scripts/vrt-images/retention.ts) に理由と撤去条件つきで置いてある。

revert したときは、戻り先の一式が掃除で消えていることがある。そのため
`revert-` で始まるブランチではラベル無しで撮り直しが走る。revert は定義上「以前に承認された状態へ
戻す」操作なので、自動化しても承認の意味は壊れない。

### 置き場を用意する

fork 先は**自分の置き場を持つ**。上流の置き場には push できない。

```bash
make setup-vrt-images   # 置き場を作る / 既存を指定する → サブモジュールを張り直す
make setup-vrt-app      # 撮り直しに使う GitHub App を secret へ登録する
```

GitHub App の作成と鍵の生成だけは自動化できない（REST に作成の口が無く、鍵は生成時に一度しか
表示されない）。App は**本体と置き場の 2 つだけ**に installation を絞り、権限は
**Contents: Read and write** のみにする。置き場にルールセットを掛けてはいけない — 撮り直しの
push を自分で塞ぐことになる。

> **`make setup-remove-sample` より先に実行すること。** サンプル破棄はサブモジュールの中へ届かず、
> 題材の基準画像は上流の置き場に残っているだけである。自分の置き場へ張り替えた時点で参照が切れる。

## 構成

| パス | 役割 |
| --- | --- |
| [`stories.spec.ts`](stories.spec.ts) | story を列挙して 1 件ずつ撮る本体 |
| [`lib/story-index.ts`](lib/story-index.ts) | 目録から撮影対象を取り出す・story の URL を組み立てる |
| [`lib/excluded-stories.ts`](lib/excluded-stories.ts) | 比較の対象から外す story の宣言（理由と撤去条件付き） |
| [`lib/static-server.ts`](lib/static-server.ts) | build 済み Storybook を配る依存なしの静的サーバ |
| `__screenshots__/` | 基準画像の置き場（サブモジュール） |
| `../playwright.config.ts` | 実行環境と比較条件 |
| `../scripts/vrt/` | 実行結果から一覧表と撮り直しの範囲を取り出す |
| [`../scripts/vrt-images/`](../scripts/vrt-images/) | 置き場の ref 名と、掃除で消す対象の算出 |
| [`../.github/actions/setup-vrt-baselines`](../.github/actions/setup-vrt-baselines/action.yaml) | CI が記録されたコミットだけを取ってくる |

`tmp/vrt/` に出る実行結果（actual / diff / HTML レポート）は追跡しない。
