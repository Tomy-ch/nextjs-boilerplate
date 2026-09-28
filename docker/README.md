# docker

開発を補助するコンテナの定義と、そこで使う image の digest ロックファイルを置く。

**ここにあるものは配送物ではない。** アプリ本体は PaaS / 静的 CDN へそのまま載せる前提で、
Docker で動かさない（[0011](../docs/adr/0011-no-docker.md)）。無印の `docker-compose.yml` を
使わず [`docker-compose.dev-tools.yml`](../docker-compose.dev-tools.yml) を名指しで起動する形に
してあるのは、本体配送と読み違えられないようにするため。Docker を採ってよい用途と、採る際の
ファイル名 / 起動コマンドの規則は [0011](../docs/adr/0011-no-docker.md) が持つ。

## 中身

| パス | 役割 |
| --- | --- |
| `images-pin.toml` | `image:tag` → digest のロックファイル（SSOT）。`make images-pin-resolve` が書き、手で書かない |
| `<用途>/Dockerfile` | 補助ツールを上流 image のままでは組めないときの置き場。1 用途 1 ディレクトリで、走査対象になるのはこの位置の `Dockerfile` だけ |

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
make images-pin-resolve   # tag を digest へ解決してロックファイルを更新する（唯一ネットワークに出る）
make images-pin-apply     # ロックファイルを元に参照を digest へ固定する
make images-pin-check     # 固定済みか検証する（書き換えなし。pre-commit hook と CI が回す）
```

`resolve` は**公開から 14 日未満の digest を採らない**（`IMAGES_PIN_MIN_AGE_DAYS`）。上流が
乗っ取りを検知して取り消すまでの時間を稼ぐためで、既存のピンがあればそれを維持する。退行先の
無い出来立ての image は、tag のまま残さず失敗させる。

tag の付け替えそのものは検知しない。base image の tag は patch 版が出るたび前進するのが通例で、
「解決先が変わったら止める」を入れると日常的な更新と区別が付かなくなる。image に対して働く
防壁は検疫と固定の 2 つである。

### 検疫の測り方

- 経過日数は registry の image config が持つ `created` から数える。**マルチアーキの image は
  platform ごとの `created` のうち最も古いものを採る** —— 検疫が問うのは「この参照はいつから
  存在するか」であり、既存の image に 1 アーキテクチャを足しただけの更新を新着扱いにしない
- 解決は `docker buildx imagetools inspect` で行う。手元の docker と、その認証情報が要る
- 緊急時に検疫を外すのは `make images-pin-resolve IMAGES_PIN_MIN_AGE_DAYS=0` の**明示だけ**。
  窓に掛かった版を採ってよいかの証拠採点は `supply-chain-triage` スキルが持つ
  （[0154](../docs/adr/0154-claude-skills-operations.md)）

### 参照の書き方

参照は **1 行 1 件・引用符なし・tag 明示**で書く。走査は厳格なパターンで行い、それに一致しない
`image:` / `FROM` / `uses: docker://` の行は**素通りではなく error** になる —— 引用符付き
（`image: "<image>:<tag>"`）や flow mapping は未登録とも未固定とも数えられず、検査が「異常なし」を
返してしまうため、対応記法の外を検出して落とす。

| 形 | 扱い |
| --- | --- |
| `image: <image>:<tag>` / `FROM <image>:<tag>` / `uses: docker://<image>:<tag>` | 固定対象 |
| 既に `@sha256:...` が付いた参照 | tag の部分だけを読み、digest はロックファイルの値へ揃える |
| `FROM --platform=... <image>:<tag> AS <stage>` | 固定対象。書き換わるのは参照だけで、`--platform` と `AS <stage>` は保たれるべきもの |
| `FROM <stage>` / `FROM scratch` | 固定のしようが無い正当な tag なし参照。Dockerfile だけの例外 |
| 引用符付き・flow mapping・tag なし | error（`<相対パス>:<行番号>` で報告） |

`apply` は tag と行末コメントを保ったまま `<image>:<tag>@sha256:...` へ書き換える。

### `check` が落とすもの

`apply` と `check` は同じ判定を共有し、`check` はそれを書き換えなしで実行する。落とす条件は
4 つで、いずれも fail-closed。

| 症状 | 意味 | 直し方 |
| --- | --- | --- |
| 未登録 | 参照はあるがロックファイルに無い | `make images-pin-resolve` |
| 未固定 / 不一致 | 参照の digest がロックファイルと違う、または付いていない | `make images-pin-resolve && make images-pin-apply` の結果をコミット |
| 孤児 | ロックファイルにあるがどこからも参照されない | 該当行を消すか `make images-pin-resolve` |
| 解釈できない記法 | 上の表の error 行 | 参照を対応記法へ直す |

`apply` は全ファイルの可否を確定してから書く。未登録や孤児が 1 つでもあれば 1 ファイルも
書き換えないので、「コマンドは失敗したのに一部だけ固定された作業木」は残らない。

### 手順

- **image を足す** — 参照を tag のまま書き、`resolve` → `apply` の順に回して、参照の書き換えと
  ロックファイルを一緒にコミットする。`resolve` が検疫で採れなかった場合は日を置く
- **版を上げる** — 参照側の tag を書き換えて `resolve` → `apply`。digest を手で差し替えない
  （版の SSOT は tag 側）
- **image を外す** — 参照を消したうえで `resolve` を回す。消すだけだとロックファイルの行が
  孤児として `check` に落ちる

## 補助ツールの service を書く型

[`docker-compose.dev-tools.yml`](../docker-compose.dev-tools.yml) の各 service は次の形に揃える。
どの service が何を担うかは、その service の行頭コメントが持つ。

- **`image:` は digest 付き**で書く（上の機構が固定する）。image を tag でしか受け取れない公式
  action にツールを任せず、compose の service に揃える理由は [0011](../docs/adr/0011-no-docker.md)
- **出力の一意性をイメージが担保する service は `platform` まで固定する。** フォントの
  ラスタライズは CPU アーキテクチャでも変わるため、省くと Apple Silicon と CI が別の
  アーキテクチャを引き、生成物（基準画像など）が両者で一致しない
- **アプリはホストで起動し、コンテナから見に行く。** `node_modules` は入れた OS と CPU 向けに
  解決されるため、コンテナ内で `next start` は起動できない。`extra_hosts` に
  `host.docker.internal:host-gateway` を書くのは、Docker Desktop はこの名前を自分で解決するが
  Linux では明示しないと引けないため
- **リポジトリへ生成物を書く service は `user:` にホストの uid / gid を渡す**（`RUNNER_UID` /
  `RUNNER_GID`。make 側が `id -u` / `id -g` で埋める）。root で書くと、撮った本人が消せない
  生成物がリポジトリに残る。非 root で走らせるので、書ける `HOME` も与える
- **イメージ内の固定パスへ書くツールは `user:` を渡さない。** 呼び出し側の uid で走らせると
  起動に失敗する。その場合の出力先は gitignore 済みの `tmp/` 配下に限る
- **Chromium を動かす service は `ipc: host`。** 既定の 64MB の `/dev/shm` を使い切ってタブごと
  落ちる
- **`ports:` は明示したときだけ公開する。** `docker compose run --service-ports` を付けた起動
  でだけ開くので、レポート配信のような口だけを書き、比較そのものの起動では開かない
- **`entrypoint: []`** で上流 image の既定 entrypoint を外し、実行するコマンドは make の
  レシピが与える

例: visual regression のランナー `browser_runner` は上の全項目を、DAST の `zap` は
`user:` を渡さない側の項目を、それぞれ実装している。使い方は
[`vrt/README.md`](../vrt/README.md) と [`.makefiles/README.md`](../.makefiles/README.md)。
