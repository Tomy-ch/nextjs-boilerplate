> **このファイルは [`0003-version-manager.md`](0003-version-manager.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `0003-version-manager.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `0003-version-manager.md` だけです。このファイルは人間が読むための翻訳です。

# ツール・言語バージョン管理方針

本プロジェクトでは、ツールおよび言語ランタイム（Node.js / pnpm 等）の **バージョン宣言の単一ソース (SSOT)** として `mise.toml` を採用する。

[mise](https://mise.jdx.dev/) は当該 SSOT を読み取るデフォルトのインストール backend として host と CI で使い、CI では composite action `.github/actions/setup-mise` の 1 箇所に閉じる。Docker には持ち込まない。これにより mise への過度な依存を避けつつ、開発体験と CI のバージョンを `mise.toml` 1 つに揃える。

## Status

Accepted

## 採用理由

### 1. バージョン宣言の SSOT 集約

`mise.toml` 1 ファイルに「対象ツールとその固定バージョン」をまとめて宣言する。
次のような、ツールごと・用途ごとに分かれた宣言は置かない。

- `.node-version` / `.nvmrc`
- ツール一覧の yaml と、それを `.makefiles/*.mk` へ同期する独自スクリプト
- corepack 経由の pnpm バージョン埋め込み（`package.json` の `packageManager`）

宣言が 1 ファイルなので、レビュー時に「何がどのバージョンか」を 1 箇所で把握できる。

`packageManager` + Corepack は冗長なだけでは済まない。Corepack と mise が同じ `pnpm` を PATH へ載せる 2 つ目の供給経路になり、pin が 2 箇所へ割れて SSOT が破れる。活性化していない側の `pnpm` が動けば、素の pnpm が `pnpm-workspace.yaml` を勝手に書き換える事故経路（`repo-ops` スキル）をリポジトリ自身が開くことになる。置くとすれば、mise が `packageManager` を読んで自らの pin と突き合わせ、二重管理にならない機構を持ったときに限る。素の pnpm を叩いて事故が起きたことは理由にならない —— それは宣言の不在ではなく実行経路の誤りである。

### 2. ベンダーロック耐性 — 仕様書として読めるファイル

`mise.toml` は TOML の素朴な宣言ファイルであり、mise の機能を使わなくても「Node.js 24.14.1 / pnpm 10.33.0 を入れろ」という仕様としてそのまま読める。

仮に将来 mise が衰退・廃止されても以下が成立する。

- `mise.toml` は仕様ファイルとして残せる（人間にもツールにも読める）
- 切り替え範囲は **配送層** (`make install-tools` の実装と CI の `setup-mise`) に限られる
- Docker / 開発者の日常コマンドに `mise` を撒かず、CI の呼び出しも `setup-mise` 1 箇所に閉じているため、撤退コストは契約層と CI のエントリポイント 1 つに閉じる

mise の現状シェアは asdf / nodenv / nvm / volta 等と拮抗しており、リポジトリとしての再利用性を確保するためにもロックインを限定する。

### 3. host インストールのデフォルト backend として現実的

ツール多種を扱う際の起動コストが低い。Node.js / pnpm の 2 つに限っても、shell activate により PATH 切替が自動化されるため、`.node-version` + 手動 `nodenv install` のような運用より摩擦が少ない。

## 構成 — 3 層モデル

```text
┌─────────────────────────────────────────────────────────┐
│ SSOT 層       :  mise.toml                              │
│   └ ツール・言語バージョンの宣言（唯一の真実）            │
├─────────────────────────────────────────────────────────┤
│ 契約層        :  Makefile                                │
│   └ make install-tools / make actions-pin-check など    │
│     開発者が叩く I/F。実装の差し替え点はここに集約        │
├─────────────────────────────────────────────────────────┤
│ 配送層        :  レイヤーごとに別実装                     │
│   ├ host    : mise install                              │
│   ├ Docker  : 周辺サービスのみ（digest 固定、mise なし）  │
│   └ CI      : setup-mise (composite) → mise install     │
└─────────────────────────────────────────────────────────┘
```

各レイヤーの責務:

| レイヤー | 責務 | 変更が起きる頻度 |
| --- | --- | --- |
| SSOT (`mise.toml`) | バージョンを宣言する | ツール更新時のみ |
| 契約 (Makefile) | 開発者に対する安定した I/F を提供する | ほぼ変更なし |
| 配送 (mise / Docker / CI) | 実体を取得し PATH に置く | 環境追加・mise からの移行時に変更 |

mise への依存は **配送層の host と CI の `setup-mise`** に閉じている。SSOT / 契約 / その他の配送ルートには mise コマンドを撒かない。

## SSOT としての mise.toml

```toml
[tools]
"core:node" = "24.14.1"
"aqua:pnpm/pnpm" = "10.33.0"
"aqua:rhysd/actionlint" = "1.7.12"
"aqua:gitleaks/gitleaks" = "8.30.1"
```

- バージョンはパッチまで明示する（再現性のため）
- **backend (`core:` / `aqua:` 等) を全エントリで明示する**。mise のレジストリは 1 つの短縮名に複数 backend を対応させており、どれがデフォルトかはレジストリ側の都合で変わりうる。短縮名で書くと、その差し替えが**取得元の変更として現れず、バージョンも lockfile も動かないまま別の配布物が入る**。明示すれば SSOT が「何を・どこから取るか」まで宣言したことになる
  - **一様に適用する**。一部のツールにだけ課す運用は、読み手が「意図的な線引き」と「書き漏れ」を区別できず、規約として機能しない
  - 明示をやめる判断は前提の側からしか起きない —— mise がレジストリのマッピング固定を宣言の外で保証するようになるか、明示した backend が解決できない環境の事例が出るかのどちらかである。記述が冗長であることは理由にならない
  - これが守るのはレジストリのマッピング差し替えだけである。配布物そのものの改竄は mise デフォルトの checksum / cosign 検証が担う。両者は別のレイヤーであり、片方が他方を代替しない
- mise の機能利用を前提とした追加機能（タスク定義 `[tasks]` / 環境変数 `[env]` 等）はここに置かない。SSOT の純度を保つため、mise 固有の付加機能は別ファイル / Makefile 側で扱う
- **バージョンの宣言の同期検査は持たない。撤回条件は、バージョンの宣言が `mise.toml` の外にもう 1 箇所現れたとき。** 本リポジトリは Docker を持たない（[0011](0011-no-docker.ja.md)）ため宣言が 1 箇所しか無く、CI のツールも `setup-mise` が `mise.toml` から読むのでコピーが無い。`mise.toml` に書けない mise 自身のバージョンは `setup-mise` が持ち、同じ action 内の digest / キャッシュキーとの整合を `make actions-mise-pin-lint` が見る。`mise.toml` の管理外のツールを workflow が単独で固定するバージョンは、同期の相手を持たないので対象外である。**「他所が持っているから」は条件にならない** —— 同期の検査は、同期すべき 2 つ目が在って初めて意味を持つ

## 配送層の扱い

### host（開発者ワークステーション）

- mise をデフォルトの backend として推奨。`make install-tools` がエントリポイント
- 個人開発などで mise を使いたくない場合、`.makefiles/tools/setup.mk` の `install-tools` ターゲットを別実装（nodenv / volta 等）に差し替えれば済む。SSOT (`mise.toml`) はそのままで読める

### Docker

- **アプリ本体を動かす `Dockerfile` は同梱しない**([0011](0011-no-docker.ja.md))。したがって配送する image のタグと `mise.toml` を突き合わせる問題は起きない
- **開発を支える周辺サービス**（観測基盤 / 開発用 IdP 等）だけが container で立つ。そこへ mise を持ち込まない —— 配送層に mise 依存を広げないため
- 周辺サービスの image は**タグではなく digest で固定**し、固定値はロックファイルが持つ（`make images-pin-check` が差分で落とす）。人がコピーする工程を作らない

### CI

- **CI のエントリポイントは composite action `.github/actions/setup-mise` 1 つ**。digest で照合した mise 本体を入れ、ジョブが名指ししたツールだけを `mise.toml` のバージョンで `mise install` する。ジョブが渡すのはツール名だけで、バージョンは `mise.toml` からしか来ないため、CI 側にバージョンのコピーが生まれない
- エントリポイントを 1 つに閉じるのは、mise 本体の取得・検証・キャッシュを 1 箇所で持つためである（`actions/setup-node` を採らない理由を含め [0153](0153-ci-configuration.ja.md) ランタイム供給）。workflow の `run:` から mise を直接呼ばない
- ジョブ内で `mise.toml` を **読み取り** はしてよいが、`mise.toml` 自体や `make install-tools` を CI で書き換えない

## 基本コマンド

| 操作 | コマンド |
| --- | --- |
| ツール一式のセットアップ（推奨エントリポイント） | `make install-tools` |
| mise.toml 通りに直接インストール | `mise install` |
| 現在解決されているバージョン | `mise current` |
| インストール済み一覧 | `mise ls` |
| アップデート確認 | `mise outdated` |

## バージョン更新フロー

1. `mise.toml` を編集してバージョンを書き換える
2. `mise install` （または `make install-tools`）で実体を取得
3. 動作確認の上、当該変更を PR に含める

## 禁止事項

- ❌ `mise.toml` を別の version manager で二重管理すること（SSOT が壊れる）（強制: 散文 —— **寄せられる**（`.nvmrc` / `.node-version` / `.tool-versions` の存在と、`package.json` の `packageManager` / `volta` を gate で見る。規則は無い））
- ❌ 配送層に mise コマンドを撒くこと（Dockerfile に `RUN mise install ...`、CI ジョブで `setup-mise` を経ずに `mise` を呼ぶ等）。Docker は各環境のネイティブ手段で完結させ、CI は `setup-mise` 1 箇所に閉じる（強制: 散文 —— **寄せられる**（workflow の `run:` と `docker/**/Dockerfile` に現れる `mise` の呼び出しを、`.github/actions/setup-mise` を除いて検出する。規則は無い））
- ❌ `mise.toml` に mise 固有のタスク / 環境変数定義を入れること（SSOT の純度を保つ）（強制: 散文 —— **寄せられる**（`mise.toml` を TOML として読み、`[tasks]` / `[env]` の表が無いことを gate で見る。規則は無い））
- ❌ npm パッケージを `npm:` backend で取ること。mise 経由の npm パッケージは lockfile にも `pnpm audit` にも載らず、[0001](0001-package-manager.ja.md) の単一経路と冷却期間の検疫を迂回する 2 つ目の npm 供給経路になる。Node で動くものは `pnpm add -DE` で取る（[0156](0156-browser-observation-tooling.ja.md) 取得経路）。見直すのは pnpm が冷却期間・lockfile・公開日時を返さないレジストリの拒否を提供しなくなったときだけで、「mise に寄せると SSOT が 1 つになる」は理由にならない —— バイナリと npm パッケージでは配布経路も検疫の手段も異なる（強制: 散文 —— **寄せられる**（`mise.toml` の `[tools]` のキーが `npm:` で始まらないことを gate で見る。規則は無い））
- ❌ **`mise exec -- <command>` でコマンドを包むこと（全面禁止）**。手で打つコマンド・`.lefthook.yaml` の hook・`.makefiles/` のレシピ・スクリプトのいずれでも使わない。1 コマンドに 2 通りの書き方が生まれ、どちらが正か読めなくなる。加えて、包み込みは PATH の不備をその呼び出しの中だけで覆い隠すため、包み忘れた次の呼び出し側に同じ失敗が回る（強制: 散文 —— **一部寄せられる**。`.lefthook.yaml` / `.makefiles/` / scripts / workflow の `mise exec` は綴りで落とせるが規則は無い。手で打つコマンドはコードに現れない）
- ❌ メジャーのみ・マイナーのみのバージョン指定（再現性が劣化する）（強制: 散文 —— **寄せられる**（`mise.toml` の `[tools]` の値がパッチまでの 3 つ組であることを gate で見る。規則は無い））

## 補足

- **コマンドは activate を前提に素で呼ぶ**。`make install-tools` 後に shell activate を済ませ、`node` / `pnpm` / mise 管理ツールをそのまま実行する。手で打つ場合も、`.lefthook.yaml` の hook や `.makefiles/` のレシピの中でも同じ（[0151](0151-git-hooks.ja.md)）
- 素で呼んだツールが mise の pin と食い違う、あるいは PATH に無い場合は **環境側が壊れている**。activate と PATH を直す。壊れ方の実例と復旧手順は `repo-ops` スキルが持つ
- **`mise activate` を経ない実行環境（GUI クライアントから起動した git hook / エージェントのシェル / CI）は、shims ディレクトリ（`~/.local/share/mise/shims`）を PATH に載せて揃える**（`mise activate --shims`）。解決を PATH 側で直す点は対話シェルと同じで、呼び出しごとの包み込みには落とさない
- ツールを呼ぶエントリポイント（hook / make レシピ / スクリプト）は、前段で `command -v <tool>` を確認し、無ければ `make install-tools` と activate を促して落とす。包んで動かすのではなく、環境の不足をその場で名指しする
- mise を使わない開発者は `mise.toml` の宣言を参照しつつ自分の version manager で同じバージョンを揃える運用も許容する（SSOT を仕様として読む形）
- 将来 mise から移行する場合の影響範囲は `.makefiles/tools/setup.mk` の `install-tools` ターゲットと、CI の `.github/actions/setup-mise` の 2 つ

## 関連 ADR

- [0001-package-manager.md](0001-package-manager.ja.md) — pnpm 採用方針（バージョン宣言の媒体として `mise.toml` を参照）
