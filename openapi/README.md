# API 契約の取り込み

バックエンドの OpenAPI 契約をこのリポジトリへ取り込む場所です。契約は SSOT をバックエンドが持ち、
こちら側は**取得して固定する**だけを行います([0072](../docs/adr/0072-api-type-generation.md))。

## 構成

| パス | 役割 |
| --- | --- |
| `sources.yaml` | 取得座標の宣言。`name` / `repo` / `path` / `ref` は人が書き、`sha` / `fetchedAt` は取得時に書き戻される |
| `<name>.gen.yaml` | 取得物。**do-not-edit**。`make fetch-api` が上書きする |

取得物は `name` から一意に決まります(`api` → `api.gen.yaml`)。宣言側で出力先は指定できません。
名前と置き場所が別々に決まると、生成物がどの契約に対応するのかを宣言だけからは追えなくなるためです。

## 取得

```bash
make fetch-api            # sources.yaml の全契約を取得する
make fetch-api NAME=api   # 契約を 1 本だけ取得する
```

取得は生成を伴いません。取得したら `make gen-api` で型 / zod / MSW ハンドラを生成します
([src/adapters/gen/README.md](../src/adapters/gen/README.md))。取得したまま生成し忘れた状態は
`make gen-api-check` が検出します。

`gh` の認証を使うため private リポジトリでも通ります。取得は GitHub Contents API 経由で、
レスポンスの `sha`(blob SHA)をそのまま版の根拠として使います。内容が変われば blob SHA も
変わるため、取り込み側でハッシュを計算し直す必要はありません。

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

## 複数契約

`sources.yaml` は複数の契約を並べられます。バックエンドが 1 リポジトリでも、契約が 1 本とは
限らないためです。現在の宣言は次の 1 本です。

| name | 契約 | 備考 |
| --- | --- | --- |
| `api` | go-boilerplate 本体の API | admin と一般が同居しており、tags でも `security` でも scope でも機械的に分割できないため 1 ユニットとして扱う |

**認証の契約はここに置きません。** 開発用 IdP は既製の OIDC Provider を立てて済ませており、
取り込む先の契約が存在しないためです。フロントが認証で使うのは OIDC Discovery が実行時に
示す口だけで（[`src/adapters/server/auth/`](../src/adapters/server/auth/README.md)）、契約から
生成した型を通りません。

## ref の固定

`ref` はブランチ・タグ・コミット SHA のいずれも書けますが、現在はコミット SHA で固定しています。
商品 API はタグ `v2.1.0` に存在せず、未タグの `release/v2.2.0` にしかないためです。上流の進展の
取り込みは `ref` の書き換えとして明示的に行います。
