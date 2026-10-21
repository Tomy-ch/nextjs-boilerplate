> **このファイルは [`container-images.md`](container-images.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `container-images.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `container-images.md` だけです。このファイルは人間が読むための翻訳です。

# コンテナイメージ

`docker/images-pin.toml` で pin されたイメージ参照を扱う。**3 つの中で最も証拠が薄く**、ここでの
正直な結果は、2 つの軸で `?` になることが多い。

ここでイメージを使うのは CI である。このリポジトリはアプリケーションをコンテナで出荷しない
（ADR 0011）。露出はそれに応じて判定する —— ワークフローのイメージも、ジョブの認証情報を持って動く。

**検疫中のイメージを pull して実行しない。** マニフェストと config を読むことは何も実行しない。
`docker run` は実行する。

## 軸 P —— 公開者

```bash
crane manifest <image>:<tag> | jq '.'                 # or: docker buildx imagetools inspect --raw
crane config  <image>:<tag> | jq '.config.Labels'
```

役に立つラベルは OCI のもの: `org.opencontainers.image.source`、`.revision`、`.vendor`。config の
どこにも公開者が名指されていないときは、軸は `?` である —— レジストリの名前空間から継続性を
仮定せず、そう言う。

## 軸 A —— attestation

```bash
cosign verify-attestation --type slsaprovenance <image>@<digest>   # when the publisher signs
crane config <image>:<tag> | jq '.config.Labels["org.opencontainers.image.revision"]'
```

イメージが provenance の attestation を持っているときは、この軸は答えられ、しかも強い。`revision`
ラベルしか持たないときは、そのラベルは証拠ではなくビルド側の主張である —— ソースのコミットを
独立に確かめられない限り、`?` として扱う。

## 軸 D —— 差分

```bash
crane config <image>:<tag>@<candidate-digest> | jq '.history[].created_by'
crane config <image>:<tag>@<baseline-digest>  | jq '.history[].created_by'
```

**同じタグの再ビルドにはソースの差分が無い。** 変更可能なタグに掛かったいつもの保留をたいてい
解除できないのは、そのためである。使える比較はレイヤーの履歴だけである: ネットワークから何かを
取ってくる新しい `created_by` のステップや、対応する上流の変更の無い新しいレイヤーが、探すべき発見である。

イメージが SBOM を公開しているときは、パッケージの集合の差分を取る:

```bash
cosign download sbom <image>@<candidate-digest> > "$SCRATCH/candidate.sbom.json"
```

そうでなければ、この軸は `?` である。

## 軸 S —— 表面

```bash
crane config <image>@<candidate-digest> | jq '.config | {Entrypoint, Cmd, User, Env, ExposedPorts}'
```

変わった `Entrypoint`、`User: root` への降格、認証情報らしい名前を持つ新しい `Env`、新しく公開された
ポートは、どれも何も実行せずにここで採点できる。

## このエコシステムを正直に読む

変更可能なタグの再ビルドでは 2 つの `?` が普通の結果であり、2 つの `?` は
**INSUFFICIENT-EVIDENCE** を意味する: ウィンドウはそのまま立つ。それは正しい答えであって、実行の失敗ではない。
