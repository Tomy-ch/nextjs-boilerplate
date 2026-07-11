# Pre-commit / Pre-push hook 運用方針

本プロジェクトでは、ローカル開発における自動検査の枠組みとして **lefthook** を採用する。
hook の役割は「壊れた状態を CI に到達させない第一段の防御」とし、CI を権威ある最終ガードとする二重化構造を取る。

## Status

Accepted

## 採用理由 / 目的

- ローカルで lint / format / 型エラーを早期検出し、CI 失敗による待ち時間を削減する
- 「commit / push してから気づく」を構造的に減らす
- 設定ファイル (`.lefthook.yaml`) で hook の挙動を SSOT 化し、`.git/hooks/` への直接書き込みや個別 shell スクリプトの散在を避ける
- boilerplate として fork 先が「最初から品質ゲートが動く」状態を引き継げるようにする

## 採用ツール

[lefthook](https://github.com/evilmartians/lefthook) を採用する。

インストールは npm devDependency 経由 (`pnpm add -D lefthook`)。バージョンは exact pin とする (Toolchain-0005 のコア dev ツール扱い)。

### lefthook を選んだ理由

| 観点 | lefthook | husky |
| --- | --- | --- |
| 設定 | YAML 1 ファイル | shell script ファイル群 |
| 並列実行 | `parallel: true` で標準対応 | 自前で実装 |
| 配布 | npm package 内に単一バイナリ同梱 | node スクリプト |
| 起動コスト | Go 実装で高速 | shell + node |

設定の集約と起動コストの観点で lefthook を採る。`.git/hooks/` への symlink 配置は `pnpm exec lefthook install` で行い、配置自体も再現可能にする。

## hook 段階の責務分担

| 段階 | 目的 | 想定処理 | 速度目標 |
| --- | --- | --- | --- |
| pre-commit | 「壊れた diff を commit に乗せない」 | `pnpm lint` (biome check) / staged ファイルの format チェック | < 5 秒 |
| pre-push | 「壊れた push を上げない」 | 型チェック (`pnpm exec tsc --noEmit`) / テスト (整備後) | < 30 秒 |
| (CI) | 権威ある検査 | lint / 型 / test / build / e2e 等 | 制約なし |

### 設計原則

- **pre-commit は速さ優先**。重い処理 (テスト全件 / `pnpm build` / e2e) は入れない
- **pre-push は中速まで許容**。push の機会は commit より少ないため
- **CI が権威**。hook は「早く気づく」ための補助層であり、hook 通過 = 正しい状態ではない
- **重複は意図的**。hook と CI で同じ lint を走らせる二重化は冗長ではなく仕様

### なぜ pre-commit に build を入れないか

Next.js の build (`pnpm build`) はキャッシュが効いても数秒〜数十秒かかる。commit のたびにこれを走らせると hook が「邪魔」となり、`--no-verify` の常用を誘発する。build 相当の最終検査は CI に委ねる。

## bypass ポリシー

### 通常運用

- `git commit --no-verify` / `git push --no-verify` の **常用は禁止**
- やむを得ず bypass した場合は、**直後に同等の検査を手動で実行** する (`pnpm lint` / `pnpm exec tsc --noEmit`)

### 例外: 関連コミットの分割時

1 PR に複数の論理変更を分けて積む過程で「ロジック未完了の中間 commit を一時的に乗せたい」場合は、各個別 commit で `--no-verify` を使ってよい。

ただし以下を守る:

- PR 内のすべての commit を積み終わった時点で、**必ず 1 回 hook 相当の検査をローカルで通す** (`pnpm lint && pnpm exec tsc --noEmit`)
- 「途中の commit が壊れていてもよい」のはあくまでローカル中間状態。push の時点では pre-push が動くため、最終的に検査される

### 禁止される bypass

- ❌ `--no-verify` を shell alias / git alias / IDE デフォルトに組み込むこと
- ❌ CI で hook 相当の検査をスキップすること (CI は権威であり、bypass されてはならない)
- ❌ `.lefthook.yaml` の commands を一時的にコメントアウトして commit すること

## CI との関係

| 役割 | hook | CI |
| --- | --- | --- |
| 失敗時の挙動 | ローカルで止まる | PR が merge できない |
| 権威性 | 補助 | 権威 |
| 設定の所在 | `.lefthook.yaml` | `.github/workflows/` |
| skip 可否 | bypass 可 (例外運用のみ) | bypass 不可 |

- hook と CI で **同じコマンド** (例: `pnpm lint`) を呼ぶ。ローカル ↔ CI で振る舞いを揃える
- hook がローカルでスキップされても CI が拾うため、最終的な品質ガードは CI 側に依拠する
- hook が「うざくて誰も使わない」状態は CI 単独運用と同義であり、避けるべき。本 ADR の速度目標を守ること

## インストールと初期化

```bash
pnpm install                  # devDependency として lefthook が入る
pnpm exec lefthook install    # .git/hooks/ に symlink を配置
```

`postinstall` で `lefthook install` を自動実行する選択肢もあるが、CI / Docker ビルド時に不要な hook 配置を避けるため、本リポジトリでは **明示的に `lefthook install` を呼ぶ** 設計とする。README に手順を記載すること。

## 設定の最小構成

`.lefthook.yaml` の最小構成は以下の形を基準とする。

```yaml
pre-commit:
  parallel: true
  commands:
    lint:
      run: pnpm lint

pre-push:
  commands:
    typecheck:
      run: pnpm exec tsc --noEmit
```

### 改変ルール

具体的な commands の追加・更新は本 ADR の改訂を伴わずに行ってよい (粒度的な調整であり、方針そのものではないため)。ただし以下の改変は **ADR 改訂を要する** :

- 段階責務 (pre-commit / pre-push) の再定義
- bypass ポリシーの緩和
- lefthook 以外のツールへの移行
- 速度目標 (pre-commit < 5 秒、pre-push < 30 秒) の引き上げ

## 禁止事項

- ❌ pre-commit に重い処理 (`pnpm build` / e2e / 全テスト) を入れること
- ❌ `--no-verify` を git alias / shell alias / IDE 設定で恒常化すること
- ❌ CI 側で hook 相当の検査をスキップすること
- ❌ `.git/hooks/` 配下に直接 shell script を書き込むこと (lefthook 経由のみ)
- ❌ hook 設定を `.lefthook.yaml` 以外のファイル (script / Makefile 等) に分散させること
- ❌ lefthook 自体のバージョンを caret (`^`) で指定すること (Toolchain-0005 のコア dev ツール方針に従い exact pin)

## 補足

- 「hook はあると邪魔、ないと事故」のジレンマを、**速い hook + 権威ある CI** の二重化で解く方針
- lefthook 設定の具体内容 (どの段階でどの command を走らせるか) はリポジトリの肥大化に応じて調整する
- hook の存在は README で利用者向けに案内する (`pnpm exec lefthook install` の必要性)
- 旧運用との差分: 過去は `.git/hooks/` に shell script を直接置く時期もあり得たが、本 ADR 採用以降は lefthook 経由でのみ管理する

## 関連 ADR

- [0002-formatter-linter.md](0002-formatter-linter.md) — `pnpm lint` で実際に呼ばれる biome の設定方針
- [Toolchain-0005-library-management.md](Toolchain-0005-library-management.md) — lefthook を devDependency として exact pin する根拠
- [Dev-0002.md](Dev-0002.md) — hook 通過後の commit / PR / リリース運用フロー
