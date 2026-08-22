# セットアップ手順

このボイラープレートを自分のプロジェクトとして立ち上げるまでの手順。**上から順に実行する**。
順序に依存する箇所は各節に明示してある。

各手順の中身は、それを所有するドキュメントが正である。ここが持つのは**順序と、人手が要る箇所**だけ。

## 0. 前提

| | |
| --- | --- |
| [mise](https://mise.jdx.dev) | ツール / ランタイムの版管理。**シェルで activate しておくこと**（[0003](../adr/0003-version-manager.md)） |
| GitHub CLI (`gh`) | リポジトリ運用の make ターゲットが使う。`gh auth login` 済みであること |
| Docker | 手順 6 でのみ使う。基準画像は digest 固定したコンテナの中でしか撮らない（[`vrt/README.md`](../../vrt/README.md)） |

## 1. 手元を用意する

```bash
git clone --recurse-submodules <自分のリポジトリ>   # VRT の基準画像がサブモジュール
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
中身は [`.makefiles/README.md`](../../.makefiles/README.md) を参照。

## 3. GitHub の画面で設定する（人手）

`gh` では代行できないものだけ。

1. **Actions を有効にする** — 作成直後は無効になっていることがある
2. **GitHub Pages のソースを GitHub Actions にする** — ドキュメントサイトの配信先（[0141](../adr/0141-portal-operations.md)）
3. **必須チェックを確認する** — `make setup-repo` が適用したルールセットの `required_status_checks` が、
   1 度 CI を回した後に実際の context 名と一致しているか見る（[`.github/workflows/README.md`](../../.github/workflows/README.md)）

## 4. 自分のリポジトリの姿にする

```bash
make setup-replace-repository-reference REPOSITORY=<owner>/<repo>
make setup-replace-license-copyright COPYRIGHT_HOLDER='<著作権者>'
make setup-remove-boilerplate-only   # boilerplate-only:line
```

いずれも `DRY_RUN=1` で書き換えずに予定だけ出せる。

<!-- boilerplate-only:begin -->
3 つ目は**この template を配る側にしか意味を持たない記述**を剥がす
（[0152](../adr/0152-agents-md-policy.md)）。飛ばす選択肢は無い —— fork を作った時点で前提が
失効しているので、残すと自分に効かない規則に従うことになる。剥がし終えると道具自身も消える。
<!-- boilerplate-only:end -->

## 5. 同梱サンプルを破棄する

```bash
make setup-remove-sample   # DRY_RUN=1 でプレビュー
```

題材を持つ画面群と、その題材に固有の契約・モック・破棄の道具そのものを消す。
破棄後に整形・検査・build・test まで連鎖するので、参照の消し残しはその場で判る。

サンプルを残して使う場合はこの手順を飛ばす。ただし**次の手順より先に済ませたほうがよい** —
破棄はサブモジュールの中へ届かないため、逆順にすると題材の基準画像を自分の置き場に撮ってしまう。

### 破棄後に自分で書き換えるもの

[`src/proxy.ts`](../../src/proxy.ts) の `PROTECTED_PREFIXES` は、破棄すると `/account` だけが残る。
これは**認証を要求するパスをどこに宣言するか**を示すための置き場であり、その画面は同梱していない。
自分の保護対象へ書き換えること。列挙するのは保護する側で、公開側ではない — 公開側を列挙すると、
新しく足した画面が既定で公開になり、書き忘れがそのまま漏洩になる。

判定は前方一致なので、`/` は置けない。すべてのパスに一致し、`/login` 自身も保護対象になって
リダイレクトが循環する。

## 6. VRT の基準画像の置き場を用意する

### 6-1. 置き場を作る

```bash
make setup-baseline-store
```

3 つ聞かれる。既定でよければ Enter。

```text
既存のリポジトリへ配置しますか? 空欄なら新規作成 [<org>/<repo>]:   ← 空欄で新規作成
作成するリポジトリ名 [<現在のリポジトリ名>-baseline-images]:
公開範囲 (public / private / internal) [private]:
```

組織で新規作成が権限で縛られている場合は、最初の問いに既存の `<org>/<repo>` を入れる。

**公開範囲は既定で `private`。** 基準画像は画面の見た目そのものなので、公開側へ倒れる既定は取らない。
ただし**置き場を非公開にすると、外部（fork）からの PR で `vrt` が落ちる** — fork の PR には
secrets が渡らず、基準画像を読む App トークンを取れないため。外部の PR を受けるリポジトリは `public`。

終わったら配線をコミットする。

```bash
git add .gitmodules baseline/images
git commit -m "Build: 基準画像の置き場を配線する"
```

> **置き場にルールセットを掛けないこと。** 撮り直しは GitHub App の push で行うため、
> 保護を掛けると更新経路そのものを塞ぐ。

### 6-2. GitHub App を作る（人手）

自動化できない。REST に作成の口が無く、秘密鍵は生成時に一度しか表示されない。

<https://github.com/settings/apps/new> で作る。

| 項目 | 値 |
| --- | --- |
| GitHub App name | `<現在のリポジトリ名>-baseline-images-app`（**GitHub 全体で一意**） |
| Description | `<現在のリポジトリ名>-baseline-images の visual regression test 用` |
| Homepage URL | `https://github.com/<owner>/<現在のリポジトリ名>` |
| Webhook | **Active のチェックを外す** |
| Repository permissions → Contents | **Read and write** |
| その他の permissions | No access のまま |
| Where can this GitHub App be installed? | **Only on this account** |

`web` や `frontend` のようなありふれたリポジトリ名では既に取られていることがあるので、その場合は
owner 名などを足す。名前は後から変えられる（slug も追随するが、変えたら `make setup-baseline-app` を
叩き直すこと）。

作成後、続けて 3 つ。作成直後に着地するのが **General** ページなので、上から順に済ませられる。

1. **App ID を控える** — General ページの上部に数字で出ている。次の 6-3 で貼り付ける
2. **General → Private keys → Generate a private key** → `.pem` がダウンロードされる
3. **Install App** → **Only select repositories** で**本体と置き場の 2 つだけ**

### 6-3. App を登録する

```bash
make setup-baseline-app
```

```text
App ID（General ページの App ID）:           ← 6-2 で控えた数字

  App ID : ...
  登録先 : <owner>/<repo>

この内容で登録しますか (y/N) [N]:            ← y

秘密鍵 (.pem) のパス:                        ← 端末へ .pem をドラッグしてもよい
```

`App ID: 2168345` のようにラベルごと貼っても通る。

**登録が済んだら `.pem` を消すこと。** ブラウザが落とした実体がそこにある。

```bash
gh secret list   # BASELINE_APP_ID / BASELINE_APP_PRIVATE_KEY が並ぶ
```

### 6-4. 最初の基準画像を撮る

Docker が要る。**2 つある。**置き場は story 単位と画面単位で共有し、区画だけが分かれる
（[`baseline/README.md`](../../baseline/README.md)）。片方だけ撮ると、もう片方は「基準画像が無い」で
全数落ちる。全数を撮るので時間がかかる。

```bash
make vrt-retake   # story を撮って置き場へ送る
make e2e-retake   # 画面を撮って置き場へ送る
git commit -am "Test: 基準画像を撮る"
```

送った結果が出る。

```text
before=<置き場の直前のコミット>
after=<撮影したコミット>
count=<動いた枚数>
```

以降の運用（撮り直し・承認・掃除）は [`vrt/README.md`](../../vrt/README.md) が正。画面単位の側は
[`e2e/README.md`](../../e2e/README.md) を見る。

## 7. 自分の契約を入れる

`openapi/sources.yaml` に自分のバックエンドの契約の座標を書き、生成し直す。

```bash
make fetch-api
make gen-api
```

## 8. 認証済みの画面を手元で見る

手元では `/dev/session` が開いており、**IdP のリダイレクトを通さずに session を発行できる**。
主体と役割を決めて「この内容で入る」を押すと、指定した画面へ着地する。この口は開発と CI の手元の
宛先でだけ開き、production build には route ごと入らない。

実物のバックエンドへ繋いでいるときは、**「API 接続モード」を入れる**とアクセストークンもこの画面が
取る。「IdP の接続先」は設定（`AUTH_ISSUER`）を初期値に置いているが書き換えられるので、**いま叩いて
いる API と同じ組の IdP** を指すこと。口を分けて並行して立てていると、設定の値とずれる。

トークンの取り方は
[`src/adapters/server/auth/development-token.ts`](../../src/adapters/server/auth/development-token.ts)
が 1 か所で持つ。相手は製品ではなく性質で決まり、**OIDC Discovery を公開し、Resource Owner Password
Credentials で主体を名指しできる開発用 IdP** なら何でも通る（本物の IdP で使ってはならない付与方式を、
照合する相手が居ないから使っている）。**別の IdP へ移るなら、書き換えるのはこのファイルだけ**でよい。
画面も Server Action も「主体と接続先を渡すとトークンが返る」ことしか知らない。

詳しい使い方は [`src/features/dev-session/README.md`](../../src/features/dev-session/README.md)。

## 確認

```bash
pnpm lint:ci && pnpm typecheck && APP_ENV=local pnpm build && pnpm test
```

CI 側は PR を 1 本立てれば全ジョブが回る。落ちたジョブの引き先は
[`.github/workflows/README.md`](../../.github/workflows/README.md)、詰まったときは
[`.claude/skills/repo-ops`](../../.claude/skills/repo-ops/SKILL.ja.md)。
