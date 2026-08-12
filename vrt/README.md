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
make vrt-report   # 直前の実行の HTML レポートを開く
```

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

### 承認の 2 経路

| | 操作 | 向き先 |
| --- | --- | --- |
| `approve-vrt` ラベル | PR にラベルを付ける | 表に出ていた story だけを CI が撮り直し、PR ブランチへ push する。push で VRT が再実行されて緑になる |
| 手元 | `make vrt-update VRT_ONLY=<id>,<id>` | Docker がある環境で撮り直してコミットする。fork からの PR はこちらだけ |

**承認できるのは、直前の実行が報告した story に限る。**撮り直す範囲は報告の JSON から読むので、
表に出ていない差分が基準画像へ黙って入ることはない。ラベルは処理後に外れるので、次の変更で
また付け直すことになる。

CI が無条件に基準画像を書くことはしない。人がラベルを付ける行為そのものが承認であり、
自動で書き換われば承認の実体が「CI が直した」に変わる。

更新後の画像は追跡対象なので、**PR の Files changed に GitHub 標準の画像差分**(2-up / swipe /
onion-skin)として出る。見た目の実質的なレビューはそこで行う。push で既存の approval は
自動的に外れるため、画像の更新が黙ってマージまで通ることはない。

## 何を撮るか

- 対象は **story の全数**。`storybook-static/index.json` から列挙するので、story を足せば
  黙って対象に入る。撮影対象を story 側の申告制にすると、新しく足した story が対象外のまま
  残る
- 外すときは story に `tags: ["vrt-skip"]` を宣言する
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

## 構成

| パス | 役割 |
| --- | --- |
| [`stories.spec.ts`](stories.spec.ts) | story を列挙して 1 件ずつ撮る本体 |
| [`lib/story-index.ts`](lib/story-index.ts) | 目録から撮影対象を取り出す・story の URL を組み立てる |
| [`lib/static-server.ts`](lib/static-server.ts) | build 済み Storybook を配る依存なしの静的サーバ |
| `__screenshots__/<theme>/<story id>.png` | 基準画像（追跡対象） |
| `../playwright.config.ts` | 実行環境と比較条件 |
| `../scripts/vrt/` | 実行結果から一覧表と承認の範囲を取り出す |

`tmp/vrt/` に出る実行結果（actual / diff / HTML レポート）は追跡しない。
