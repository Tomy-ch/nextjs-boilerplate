# ライセンス選定(MIT)

本リポジトリのライセンスを **MIT** とする根拠、**OSS 寄与ポリシー**、**同梱ライブラリとのライセンス整合**、および `package.json` の `private` フラグとの関係を定める。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([決定 5](../plan/pre-implementation-decisions.md))。本 ADR の内容自体はユーザ決定済み(Tier 6 / D3)。日付 2026-07-13。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

`LICENSE` ファイル(MIT / Copyright (c) 2026 Tomy-ch)は既に存在するが、「**なぜ MIT を選んだか**」「OSS 寄与を受け入れる際の方針」「同梱ライブラリのライセンス整合」が未文書化だった(BACKLOG D3 = ⚠️)。本 ADR がその根拠と運用方針を成文化する。

前提:

- 本リポジトリは **fork / テンプレートとして複製されることを目的とした表示層 boilerplate**([0011](0011-no-docker.md))であり、npm パッケージとして配布・`install` される性質ではない
- 同階層の **go-boilerplate も MIT**(Copyright (c) 2026 Tomy-ch)であり、姉妹リポジトリとライセンスが統一されている(本リポの「go-boilerplate の実体に準拠」方針とも整合)
- 依存ライブラリの許容ライセンスは既に [0004](0004-library-management.md) が規定済み(MIT / Apache-2.0 / BSD-3-Clause / ISC / 0BSD のみ許可、GPL / AGPL / SSPL / 不明は不可)

## 決定

### 1. ライセンス = MIT

- 本リポジトリのライセンスは **MIT** とする。根拠:
  - **最大限の許容性**: 商用・改変・再配布・sublicense を制約なく許可し、boilerplate を fork して任意の用途(商用含む)に使う目的に最も適う
  - **エコシステム標準**: Next.js・React をはじめ本リポの依存の大半が MIT / permissive であり、フレームワーク文化と摩擦がない
  - **姉妹リポジトリとの統一**: go-boilerplate も MIT。同一著者の boilerplate 群でライセンスを揃える
  - **低儀式性**: CLA・コピーレフトの義務を持ち込まず、テンプレート用途の障壁を最小化する
- Apache-2.0(特許条項)や BSD 系との比較でも、追加条項の要否がない本用途では MIT の簡潔さを優先する

### 2. OSS 寄与ポリシー = inbound = outbound(CLA なし)

- コントリビューションは **inbound = outbound**(投稿された貢献は成果物と同じ **MIT** の条件でライセンスされる)を既定とする。**別途の CLA / 著作権譲渡は要求しない**
- 著作権はコントリビュータが保持し、MIT の許諾のもとにリポジトリへ提供される形とする。`LICENSE` の Copyright 表記(`Tomy-ch`)は原著作者表記であり、貢献者の著作権を否定しない
- DCO(Developer Certificate of Origin)署名の要否は現時点で必須化しない(必要になれば別途 `CONTRIBUTING.md` で規定 = 用途依存の運用強化)

### 3. 同梱ライブラリとのライセンス整合

- MIT で再配布可能であることは、**依存が permissive ライセンスに限られること**に依存する。この整合は [0004](0004-library-management.md) の許可リスト(MIT / Apache-2.0 / BSD-3-Clause / ISC / 0BSD)が担保する
- **コピーレフト(GPL / AGPL / LGPL 動的リンク以外)・SSPL・ライセンス不明の依存を混入させない**([0004](0004-library-management.md) 禁止事項)。これらは MIT 配布と両立しないため、依存追加時のライセンスチェックで排除する
- 個々の依存の帰属表記(attribution)保持義務は各ライブラリのライセンスに従う(本リポの `LICENSE` はリポジトリ自身の著作物に対するもの)

### 4. `package.json` の `private: true` と MIT の関係

- `package.json` は **`"private": true`** であり、これは **npm レジストリへの誤 publish を防ぐガード**である。boilerplate は npm 配布物ではなく clone / fork して使うテンプレートであるため、publish を意図的に無効化している
- `private: true`(npm 公開の抑止)と MIT(ソースの複製・改変・再配布の許諾)は**別レイヤの関心事**であり両立する。MIT は本リポのソースを fork / 複製する権利を付与し、`private` は npm パッケージとしての配布経路を閉じるだけである
- **[TODO / follow-up]** 現状 `package.json` に `license` フィールドが無い。SPDX 準拠のツール可読性のため `"license": "MIT"` を追加するのが望ましいが、`package.json` はルート設定ファイル(AGENTS.md AI Modification Scope で保護)のため、**ユーザ指示のもとで別途追加**する(本 ADR では現状を記録し、追加を推奨するに留める)

### 5. fork 先の application ライセンス

- fork 先が本 boilerplate を土台に構築する **application 自体のライセンスは fork 先の判断**とする(out of scope)。MIT は派生物の再ライセンスを許すため、fork 先は自プロジェクトに任意のライセンスを付与できる。ただし MIT の条件により、**boilerplate 由来部分の著作権表記・許諾表記の保持**が求められる点は Next.js 等の依存と同様に扱う

## 禁止事項

- ❌ コピーレフト(GPL / AGPL / SSPL 等)・ライセンス不明の依存を追加すること([0004](0004-library-management.md)。MIT 配布と両立しない)
- ❌ CLA / 著作権譲渡を貢献の必須条件として持ち込むこと(inbound = outbound を既定とする。強化は `CONTRIBUTING.md` で別途合意)
- ❌ `private: true` を「MIT を無効化するもの」と解釈すること(publish ガードとライセンス許諾は別レイヤ)
- ❌ `LICENSE` の Copyright 表記・許諾文を無断で除去・改変すること(Protected Documentation。[0140](0140-documentation-operations.md))

## 関連 ADR

- [0004-library-management.md](0004-library-management.md) — 依存ライセンス許可リスト(MIT 配布との整合を担保)
- [0011-no-docker.md](0011-no-docker.md) — fork / テンプレート用途の表示層ロール(MIT 選定の背景)
- [0140-documentation-operations.md](0140-documentation-operations.md)(D1)— `LICENSE` は Protected Documentation / per-package 帰属の運用
