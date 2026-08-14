# docker

開発を補助するコンテナの定義と、そこで使う image の digest ロックファイルを置く。

**ここにあるものは配送物ではない。** アプリ本体は PaaS / 静的 CDN へそのまま載せる前提で、
Docker で動かさない（[0011](../docs/adr/0011-no-docker.md)）。無印の `docker-compose.yml` を
使わず [`docker-compose.dev-tools.yml`](../docker-compose.dev-tools.yml) を名指しで起動する形に
してあるのは、本体配送と読み違えられないようにするため。

## 中身

| パス | 役割 |
| --- | --- |
| `images-pin.toml` | `image:tag` → digest のロックファイル（SSOT）。手で書かない |
| `<用途>/Dockerfile` | 補助ツールを自前で組む場合の置き場。現時点では無く、上流 image をそのまま使う |

ロックファイルの守備範囲はこのディレクトリの外にも及ぶ。走査するのは以下の 3 か所。

| 場所 | 記法 |
| --- | --- |
| リポジトリ直下の `docker-compose*.{yml,yaml}` | `image: <image>:<tag>` |
| `docker/<用途>/Dockerfile` | `FROM <image>:<tag>` |
| `.github/workflows/**` / `.github/actions/**` | `uses: docker://<image>:<tag>` |

3 つ目は GitHub Actions が registry の image を直接実行するステップの記法で、`uses:` の行ではあるが
参照先は GitHub のリポジトリではない。SHA 固定を担う actions-pin は tag を `git ls-remote` で
commit へ解決する機構なので registry には効かず、digest を扱うこちらが持つ（[0153](../docs/adr/0153-ci-configuration.md)）。
**tag は必須**で、省略すると `:latest` を指してしまうため取りこぼしとして落とす。

## image は digest で固定する

registry の tag は、同じ名前のまま別の中身を指せる。tag だけで参照していると、指し先が
差し替わったことに気づけないまま新しい中身を引く。そこで **tag は版の SSOT として参照側に
残し、digest をロックファイルが持つ**形にしてある。固定してあれば、指し先が変わった時点で
pull が失敗する。

```bash
make images-pin-resolve   # tag を digest へ解決してロックファイルを更新する
make images-pin-apply     # ロックファイルを元に参照を digest へ固定する
make images-pin-check     # 固定済みか検証する（書き換えなし。CI が回す）
```

`resolve` は**公開から 14 日未満の digest を採らない**（`IMAGES_PIN_MIN_AGE_DAYS`）。上流が
乗っ取りを検知して取り消すまでの時間を稼ぐためで、既存のピンがあればそれを維持する。退行先の
無い出来立ての image は、tag のまま残さず失敗させる。

tag の付け替えそのものは検知しない。base image の tag は patch 版が出るたび前進するのが通例で、
「解決先が変わったら止める」を入れると日常的な更新と区別が付かなくなる。image に対して働く
防壁は検疫と固定の 2 つである。

## VRT ランナー

[`docker-compose.dev-tools.yml`](../docker-compose.dev-tools.yml) の `vrt_runner` は、story の
見た目を比較する Playwright の実行環境。基準画像の一意性をこのイメージが担保するため、
`platform` まで固定してある。使い方は [`vrt/README.md`](../vrt/README.md)。
