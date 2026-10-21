> **このファイルは [`0142-license.md`](0142-license.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `0142-license.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `0142-license.md` だけです。このファイルは人間が読むための翻訳です。

# ライセンス選定(MIT)

本リポジトリのライセンスを **MIT** とする根拠、**OSS 寄与ポリシー**、および `package.json` の `private` フラグとの関係を定める。

## Status

Accepted

## 背景

前提:

- 本リポジトリは **テンプレートとして複製されることを目的としたプレゼンテーションレイヤー boilerplate**([0011](0011-no-docker.ja.md))であり、npm パッケージとして配布・`install` される性質ではない

## 決定

### 1. ライセンス = MIT

- 本リポジトリのライセンスは **MIT** とする(`LICENSE`: Copyright (c) 2026 Tomy-ch)。根拠:
  - **最大限の許容性**: 商用・改変・再配布・sublicense を制約なく許可し、本リポジトリを複製して任意の用途(商用含む)に使う目的に最も適う
  - **エコシステム標準**: Next.js・React をはじめ本リポの依存の大半が MIT / permissive であり、フレームワーク文化と摩擦がない
  - **低儀式性**: CLA・コピーレフトの義務を持ち込まず、テンプレート用途の障壁を最小化する
- Apache-2.0(特許条項)や BSD 系との比較でも、追加条項の要否がない本用途では MIT の簡潔さを優先する

### 2. OSS 寄与ポリシー = inbound = outbound(CLA なし)

- コントリビューションは **inbound = outbound**(投稿された貢献は成果物と同じ **MIT** の条件でライセンスされる)をデフォルトとする。**別途の CLA / 著作権譲渡は要求しない**
- 著作権はコントリビュータが保持し、MIT の許諾のもとにリポジトリへ提供される形とする。`LICENSE` の Copyright 表記(`Tomy-ch`)は原著作者表記であり、貢献者の著作権を否定しない
- DCO(Developer Certificate of Origin)署名は必須化しない(必要になれば別途 `CONTRIBUTING.md` で規定 = 用途依存の運用強化)

### 3. `package.json` の `private: true` と MIT の関係

- `package.json` は **`"private": true`** であり、これは **npm レジストリへの誤 publish を防ぐガード**である。本リポジトリは npm 配布物ではなく、テンプレートとして複製して使うものであるため、publish を意図的に無効化している
- `private: true`(npm 公開の抑止)と MIT(ソースの複製・改変・再配布の許諾)は**別レイヤの関心事**であり両立する。MIT は本リポのソースを複製・改変・再配布する権利を付与し、`private` は npm パッケージとしての配布経路を閉じるだけである
- `package.json` は SPDX 準拠のツール可読性のため **`"license": "MIT"`** を持つ。`private: true` と併記して矛盾しない(上記のとおり別レイヤ)

### 4. application 自体のライセンス

- ここを土台に構築する **application 自体のライセンスは用途依存**とする(out of scope)。MIT は派生物の再ライセンスを許すため、自プロジェクトに任意のライセンスを付与できる。ただし MIT の条件により、**boilerplate 由来部分の著作権表記・許諾表記の保持**が求められる点は Next.js 等の依存と同様に扱う

## 禁止事項

- ❌ CLA / 著作権譲渡を貢献の必須条件として持ち込むこと(inbound = outbound をデフォルトとする。強化は `CONTRIBUTING.md` で別途合意)（強制: 持たない —— 採らない決定。CLA・著作権譲渡の仕組みは置かれておらず、入れる変更は `CONTRIBUTING.md` と運用の追加として diff に現れる）
- ❌ `private: true` を「MIT を無効化するもの」と解釈すること(publish ガードとライセンス許諾は別レイヤ)（強制: 散文 —— **寄せられない**。フラグの解釈は読み手の理解の問題で、コードに現れない）
- ❌ `LICENSE` の Copyright 表記・許諾文を無断で除去・改変すること(Protected Documentation。[0152](0152-agents-md-policy.ja.md) / AGENTS.md)

## 関連 ADR

- [0011-no-docker.md](0011-no-docker.ja.md) — テンプレート用途のプレゼンテーションレイヤーロール(MIT 選定の背景)
- [0152-agents-md-policy.md](0152-agents-md-policy.ja.md) / AGENTS.md — `LICENSE` は Protected Documentation(直接編集禁止)
- [0140-documentation-operations.md](0140-documentation-operations.ja.md) — per-package README 運用
