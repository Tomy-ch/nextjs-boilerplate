# セットアップ手順

このボイラープレートを自分のプロジェクトとして立ち上げるまでの手順。**上から順に実行する**。
順序に依存する箇所は各節に明示してある。

各手順の中身は、それを所有するドキュメントが正である。ここが持つのは**順序と、人手が要る箇所**だけ。

## 0. 前提

| | |
| --- | --- |
| [mise](https://mise.jdx.dev) | ツール / ランタイムの版管理。**シェルで activate しておくこと**（[0003](adr/0003-version-manager.md)） |
| GitHub CLI (`gh`) | リポジトリ運用の make ターゲットが使う。`gh auth login` 済みであること |
| Docker | VRT の撮影に使う。基準画像は digest 固定したコンテナの中でしか撮らない（[`vrt/README.md`](../vrt/README.md)） |

## 1. 手元を用意する

```bash
git clone <自分のリポジトリ>
cd <リポジトリ>

make install-tools
pnpm install
pnpm exec lefthook install   # 自動では入らない。clone 後に 1 度だけ
```

## 2. リポジトリを初期化する

```bash
make setup-repo
```

**破壊的**。既存タグをローカルと `origin` の両方から全削除し、`v0.0.0` を打ち直す。
`develop` / `staging` / `production` を作り、デフォルトブランチ・ルールセット・ラベルを設定する。
中身は [`.makefiles/README.md`](../.makefiles/README.md) を参照。

## 3. GitHub の画面で設定する（人手）

`gh` では代行できないものだけ。

1. **Actions を有効にする** — fork 直後は無効になっていることがある
2. **GitHub Pages のソースを GitHub Actions にする** — ドキュメントサイトの配信先（[0141](adr/0141-portal-operations.md)）
3. **必須チェックを確認する** — `make setup-repo` が適用したルールセットの `required_status_checks` が、
   1 度 CI を回した後に実際の context 名と一致しているか見る（[`.github/workflows/README.md`](../.github/workflows/README.md)）

## 4. 名前を置き換える

```bash
make setup-replace-repository-reference REPOSITORY=<owner>/<repo>
make setup-replace-license-copyright COPYRIGHT_HOLDER='<著作権者>'
```

どちらも `DRY_RUN=1` で書き換えずに予定だけ出せる。

## 5. 同梱サンプルを破棄する

```bash
make setup-remove-sample   # DRY_RUN=1 でプレビュー
```

EC の題材を持つ画面群と、その題材に固有の契約・モック・破棄の道具そのものを消す。
破棄後に整形・検査・build・test まで連鎖するので、参照の消し残しはその場で判る。

サンプルを残して使う場合はこの手順を飛ばす。ただし**次の手順より先に済ませたほうがよい** —
破棄はサブモジュールの中へ届かないため、逆順にすると題材の基準画像を自分の置き場に撮ってしまう。

## 6. VRT の基準画像の置き場を用意する

### 6-1. 置き場を作る

```bash
make setup-vrt-images
```

置き場の既定名は `<リポジトリ名>-vrt-images`。組織で新規作成が縛られている場合は、
先に出る「既存のリポジトリへ配置しますか?」へ `<org>/<repo>` を入力すると作成を飛ばす。

**置き場にルールセットを掛けないこと。** 撮り直しは GitHub App の push で行うため、保護を掛けると
更新経路そのものを塞ぐ。

### 6-2. GitHub App を作る（人手）

自動化できない。REST に作成の口が無く、秘密鍵は生成時に一度しか表示されない。

1. Settings → Developer settings → GitHub Apps → **New GitHub App**
2. 名前は任意。**Webhook は Active を外す**
3. Repository permissions → **Contents: Read and write** だけを付ける。他は No access のまま
4. 作成後、**Install App** で **本体と置き場の 2 つだけ**を選ぶ（All repositories にしない）
5. General → Private keys → **Generate a private key**。ダウンロードされる `.pem` を開いておく

### 6-3. App を登録する

```bash
make setup-vrt-app
```

App の slug（`github.com/apps/<ここ>`）を聞かれる。App ID は slug から解決するので控える必要はない。
続けて秘密鍵の貼り付けを求められるので、`.pem` の中身をそのまま貼って `Ctrl+D`。
ディスクにもシェル履歴にも残らない。

登録が済んだら `.pem` は手元から消してよい。

### 6-4. 最初の基準画像を撮る

```bash
make vrt-update   # 撮る
make vrt-push     # 置き場へ送り、サブモジュールのポインタを進める
git commit -m "Test: 基準画像を撮る"
```

以降の運用（撮り直し・承認・掃除）は [`vrt/README.md`](../vrt/README.md) が正。

## 7. 自分の契約を入れる

`openapi/sources.yaml` に自分のバックエンドの契約の座標を書き、生成し直す。

```bash
make fetch-api
make gen-api
```

## 確認

```bash
pnpm lint:ci && pnpm typecheck && pnpm build && pnpm test
```

CI 側は PR を 1 本立てれば全ジョブが回る。落ちたジョブの引き先は
[`.github/workflows/README.md`](../.github/workflows/README.md)、詰まったときは
[`.claude/skills/repo-ops`](../.claude/skills/repo-ops/SKILL.ja.md)。
