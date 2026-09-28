# API 契約の取り込み

バックエンドの OpenAPI 契約をこのリポジトリへ取り込む場所です。契約は SSOT をバックエンドが持ち、
こちら側は**取得して固定する**だけを行います([0072](../docs/adr/0072-api-type-generation.md))。

## 構成

| パス | 役割 |
| --- | --- |
| `sources.yaml` | 取得座標の宣言。`name` / `repo` / `path` / `ref` は人が書き、`sha` / `fetchedAt` は取得時に書き戻される |
| `<name>.gen.yaml` | 取得物。**do-not-edit**。`make api-fetch` が上書きする |

取得物は `name` から一意に決まります(`api` → `api.gen.yaml`)。宣言側で出力先は指定できません。
名前と置き場所が別々に決まると、生成物がどの契約に対応するのかを宣言だけからは追えなくなるためです。

### 宣言の形

読み取り側([`scripts/openapi/sources-manifest.ts`](../scripts/openapi/sources-manifest.ts))が
宣言に課す形です。外れた宣言は取得より前に拒否されます。

| 項目 | 形 | 理由 |
| --- | --- | --- |
| `name` | 英小文字始まりの kebab-case | 取得物のファイル名になる。`.` や `/` を許すと置き場所が宣言から漏れる |
| `repo` | `owner/repo` | `gh` へ渡す前にここで確定させる |
| `path` | `/` 区切りの相対パス。`..` / `?` / `#` を含まない | 取得 URL の一部になる。`?` を許すと `ref` のクエリを `path` 側から上書きでき、版の固定を別の項目から迂回できる |
| `ref` | 空でない文字列 | ブランチ・タグ・コミット SHA のいずれか。固定の仕方は下記 *ref の固定* |
| `sha` / `fetchedAt` | 取得前は書かない | 宣言だけがある状態を正当とし、初回の取得が書き込む |

- **`name` は重複できません。** 後の取得物が先の契約を黙って上書きし、生成物がどの宣言に対応する
  のか追えなくなるためです
- **宣言が 0 本の `sources.yaml` は読み取りで拒否されます。** `make api-gen-check` も同じ読み取りを
  通るため、座標を書くまで通りません
- **`ref` を選んだ理由はコメントで `ref` の隣に書きます。** 書き戻しは YAML を組み直さず値だけを
  差し込むため、コメントは取得を繰り返しても残ります。コミット SHA で固定した宣言は、なぜその
  コミットなのかがコメントに無いと次に動かすときの根拠を失います

## 取得

```bash
make api-fetch            # sources.yaml の全契約を取得する
make api-fetch NAME=api   # 契約を 1 本だけ取得する
```

取得は生成を伴いません。取得したら `make api-gen` で型 / zod / MSW ハンドラを生成します。
取得したまま生成し忘れた状態は `make api-gen-check` が検出します。commit 時の hook は
この突合だけを回し、CI は再生成して差分まで見ます。どちらもネットワークへは出ません
([0072](../docs/adr/0072-api-type-generation.md) の drift ゲート)。

生成物の置き場と読み方は [src/adapters/gen/README.md](../src/adapters/gen/README.md) が持ちます。 <!-- sample:line -->

`gh` の認証を使うため private リポジトリでも通ります。取得は GitHub Contents API 経由で、
レスポンスの `sha`(blob SHA)をそのまま版の根拠として使います。内容が変われば blob SHA も
変わるため、取り込み側でハッシュを計算し直す必要はありません。

取得の振る舞いで、宣言からは読めないものは次の通りです
([`scripts/openapi/fetch-api.ts`](../scripts/openapi/fetch-api.ts) /
[`contents-response.ts`](../scripts/openapi/contents-response.ts))。

- **`NAME=` に宣言の無い名前を渡すと落ちます。** 綴り違いが「対象 0 件で正常終了」に化けると、
  取得したつもりの契約が古いまま生成へ流れるためです
- **取得は並行、書き出しは宣言順です。** 契約どうしに依存は無いものの、書き出しの順が取得の
  速さで入れ替わると、同じ宣言から実行のたびに違う差分が出ます
- **書き出す本文を全て組み立ててから書き込みます。** 取得物だけ新しく宣言は古い、というどちらが
  正か分からない状態を作業ツリーへ残さないためです
- **1MB を超える契約は取り込めません。** Contents API は 1MB 超のファイルの本文を返さないため、
  取得はそこで落ちます。復号後のサイズが API の申告と食い違う応答も拒否します —— 欠けた契約から
  生成すると、消えたエンドポイントが「上流が削除した」のと区別できない形で型から消えるためです

## 版の記録

版は 2 か所に残ります。

- `sources.yaml` の `sha` — full blob SHA。どの契約を取り込んだかの記録
- 取得物の `info.version` — `2.2.0+aa62bff` の形。**取得物そのもの**が版を持つため、契約から
  生成した成果物との突合ができる

**blob SHA が指すのは契約の内容であって、バックエンドのコミットではありません。** どのコミット
から取ったかは `ref` が持ちます。`ref` にブランチやタグを書いた場合、その時点でどのコミットへ
解決されたかは記録されないため、コミットまで一意に辿りたければ `ref` をコミット SHA で固定します。

`fetchedAt` は取得時刻であり、版の同一性には関与しません。同じ `ref` を取り直せば `sha` は
変わらず `fetchedAt` だけが動きます。

### 取得物への手入れは 2 か所だけ

取得物は、先頭の do-not-edit ヘッダと `info.version` 末尾の short SHA 以外、上流のテキストそのもの
です([`scripts/openapi/contract-stamp.ts`](../scripts/openapi/contract-stamp.ts))。

- **YAML を組み直しません。** 取り込み側の整形で全体が書き換わると、上流との差分がスタンプ以外にも
  現れ、「取り込み側が手を入れたのか、上流が変わったのか」を読み分けられなくなります。同じ理由で
  版の文字列も解析値ではなく元テキストから取り、引用符の有無も上流の書き方に従います
- **上流の build metadata(`+` 以降)は捨てて付け直します。** 再取得のたびに版が伸び続けると、
  版そのものが取得回数の記録に化けます
- **上流の契約に求めるのは、`info.version` が単一行のスカラーであることです。** 無い契約、
  ブロックスカラー(`|` / `>`)で書かれた契約は取り込めません。末尾へ文字を足しても値の終端が
  変わらない書き方だけがスタンプできるためです

## 複数契約

`sources.yaml` は複数の契約を並べられます。バックエンドが 1 リポジトリでも、契約が 1 本とは
限らないためです。

<!-- sample:replace-begin -->
現在の宣言は次の 1 本です。

| name | 契約 | 備考 |
| --- | --- | --- |
| `api` | go-boilerplate 本体の API | admin と一般が同居しており、tags でも `security` でも scope でも機械的に分割できないため 1 ユニットとして扱う |
<!-- sample:replace-with -->
<!-- = 宣言は空です。**`name` は `api` のまま使うのが既定です。** 取得先（`api.gen.yaml`）と版の -->
<!-- = 突合は `name` から導かれますが、生成の側は綴りを直に持っており、`orval.config.ts` の -->
<!-- = `apiInput.target` / `output.target` / `output.schemas` と `scripts/openapi/gen-api-plan.ts` の -->
<!-- = `GEN_API_OUTPUTS` を一緒に揃えないと、`make api-gen-check` が「生成物がありません」で止まります。 -->
<!-- =  -->
<!-- = 宣言が空のままでは `sources.yaml` の読み取りが拒否され、`make api-gen-check` も通りません。 -->
<!-- = 座標を書いて `make api-fetch` → `make api-gen` まで済ませてから commit します。 -->
<!-- =  -->
<!-- = **分けるかどうかは契約の側の都合で決めます** —— 1 本の契約に admin と一般が同居していても、 -->
<!-- = tags でも `security` でも scope でも機械的に分割できないなら 1 ユニットとして扱います。 -->
<!-- sample:replace-end -->

### 契約を 1 本足すとき

取得・抽出・突合は宣言を読んで契約ごとに回りますが、**生成の側は契約ごとに置き場を直に持ちます。**
足す手順は次の通りです。

1. `sources.yaml` に `name` / `repo` / `path` / `ref` を書く
2. `make api-fetch NAME=<name>` で取得し、`sha` / `fetchedAt` を書き戻させる
3. `orval.config.ts` に、その契約の入力(`openapi/<name>.gen.yaml`)を読む project を 2 つ足す ——
   wire 型と zod を `src/adapters/gen/<name>/` へ、client と MSW ハンドラを `mocks/<name>/` へ出す
   もの。既存の 1 本と同じ形にする
4. `scripts/openapi/gen-api-plan.ts` の `GEN_API_OUTPUTS` に `src/adapters/gen/<name>` と
   `mocks/<name>` を足す。退避と空からの再生成はこの一覧を読む
5. `make api-gen` で生成する

3 と 4 を落とすと、型検査も lint も通ったまま `make api-gen-check` が「生成物がありません」で
止まります。突合は `src/adapters/gen/<name>/` と `mocks/<name>/` を契約ごとに見るためです。
契約が定める定数だけを写した `limits.ts` は、定数を 1 つも持たない契約では作られません
([0072](../docs/adr/0072-api-type-generation.md))。

**認証の契約はここに置きません。** フロントが認証で使うのは OIDC Discovery が実行時に示す口
だけで（[`src/adapters/server/auth/`](../src/adapters/server/auth/README.md)）、契約から生成した
型を一切通らないためです。取り込む対象がそもそも無いので、IdP をどう用意したかには依存しません。

## boilerplate 導入時の変更点

宣言が指しているのは、本リポジトリの相方として開発されたバックエンドの契約です。**自分の
バックエンドの契約へ最初に差し替える箇所です。**

| 何を | 既定 | 変更する箇所 |
| --- | --- | --- |
| 取得座標 | `repo` / `path` が相方のリポジトリと契約のパスを指し、`ref` はコミット SHA で固定されている | `sources.yaml` の `repo` / `path` / `ref`。`sha` / `fetchedAt` は書かず、`make api-fetch` に書き戻させる |
| 契約の本数と `name` | 1 本、`name` は `api` | `sources.yaml`。`name` を変えると生成側の綴りも一緒に動く（下記） |
| 生成の入出力 | `orval.config.ts` の `apiInput.target` / `output.target` / `output.schemas` が `name` に対応する綴りを直に持つ | `name` を変えたときだけ `orval.config.ts` と `scripts/openapi/gen-api-plan.ts` の `GEN_API_OUTPUTS` を揃える |
| client を作らない tag | 監視・診断の口（health / ready / version など）と、応答の型としてしか使わない内部 tag を除いている | `orval.config.ts` の `NON_CLIENT_TAGS`。契約側の tag の付け方が違えば合わない |

差し替えたら `make api-fetch` → `make api-gen` の順で取り直します。取得したまま生成し忘れた状態は
`make api-gen-check` が検出します。

契約から読めない値域をモックへ与える設定は、こちらではなく
[`mocks/README.md`](../mocks/README.md#boilerplate-導入時の変更点) が持ちます。

## ref の固定

`ref` はブランチ・タグ・コミット SHA のいずれも書けますが、**コミット SHA で固定します**。取り込む
契約が必ずタグの上に載っているとは限らず、タグを指すと「まだタグの無い変更を使いたい」場面で
ブランチへ緩めることになり、そこから先は取り込みが暗黙に動きます。上流の進展の取り込みは
`ref` の書き換えとして明示的に行います。
