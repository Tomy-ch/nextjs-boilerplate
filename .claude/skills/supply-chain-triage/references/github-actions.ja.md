> **このファイルは [`github-actions.md`](github-actions.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `github-actions.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `github-actions.md` だけです。このファイルは人間が読むための翻訳です。

# GitHub Actions の参照

`.github/workflows/**` と `.github/actions/**` にあるすべての `uses:` を扱う。このエコシステムは
3 つの中で最も豊かな証拠をくれる。**実際のコミット範囲が手に入る**からである —— pin された SHA と
候補のあいだで何が変わったかを正確に読める。

pin そのものは `.github/actions-pin.toml` にあり、その機構は ADR 0153 が持つ。このファイルは、
1 つの候補をどう判定するかだけを言う。

## 軸 P —— 公開者

```bash
gh api repos/<owner>/<repo>/commits/<candidate-sha> --jq '.author.login, .committer.login, .commit.author.date'
gh api repos/<owner>/<repo>/commits/<baseline-sha>  --jq '.author.login, .committer.login'
gh api repos/<owner>/<repo> --jq '.owner.login, .archived, .disabled'
```

リポジトリの持ち主が変わったか、移管されたかを確かめる —— 名前の変更は黙ってリダイレクトされ、
`uses:` の参照は別の持ち主を指したまま動き続ける。

アカウントがこのリポジトリにとって新しいとき、あるいはリポジトリが告知無しに移管されたときは `3`。

## 軸 A —— attestation

```bash
gh api repos/<owner>/<repo>/git/refs/tags/<tag> --jq '.object.sha'   # does the tag still resolve to what we trust?
gh api repos/<owner>/<repo>/commits/<candidate-sha> --jq '.commit.verification'
```

**動かされたタグが、ここでの典型的な発見である。** タグは変更可能で、SHA は変更できない。この
リポジトリが既に信頼しているタグがいま別のコミットへ解決されるなら、差分が何を示そうと、それは軸 A の `3` である。

## 軸 D —— 差分

```bash
gh api repos/<owner>/<repo>/compare/<baseline-sha>...<candidate-sha> --jq '.files[].filename'
gh api repos/<owner>/<repo>/compare/<baseline-sha>...<candidate-sha> --jq '.commits[].commit.message'
```

続けて、大事なファイルのパッチを読む。JavaScript の action では、実行されるのは `dist/` である:

```bash
gh api repos/<owner>/<repo>/compare/<baseline-sha>...<candidate-sha> --jq '.files[] | select(.filename|test("^dist/")) | .patch'
```

**対応する `src/` の変更が無い `dist/` の変更は、このエコシステムで最も強い単独のシグナルである。**
`3` と採点し、そう言う。

差分の中の `action.yml` も読む: composite action に `run:` のステップが加わること、あるいは `runs.main` の変更は、 <!-- skill-lint-ignore -->
ジョブの認証情報を持って実行されるコードである。（そのファイルは上流の Action のものであって、この
リポジトリのものではないので、ここに存在することはない。この抑止は、このリポジトリが自前の Action を公開したときに外す。）

## 軸 S —— 表面

```bash
gh api repos/<owner>/<repo>/contents/action.yml?ref=<candidate-sha> --jq '.content' | base64 -d
```

action が文書化している `inputs`、`runs`、あらゆる `permissions` を、ベースラインと比べる。
composite action の `run:` ブロックにある新しいネットワーク呼び出しは、D と同じくここにも属する。

## 露出

常に最も高いバンドである: Action は CI の中で、**このリポジトリ自身のコードが動く前に**、ジョブの
認証情報を持って実行される。露出の行でそう言う。
