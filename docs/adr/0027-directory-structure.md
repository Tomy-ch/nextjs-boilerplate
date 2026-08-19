# ディレクトリ構造

[0020](0020-adopted-architecture.md)(採用アーキテクチャ)/ [0021](0021-frontend-responsibility.md)(責務分離)で宣言した **機能スライス × 表示層カーネル** の**論理**構成を、`src/` 配下の**物理**配置として確定する。本 ADR は **物理レイアウト / path alias / co-location 方針 / 共有モジュールの粒度 / 物理ディレクトリの作成タイミング** を定める。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([0140](0140-documentation-operations.md))。本 ADR の内容自体はユーザ決定済み。日付 2026-07-12。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

[0020](0020-adopted-architecture.md) は 11 カーネル構成(`src/{app, features/<name>, model, components, adapters, capabilities, stores, config, errors, logging, observability}`。`capabilities` は [0022](0022-capabilities-kernel.md)、`stores` は [0023](0023-stores-kernel.md) で追加)と設計原則を、[0021](0021-frontend-responsibility.md) は各カーネルの責務・依存マトリクス・命名規律を宣言した。しかし「`src/` 配下に何をどの粒度で物理配置するか」「path alias をどう使うか」「テスト・スタイルをどこに置くか(co-location)」は物理配置の従属決定として未確定だった。

AGENTS.md の `[TODO] Directory Structure` が敷いていた暫定運用(新規ディレクトリ作成前にユーザ確認 / `@/*` alias 使用 / 既存 `src/app/` に載る構造)を、本 ADR が確定させる。

go-boilerplate は物理配置を **per-package co-location**(実装・テスト・README を同一パッケージに共置)+ 浅い層構成 + 昇格基準を満たしたときのみ共有パッケージへ、という方針で運用している(`pkg/README.md` / `docs/rules.md`)。本 ADR はこれを表示層へ翻案する。

## 決定

### 物理レイアウト

`src/` 直下は [0020](0020-adopted-architecture.md) の **11 カーネル**(9 + `capabilities` [0022](0022-capabilities-kernel.md) + `stores` [0023](0023-stores-kernel.md))とする(全体図・依存方向は [0020](0020-adopted-architecture.md) を正とする)。本 ADR は各カーネル**内部**の物理配置を定める。

```text
src/
├── app/                    # route-segment(page/layout/loading/error)/ route-handler(route.ts)/ metadata(robots等)。[0025]
├── features/
│   └── <name>/             # 1 feature = 1 ディレクトリ。内部は画面 × 性質で掘る(下記)
├── model/                  # 表示用 VO / フォーマッタ / 表示結果型(ActionState<T> 等)(フラット共置)
├── components/             # 横断 UI(フラット共置)
├── adapters/               # 外部接続。server/・client/ の 2 element に分割([0024]・RSC 境界)
│   ├── http/               #   両 element が従う要求の形の規則(実行文脈を持たない区画)
│   ├── server/             #   server-only(backend client・secret・config 可)
│   └── client/             #   "use client"(同一オリジン BFF fetch / WS / telemetry 送信・secret 不可)
├── capabilities/           # 横断 client hook(runtime 能力。[0022])
├── stores/                 # 横断 client 状態(複数 feature 共有の Zustand ストア。[0023])
├── config/                 # A7 実装時に作成
├── errors/                 # B6 確定時に作成
├── logging/                # B7 確定時に作成
└── observability/          # B7 確定時に作成
```

- **10 個目のカーネル `capabilities`**([0022](0022-capabilities-kernel.md))/ **11 個目のカーネル `stores`**([0023](0023-stores-kernel.md))と **`adapters` の server / client 分割**([0024](0024-adapters-server-client-split.md))を反映済み。`adapters/server`・`adapters/client` の分割は**恣意的なネストではなく、実行文脈(RSC 境界)という原理的な軸**での分割であり、co-location 規約の「むやみにネストしない」の例外ではない(feature 都合の階層化とは別物)

- `src/app/` は既存(`layout.tsx` / `page.tsx` / `globals.css`)を踏襲する。App Router セグメントの物理構造(`page.tsx` / `layout.tsx` / `loading.tsx` / `error.tsx` / `[slug]/` 等)は Next.js App Router の規約に従う(A4 と接続)
- 横断関心事カーネル(`config` / `errors` / `logging` / `observability`)の物理ディレクトリは対応決定が下りた時点で作成する(後述「作成タイミング」)

### path alias

- 層を跨ぐ import は tsconfig の **`@/*` → `./src/*`** alias を用いる(既存 `tsconfig.json` の設定を追認)。go が module path で境界を跨ぐのと同じく、alias を層間 import の標準経路とする
- **相対 import は同一 feature / 同一カーネル内(= 物理的に近いファイル間)に限る**。カーネルや feature の境界を跨ぐ相対 import(`../../model/...` 等)は用いず、`@/model/...` の形にする。これにより ESLint boundaries([0021](0021-frontend-responsibility.md) Enforcement)の element 解決も安定する

### co-location 方針

1 機能の変更が 1 スライスに閉じるよう、関連ファイルは実装の隣に共置する([0020](0020-adopted-architecture.md) が機能スライス採用の根拠とする修正の局所性(co-location)/ フラット共置基本)。

- **カーネル(`model` / `components` の各部品ディレクトリ / `stores` / `adapters` の element 内 等)はフラット共置を基本**とする。判定を持つモジュールを 1 ファイル 1 役割で並置し、サブディレクトリで種類分けしない
- **`features/<name>/` は 2 つの軸だけで掘る**。第 1 軸は**画面(リソース)**、第 2 軸は**性質**である。恣意的な階層化を避けるためであり、この 2 軸以外(種類・レイヤ名・再利用予定など)では掘らない

  ```text
  features/<name>/
  ├── README.md
  ├── facade/                 # 他 feature が import してよい唯一の面([0021])
  │   └── <part>/
  ├── ui/                     # 画面を挟まない = feature 全体が所有する部材(内部)
  │   └── <part>/
  └── <screen>/               # 第 1 軸: 画面 = リソース単位
      ├── page-content.tsx    #   取得と組み立て
      ├── query.ts            #   入力(URL / searchParams)の写し
      ├── actions.ts          #   変更(Server Action)
      ├── view.tsx            # 第 2 軸: 表示 — 画面の合成
      └── ui/                 #   表示 — その部材
          └── <part>/         #   1 部品 = 1 ディレクトリ
              ├── <part>.tsx
              ├── <part>.test.tsx
              ├── <part>.stories.tsx
              └── <part>.definition.ts
  ```

- **性質で分けるのは、性質ごとに検証手段と import 可能な先が違うから**である。取得と組み立ては `adapters` を呼び、表示は呼ばない([0021](0021-frontend-responsibility.md) 依存マトリクス)。取得は module 境界の mock を伴い、表示は DOM を伴う([0091](0091-test-verification-methods.md))。置き場が性質を表していれば、そのファイルが何を呼べて何で検証されるかを読まずに決められる
- **画面の表示は `view.tsx`(合成)と `ui/<part>/`(部材)に分ける**。`view.tsx` は `page-content.tsx` が取得した値を受けて画面を組み立てるもので、`ui/` の部品と同格ではない
- **囲んでいるディレクトリの語をファイル名・ディレクトリ名で繰り返さない**。`features/products/list/ui/card/card.tsx` であり `product-card` とはしない。区別はパスが担い、識別子は PascalCase の側が担う([0028](0028-naming-convention.md) のファイル名と主 export は別軸)
- **`ui/` の中は 1 部品 = 1 ディレクトリ**とし、実装・テスト・stories・定義・README を共置する。`components/design-system/<役割>/<部品>/` と同形であり、部品ごとに stories([0054](0054-ui-catalog-storybook.md))の置き場を確保するためにこの粒度を採る
- **深さの上限は `features/<name>/<screen>/ui/<part>/`** とする。`ui/` の中をさらに種類で掘らない。画面が部品を抱えきれなくなった場合は、`ui/` を深くするのではなく**画面(第 1 軸)を分ける**か、[0021](0021-frontend-responsibility.md) の昇格ルールで `components` へ出す
- **画面が 1 つの間は第 1 軸を省略してよい**。`features/<name>/` の直下に `page-content.tsx` / `view.tsx` / `ui/` を置く。2 つ目の画面が来た時点で画面ディレクトリへ割る
- **どの画面にも属さず feature 全体が所有するものは、画面を挟まず feature 直下の性質へ置く**(`features/<name>/ui/<part>/` 等)。これは第 3 の軸ではない。第 1 軸が「**どの画面が所有するか**」を表す以上、どの画面のものでもないものは 1 段上が所有する、という同じ軸の帰結である
  - **判定は「現に 2 つ以上の画面が使っていること」**。禁止する 再利用予定 の軸は「後で使いそう」という**予測**で先に上げることを指す。予測は外れても誰も戻さないため禁じるのであって、**観測できる現在の事実**で置き場を決めることは禁止に当たらない
  - 1 つの画面しか使っていないものは、その画面の下に置く。使う画面が 1 つに戻ったら戻す
  - **feature を跨いだ場合はこの規則の対象外**であり、[0021](0021-frontend-responsibility.md) の昇格ルールへ移る。`features ↔ features` は禁止のため、**一方の feature から他方の内部を import して解決してはならない**
  - feature 直下が部品で膨れたら、それは feature の切り方が合っていない兆候である。`ui/` を深くせず、feature を分けるか `components` へ昇格させる
- **他の feature が使うものは `features/<name>/facade/<part>/` へ置く**。ここだけが外から import してよい面であり、画面の下も feature 直下の `ui/` も内部である(条件と規律は [0021](0021-frontend-responsibility.md)「昇格できないもの」が正)
  - 置くのは**昇格先のカーネルがどれも受け取れないもの**に限る。題材の語彙を持つ UI がこれにあたる
  - **2 つ目の feature が実際に必要としたとき**に `ui/` から上げ、1 つに戻ったら下ろす
  - 深さは `features/<name>/facade/<part>/` までとし、`ui/` と同じく 1 部品 = 1 ディレクトリとする
- **テストは実装の隣に co-location する**(go `docs/rules.md` の「Co-locate tests with each layer's implementation」を翻案)。`__tests__/` への一括集約はしない。**テストファイルの拡張子・命名規約は B8(テスト戦略)で確定**する(本 ADR は配置方針のみ。`正常系` / `異常系` の日本語命名など戦略面は [0090](0090-testing-strategy.md) で go 準拠を確定済み)
- **スタイルは Tailwind ユーティリティを既定**とし([0050](0050-styling-strategy.md))、別ファイルの CSS は最小化する。グローバル CSS は `src/app/globals.css` に集約する(既存踏襲)。design token / `cn()` ヘルパの置き場は B1 で確定する
- **MSW 等のモック生成物**(triage #73 / #74・B3 orval 由来)は `src/` 外の **`mocks/`(または テストへ co-location)** に置き、生成型([0072](0072-api-type-generation.md) の do-not-edit)と分離する
- **カタログが差し替えるモジュールの実体は、対象と同じディレクトリの `__mocks__/<対象と同じ名前>` に置く**([0054](0054-ui-catalog-storybook.md))。これは種類による掘り下げではなく、差し替えの道具が名前と位置を固定するための例外であり、`facade/<part>/__mocks__/` のように深さの上限を 1 段超える形もこの理由の範囲でだけ許す。置けるのは**カタログでしか読まれない差し替え**に限り、本番の経路が import するものを置かない

### 共有モジュールの粒度

- **判定を持つモジュールは per-file を基本**とし(1 ファイル 1 役割・フラット共置)、肥大化した時点で **per-folder へ昇格**する(ネスト深化の防止)
- **UI 部品は per-folder を基本**とする。実装のほかに stories・定義・README を伴い、それらを部品ごとに共置するため(`components/design-system/<役割>/<部品>/` と `features/<name>/<screen>/ui/<part>/` が同形)
- **feature を跨いで**共有が必要になった要素は、フォルダを増やす前に [0021](0021-frontend-responsibility.md) の**昇格ルール**(`model` / `components` / `adapters` / `capabilities` / `stores` へ昇格)に従う。共有の受け皿となる汎用フォルダ(`common` / `utils` 等)は作らない([0021](0021-frontend-responsibility.md) 命名規律)
- **同じ feature の画面を跨ぐだけ**の共有は昇格の対象ではない。feature 直下へ置く(上記 co-location 方針)。**昇格も画面跨ぎも当てはまらない —— 他の feature が必要とするが、題材の語彙を持つためどのカーネルも受け取れない —— 場合だけ** `facade/` を使う([0021](0021-frontend-responsibility.md))

### 物理ディレクトリの作成タイミング

- **空ディレクトリは生やさない**([0020](0020-adopted-architecture.md))。カーネルは中身を伴う対応決定が下りた時点で作成する
  - `config` = A7 実装時 / `errors` = B6 確定時 / `logging`・`observability` = B7 確定時
- 新規ディレクトリを `src/` 直下に増設する(= 12 個目以降のカーネルを足す)には、[0021](0021-frontend-responsibility.md) の命名規律・カーネル受入基準を満たしたうえで **ADR 追補で役割を定義してから**行う(AGENTS.md 暫定「`src/` 直下の新規ディレクトリはユーザ確認」を、11 カーネルの範囲内は本 ADR で追認・範囲外は ADR 追補要、と確定)。10 個目の `capabilities`([0022](0022-capabilities-kernel.md))・11 個目の `stores`([0023](0023-stores-kernel.md))自体、この規約の発動で追加された

## 禁止事項

- ❌ 対応決定(A7 / B6 / B7)が下りる前に横断関心事カーネルの空ディレクトリを生やすこと
- ❌ テストを `__tests__/` へ一括集約すること(実装の隣に co-location する)
- ❌ feature / カーネルの境界を跨ぐ相対 import(`../../` で層を跨ぐ)。層跨ぎは `@/*` alias を使う
- ❌ feature 内を**画面(リソース)と性質以外の軸**で掘ること(種類・レイヤ名・再利用予定など。差し替えの道具が位置を固定する `__mocks__/` だけが例外 —— co-location 方針)
- ❌ `features/<name>/<screen>/ui/<part>/` より深く掘ること(画面を分けるか `components` へ昇格させる)
- ❌ カーネル内をサブディレクトリで種類分けすること(フラット共置。UI 部品の per-folder は種類分けではなく 1 部品 1 ディレクトリ)
- ❌ 11 カーネルの範囲外の新規ディレクトリを ADR 追補なしに `src/` 直下へ作ること
- ❌ 共有の受け皿となる汎用フォルダ(`common` / `shared` / `utils` / `lib` 等)を作ること([0021](0021-frontend-responsibility.md) 命名規律)
- ❌ 再輸出だけを持つ `index.ts`(barrel file)を**手で**置くこと(import 元がファイルではなくディレクトリになり、実体の所在が読めなくなる。循環参照と不要な読み込みの温床でもある。import は実体のパスを指す。**生成物は対象外** —— 生成の形は上流の道具が決めるため。実行の入口として置く `index.ts` は再輸出ではないので該当しない)

## 補足

- 本 ADR の Accepted に伴い、AGENTS.md の `[TODO] Directory Structure` 節の削除・書き換えを実施する([0021](0021-frontend-responsibility.md) の `[TODO]` 削除と併せて。未実施 — AGENTS.md は Protected Documentation のため、変更案の提示とユーザ承認を経て適用する)
- 各カーネル・各 feature への層別 README 配置は [0021](0021-frontend-responsibility.md)「層別 README 運用」を正とする。物理未作成カーネルの README は作成時(A7 / B6 / B7)に用意する

## 関連 ADR

- [0020-adopted-architecture.md](0020-adopted-architecture.md) — 11 カーネルの論理構成・全体図・依存方向(本 ADR の物理配置の親決定)
- [0023-stores-kernel.md](0023-stores-kernel.md) — 11 個目のカーネル `stores`(横断 client 状態。本 ADR の構造図に反映)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — カーネル責務・依存マトリクス・命名規律・昇格ルール(本 ADR の共有粒度・境界 import の根拠)
- [0011-no-docker.md](0011-no-docker.md) — 表示層ロール定義(PaaS / 静的 CDN 配送。物理配置がデプロイ前提と矛盾しないこと)
- [0028-naming-convention.md](0028-naming-convention.md)(A6)/ [0030-environment-variable-management.md](0030-environment-variable-management.md)(A7)— 本 ADR の物理配置の上に載るファイル・識別子命名と `config` カーネルの中身(同日 Accepted)
- BACKLOG A4(ルーティング・レンダリング)/ B1(スタイリング)/ B8(テスト戦略) — 本 ADR の物理配置の上に、App Router 構造・スタイル配置・テスト配置を具体化する枠
