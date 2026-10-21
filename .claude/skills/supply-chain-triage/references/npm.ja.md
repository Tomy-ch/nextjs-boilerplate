> **このファイルは [`npm.md`](npm.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `npm.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `npm.md` だけです。このファイルは人間が読むための翻訳です。

# npm レジストリのパッケージ

npm レジストリから解決されるものすべてを扱う: `package.json` の依存、Dependabot の PR、あるいは
`npm:` バックエンドの `mise` の pin。

**`npm` はインストールされておらず、使ってはならない** —— ADR 0001 は pnpm を採用し、npm を禁じている。
レジストリへの問い合わせは `pnpm view` で行い、tarball は `curl` で取ってくる。**候補を `pnpm add`、
`pnpm install`、`pnpm dlx` しない**: インストールスクリプトこそが攻撃である。

作業はセッションの scratchpad で行い、決して作業ツリーでは行わない。

## 軸 P —— 公開者

```bash
pnpm view <name>@<candidate> _npmUser maintainers dist.integrity
pnpm view <name>@<baseline>  _npmUser maintainers
pnpm view <name> time --json          # publish cadence: is a 2-year-dormant package publishing twice today?
```

公開したアカウントがこのパッケージを以前に一度も公開したことのないもので、プロジェクトが
メンテナの交代を告知していないときは `3`。既知の共同メンテナが初めて公開したときは `1`。

## 軸 A —— attestation

```bash
pnpm view <name>@<candidate> dist.attestations repository.url gitHead
```

attestation は tarball をワークフローの実行とソースのコミットに結び付ける。あるときは、そのコミットが
上流のデフォルトブランチ上にあることを確かめる。無いとき —— よくある —— は、`gitHead` が、ツリーが
tarball と一致する実在のコミットへ解決されない限り、軸は `?` である。そして、その一致を確かめることに
なるのは、代わりに軸 D である。

**attestation は、成果物が公開後にすり替えられていないことを証明する。公開そのものが無害だったことは証明しない。**

## 軸 D —— 差分

```bash
TARBALL=$(pnpm view <name>@<candidate> dist.tarball)
curl -fsSL "$TARBALL" -o "$SCRATCH/candidate.tgz"
tar -xzf "$SCRATCH/candidate.tgz" -C "$SCRATCH/candidate"
# same for the baseline, then:
diff -ru "$SCRATCH/baseline/package" "$SCRATCH/candidate/package" | less
```

差分は読む。流し読みしない。侵害のシグネチャを名前で検索する:

```bash
grep -rnE 'preinstall|postinstall|child_process|eval\(|new Function|atob\(' "$SCRATCH/candidate/package"
grep -rnE 'process\.env|NPM_TOKEN|GITHUB_TOKEN|\.npmrc|id_rsa' "$SCRATCH/candidate/package"
grep -rnE 'https?://[0-9]{1,3}\.[0-9]{1,3}\.' "$SCRATCH/candidate/package"
```

**対応するソースの変更無しに変わったビルド出力は、ここで手に入る最もシグナルの強い発見である** ——
実行されるのはバンドルで、レビューされるのはソースである。手に入るときは、公開されたツリーを
`gitHead` 時点の上流リポジトリと比べる。

## 軸 S —— 表面

```bash
pnpm view <name>@<candidate> dependencies bin files scripts engines
pnpm view <name>@<baseline>  dependencies bin files scripts engines
```

差分で採点する: 新しい依存、新しい `bin` エントリ、新しい `scripts` のフック、広げられた `files` の glob。
パッチリリースで実行可能なエントリポイントを得たパッケージは `3`。
