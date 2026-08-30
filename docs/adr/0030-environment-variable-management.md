# 環境変数管理

[0020](0020-adopted-architecture.md) / [0021](0021-frontend-responsibility.md) で枠を予約した **`config` カーネル** の中身を確定する。環境変数の **検証(いつ・どこで)/ 型付き config の形(目的別・単一オブジェクトを作らない)/ 配布メカニズム / `NEXT_PUBLIC_` 境界(server / client 分割)/ 受け手側の実装パターン / 周辺ルール** を定める。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([0140](0140-documentation-operations.md))。本 ADR の内容自体はユーザ討議「A7 の翻案方針」で確定済み。日付 2026-07-12。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

go-boilerplate は env を **三点セット**(`envspec.go` = env→struct マッピング / `model.go` = 非公開フィールド + getter の Config / `config.go` = 起動時 parse + validate)で管理し、**immutable fail-fast**(起動時に一度だけロード・検証、setter なしの不変 `*Config`。go `adr/0036`)、**default-vs-required 統治**(`envDefault` = code default immutable / `required` = 全 env ファイルで必須。go `adr/0035`)、**Secret ラベル**(required / recommended。`env/README.md`)、**SubConfig**(サブシステム別の typed loader で必要フィールドのみ注入。go `adr/0034`)を確立している。

これをフロントへそのまま持ち込むと、**エンドユーザーに env 検証・焼き込みのリードタイムを払わせる**懸念、および **既定の env 取得結果が書き換え可能なオブジェクトになる**懸念が生じる。本 ADR はこの 2 点を解いた設計を確定する(討議経緯・要件の正は計画書「A7 の翻案方針」節)。

AGENTS.md の `[TODO] Environment Variable Management` が敷いていた暫定運用(env 変数追加はユーザ確認 / `.env*` 直読せず `process.env` 標準に従う / secret を `NEXT_PUBLIC_` に露出しない)を、本 ADR が確定させる。

## 決定

### 1. 検証(全量・ユーザ非負担)

- **全 ENV を検証対象にする(`NEXT_PUBLIC_` か否かを問わず)**。スキーマは**目的別**に定義し(§2)、server / client 両変数を含めて**全量を**検証する(目的別でも検証漏れを作らない)
- 検証の実行点は **2 箇所のみ**:
  - **ビルド時** — `next.config.ts` からスキーマを import して全量評価する。欠落・不正はビルド失敗とする
  - **サーバ起動時 1 回** — `instrumentation.ts` の `register()` で config モジュールを import する(= モジュール評価 = 検証)。serverless ではインスタンスのコールドスタート毎に 1 回走る
- **リクエスト経路・ブラウザでは検証を実行しない**。リクエストハンドラ内での parse、Client Component での実行時 config fetch は**アンチパターンとして禁止**する。これによりエンドユーザーに検証・焼き込みのコストを載せない(go の「起動時一度だけ」を、フロントの起動 / ビルド境界へ写像)

### 2. 型付き config(不変・目的別 / 単一オブジェクトを作らない)

- **単一の巨大 Config オブジェクトは作らない**。config は**目的(サブシステム)ごと**に独立した typed・不変モジュールとして作る(例: `authConfig` / `apiConfig` / `analyticsConfig`)。各受け手は**自分の目的の config だけ**を import する。これは go `adr/0034` SubConfig「必要フィールドのみ注入」の徹底であり、「1 つの Config を getter でスライス」ではなく **目的ごとに独立モジュール**とする(blast radius 最小化・tree-shaking・composition-root の明確化)
- 各 config は **`#` private フィールド + getter のみの不変オブジェクト**とする(go `model.go`)。`#` private は実行時にも不可触なので `Object.freeze` 不要。setter は持たない。テスト以外での再生成を禁止する(plain object を公開面にする場合のみ deep freeze を必須)
- **`process.env` の直読は `src/config/` 配下(目的別 config モジュール群)のみ**に限る。**biome の `noProcessEnv` で機械強制**する([0002](0002-formatter-linter.md) の能力ベース原則。config ディレクトリのみ override で除外)。go が「env source は config パッケージに閉じる」のと同型
- **各目的 × server / client の分割**: 各目的 config は、含むフィールドの種別で **server config**(secret を含む)と **client config**(NEXT_PUBLIC のみ)に分ける。1 目的は server / client の**片方または両方**を持つ(例: `analytics` = 公開 ID〈client〉+ 送信キー〈server〉)
  - server config(`src/config/<purpose>.server.ts` 等)— 先頭に `import "server-only"` を置き、client バンドルへの混入をビルド時に遮断する。secret を含む runtime object
  - client config(`src/config/<purpose>.client.ts` 等)— **`NEXT_PUBLIC_` の静的ドット参照のみ**で構成する(`process.env.NEXT_PUBLIC_FOO` の形)。動的アクセス・分割代入はビルド時のリテラル置換が効かないため**禁止**する
- `NEXT_PUBLIC_` はビルド時に参照箇所ごとの**リテラルへインライン置換**される(公開定数。ブラウザ側は構造的に書き換え不能)。client config は「インラインリテラルの typed view」であって **runtime object ではない**。したがって import 境界の制限(§3)がかかるのは **server config(runtime object・secret)のみ**で、client config は client 側の層が自由に import してよい

### 3. 配布(DI コンテナの代替)

- 配布メカニズム = **ESM モジュールキャッシュによるシングルトン**(1 プロセス 1 評価。import した全員が同一の不変インスタンスを取得)。go の Fx DI provide/inject を、モジュールスコープでの組み立て + import に写像する
- DI の統制部分 = **import 境界ルール**。**server config(secret を持つ runtime object)を import してよいのは、その目的の `adapters/server`(+ 起動 / ビルド境界)のみ**([0021](0021-frontend-responsibility.md) 依存マトリクスと一致)。内側の層は server config でなく**値を引数で受け取る**(go「domain は config を知らない」の維持)。※ client config(NEXT_PUBLIC インラインリテラル)は runtime object でなく公開定数のため、client 側の層(`adapters/client` / `capabilities` / Client Component)も import 可
- 起動 / ビルド境界(`instrumentation.ts` / `next.config.ts` / `app/metadata`〈[0025](0025-app-layer-elements.md)〉/ `proxy.ts`〈Edge 互換 config スライス。[0043](0043-middleware-policy.md)〉)は 11 カーネルの外側の専用 element として server config import を許す([0021](0021-frontend-responsibility.md) 起動 / ビルド境界の例外)
- **目的別 config = go `adr/0034` SubConfig の徹底**(getter スライスでなく独立モジュール)。各 adapter の factory は自分の目的の config だけを import して singleton を組む(mini composition root)。全目的 config の集約入口(`config.auth` 等の単一 facade)は**作らない**

### 4. default-vs-required 統治(go `adr/0035` 翻案)

- **Code default(immutable)** — スキーマ側にデフォルト値を持つ変数。env ファイルから省略でき、フレームワーク的な普遍値に用いる(go の `envDefault` タグ相当)
- **Required(variable)** — 各環境で必ず与える変数。欠落は検証失敗(起動 / ビルド abort)とする(go の `required` タグ相当)
- 選択ルール: プロジェクト固有・環境ごとに変わる値 → required / 普遍的な値 → code default(go `adr/0035` の判定を写経)

### 5. Secret 境界(go `env/README.md` 翻案)

- 変数に **Secret 管理ラベル**を付す:
  - **Secret management required** — 本番では secret manager / PaaS の secret store から供給する。平文 `.env` にコミットしない
  - **Secret management recommended** — 定期ローテーション推奨
- **secret を `NEXT_PUBLIC_` に置くことを禁止**する(`NEXT_PUBLIC_` はブラウザへ露出する)。secret は必ず server 専用変数とする

### 6. env ファイルと供給(0011 no-Docker との整合)

go は env ファイルを Docker ビルド時に binary へ embed するが、本リポジトリは [0011](0011-no-docker.md)(no-Docker / PaaS・静的 CDN 配送)のため embed 機構は成立しない。以下へ翻案する:

- **`process.env` への供給は Next.js 標準の `.env*` ロード**に委ねる(AGENTS.md 暫定「`.env*` を直読せず Next.js 標準 `process.env` に従う」を維持)。config モジュールがその `process.env` を読む唯一の場所となる(決定 2)
- **本番の secret / 環境別値は PaaS(Vercel / Amplify 等)の env・secret store から供給**する([0011](0011-no-docker.md) の配送前提)。平文ファイルへコミットしない
- ドキュメントは **2 本立て**とし、正の範囲を分ける。同じ内容を二重に書かない:
  - **`env/README.{md,ja.md}` = 環境変数の存在の正**。この環境で定義される全変数を **変数表**(go `env/README.md` の書式 `Variable Name | Description | Type | Example | Notes` を翻案)で維持する。値がプレースホルダのみの変数も、アプリが config 経由で読まない変数(標準名で外部 SDK が直接読むもの等)も、存在する限りここに載る
  - **`config` カーネルの README = 設定値の解説の正**(A7 実装 PR で作成。[0021](0021-frontend-responsibility.md) 層別 README 運用)。**ビルド時に検証され、構築時に各 purpose モジュールへ流し込まれる設定値**について、purpose 区分・server / client 境界・required と code default の別・受け手側の使い方を説明する
  - 変数の**存在**は env 側、設定値の**意味と扱い**は config 側が持つ。config に載るのは env 側の部分集合である
- **env 変数の追加はユーザ確認を要する**(AGENTS.md 暫定を維持)
- **環境の選択子 `APP_ENV` は指定を必須とする**。未指定は「読み込むファイルを選べない」状態として起動 / ビルドを失敗させ、**既定値へ落とさない**。既定を持たせると、`APP_ENV` の設定を忘れた実環境が同梱の `env/.env.local` を読み、注入し忘れた変数だけが手元向けの値で埋まった状態で起動する。同梱の秘密値を許すか、開発専用の口を開くかという判断も同じ選択子を見るため、既定値は「未設定」を安全側へ倒せなくする
- **`local` を渡すのは開発の入口だけ**とする(`pnpm dev` / `pnpm storybook` / `pnpm build-storybook` の script)。配信物を作る `pnpm build` / `pnpm start` は既定を持たず、供給側(PaaS / CI)が必ず宣言する

### 7. 受け手側の実装パターン(目的別 config の受け手)

go の「コンストラクタが SubConfig を受け取る」1 パターンは、Next.js では受け手により分かれる(目的別 config = §2):

| 受け手 | 受け取り方 | config 型への依存 |
| --- | --- | --- |
| 境界アダプタ(`adapters/server` の fetch wrapper / API クライアント等。[0024](0024-adapters-server-client-split.md)) | モジュールスコープで**その目的の server config**を factory に注入し singleton を組む(mini composition root)。factory は自前の引数型のみ知り config 非依存 | あり(server config の**唯一の許可層**) |
| feature 内の画面 RSC / Route Handler(`app/route-handler`)/ Server Action(`features/*/actions.ts`) | 組み立て済みアダプタ(`adapters/server`)を import して使うだけ。server config 直接参照禁止(`app/route-segment` = `page.tsx` は features を呼ぶ薄い呼び口で adapters も直接触らない) | なし |
| **metadata routes**(`app/metadata` = `robots.ts` / `sitemap.ts` / `manifest.ts` 等。[0025](0025-app-layer-elements.md)) | 起動 / ビルド境界の element として **その目的の config を直接 import 可**(site URL / env 別 noindex 等) | あり(起動 / ビルド境界) |
| 内側ロジック(`model` / feature 内の編成部 = go domain・usecase 相当) | 値を引数で受領(出所 = env を知らない)。呼び出し側が server config から値を剥がして渡す | なし |
| Client Component / hooks / `adapters/client` / `capabilities`([0024](0024-adapters-server-client-split.md) / [0022](0022-capabilities-kernel.md)) | **その目的の client config**(NEXT_PUBLIC インラインリテラル)を import(secret 不可・runtime object でないため境界制限なし) | client 側のみ |

- 対応関係: Fx の provide → inject = モジュールスコープでの組み立て → import。「domain は config 不可視」= 引数渡し + import 境界強制([0021](0021-frontend-responsibility.md) の Enforcement で機械化)
- **禁止則**: RSC から Client Component へ **server config の値を props で渡さない**(RSC ペイロードとして HTML に直列化されブラウザへ漏れる)。client が要る値は最初から `NEXT_PUBLIC_` で**その目的の client config** に置く

### 8. 漏洩防御(2 段構え)

- **`import "server-only"`** を server config の必須ガードとする(確実・安定)
- **React taint API**(`experimental_taintObjectReference` / `experimental_taintUniqueValue`)を **v1 で採用する**。有効化範囲は全環境とする

#### taint を experimental のまま採る根拠(例外)

有効化(`next.config.ts` の `experimental.taint`)は、Next.js が client へ配る React を stable から **experimental チャンネルのビルドへ差し替える**(`needsExperimentalReact()`)。実測では client chunk の React が `19.3.0` から `19.3.0-experimental-<date>` へ変わり、呼び出しを 1 つも書かない状態で**全 route 一律 +6.3 KB gzip** になる。それでも採るのは次の 2 点による。

- **実装が React 本体そのものである**(第三者の実験的ライブラリではない)
- **本体側に taint を明示的に扱う資料がある**(react.dev の両 API のリファレンス、および Next.js の `data-security` ガイドが利用を案内している)

**dev / CI だけで有効化する道は採らない。** 本番から experimental を外せる代わりに「検証する React と配る React が違う」という別の不整合を作るためである。

#### 構造では代替できない理由

取得の口を投影必須の形にしても、**恒等射影(`to: (w) => w`)が残る**。これは逸脱ではなく「画面が欲しい形と応答が同じ」ときに書かれる自然な形であり、構造でできるのは「正しく書けば守れる」までで機構ではない。

#### 位置づけ —— 主機構ではなく補助防御

taint は [0112](0112-data-classification-cache-boundary.md) の**段 4(client 送信前)**であり、PII 防御の主機構ではない。主防御は取得範囲の最小化・キャッシュ能力の制限・request scope・Client DTO の最小化であり、taint はそれらを抜けた誤送信を実行時に捕まえる。**参照でしか追えず、コピーと派生値には及ばない**。

#### 実装

- **口は `adapters/server/taint/taint.ts` の 1 つ**。アプリのコードは `react` の experimental API を直接呼ばない。テストはこのモジュール境界を差し替え、**本物が効くことはこの口自身のテスト**が Next.js 同梱の experimental React と RSC 直列化器で確かめる。防御の中に「口があれば呼ぶ」分岐は置かない(口が消えた日に検査ごと黙って外れるため)
- **テストの React 解決** —— 全体の alias は動かさない(client 側のテストが stable を要る)。taint の口のテストだけが、Next.js 同梱の experimental build を CJS の名前解決ごと差し替えて読む。位置は `next` の package から辿る(`experimental-react.fixture.ts`)
- **文字列の秘密の登録場所** —— 読む側に置く。`config` は `imports-allowed: []` を宣言しており react を持ち込めない。署名鍵は `adapters/server/auth/resolver.ts` が登録し、登録の寿命は値を持つ singleton(`AuthConfig`)が握る
- **汚す対象と粒度** —— **値が生まれる場所で、その object 1 つを汚す**。session の記録は復元した直後に汚す。入れ子は追わない —— 参照でしか追えない以上、粒度を細かくしても抜ける経路(コピー・派生値)は塞がらず、主防御は取得範囲と Client DTO の最小化が持つ
- **爆破対象外**([0112](0112-data-classification-cache-boundary.md) 決定 7)。サンプル API 固有ではなく Server / Client 境界そのものを守る

#### 例外の解消条件

`experimental_taint*` が stable の React に入り、有効化が channel 切替を伴わなくなったとき、本 ADR から例外の記述を落とす。判定は機械的に行える。

```text
node -e "console.log(Object.keys(require('react')).filter(k=>/taint/i.test(k)))"
[]                                               → 例外の適用中
[ 'taintObjectReference', 'taintUniqueValue' ]   → 例外の解消
```

## 周辺ルール(他 ADR への引き渡し)

- **再デプロイなしで変えたい値**は env に置かず **BFF runtime config へ逃がす**(例外扱い・キャッシュ必須・ユーザー体感レイテンシに載せない)。逃し先の具体設計(エンドポイント / キャッシュ方式)は **[0071](0071-bff-api-integration.md)(BFF / API 統合)の責務**として引き渡す([0071](0071-bff-api-integration.md) と相互参照)
- **`NEXT_PUBLIC_` の表面積は最小化**する(変更 = 再ビルドのリードタイムが必ず発生するため)
- **SSG / ISR ページ内で読んだ server env はプリレンダー結果に凍結**される。**[0040](0040-routing-rendering-strategy.md)(レンダリング戦略)** と相互参照を置く
- **`proxy.ts`**(Next.js 16 の旧 Middleware)は既定 Node.js runtime だが、最適化時に CDN(Edge 相当)配置され得るため **Node API 非依存の config スライス**が別途要るかが **C6([0043](0043-middleware-policy.md) Middleware/Proxy 方針)** と交点。**この Edge 互換 config スライスの所有は本 ADR(0030 = config カーネル)** とし、具体(スライス分割の要否・形)は実装 PR で確定する([0043](0043-middleware-policy.md) とは相互参照)
- **テスト**: 凍結インスタンスの変異ではなく **env スタブ + factory 再生成**(`new ServerConfig(stubEnv)`)で行う(go `config_testing_setter` の翻案。本番コード使用禁止の但し書きを維持)。本 ADR は「スタブ + factory 再生成」の方針を定め、具体 API は B8([0090](0090-testing-strategy.md))で **Vitest の `vi.stubEnv`** に確定済み

## 禁止事項

- ❌ リクエストハンドラ内 / Client Component での実行時 env 検証・parse
- ❌ `process.env` を config モジュール以外から直読すること(biome `noProcessEnv` で強制)
- ❌ 各 config オブジェクトに setter を持たせる / テスト外で再生成すること / 全目的を束ねる単一 facade を作ること
- ❌ `client.ts` での `NEXT_PUBLIC_` 変数の動的アクセス・分割代入(ビルド時置換が効かない)
- ❌ secret を `NEXT_PUBLIC_` に置くこと
- ❌ `APP_ENV` の未指定を既定値へ落とすこと(ファイル選択・秘密値の判定・開発専用の口のいずれにおいても)
- ❌ RSC から Client Component へ server config 値を props で渡すこと
- ❌ **server config**(secret を含む runtime object)を `adapters/server`・起動 / ビルド境界以外の層から import すること([0021](0021-frontend-responsibility.md)。client config〈NEXT_PUBLIC インラインリテラル〉は client 側の層から import 可 — §2 / §3)

## 補足

- 本 ADR の Accepted に伴い、AGENTS.md の `[TODO] Environment Variable Management` 節の削除・書き換えを実施する(他 A 系 ADR の `[TODO]` 削除と併せて。未実施 — AGENTS.md は Protected Documentation のため、変更案の提示とユーザ承認を経て適用する)
- **スキーマライブラリの選定は実装 PR に委ねる**。本 ADR は「目的別スキーマで全 ENV を型定義・検証する(目的別でも全量検証)」という**アーキテクチャ**のみを確定し、具体ライブラリ(計画書の暫定候補は **zod**。他に valibot / arktype 等)は [0004](0004-library-management.md) の採用フロー(exact pin + `pnpm audit`)で A7 実装 PR にて確定する。ライブラリ名で本 ADR を固定しない
- 本 ADR は `config` カーネルの**方針**を定める。物理実装(`src/config/{server,client}.ts` + スキーマ + 変数表 README + `instrumentation.ts` / `next.config.ts` の検証呼び出し + biome `noProcessEnv` の有効化と config モジュール override 除外([0002](0002-formatter-linter.md)「有効化は A7 とセット」))は A7 実装 PR で行う。スキル `new-env` は本 ADR の構造(`src/config/` の目的別 config モジュール + 変数表)を対象とし、`src/config/` 未着地の間は自らガードして停止する([0155](0155-claude-skills-development.md))

## 関連 ADR

- [0020-adopted-architecture.md](0020-adopted-architecture.md) / [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — `config` カーネルの枠予約・依存マトリクス(config import の唯一の許可層 = `adapters`)。本 ADR はその中身を確定
- [0011-no-docker.md](0011-no-docker.md) — no-Docker / PaaS 配送(embed 不成立 → Next.js 標準 `.env` + PaaS secret store への翻案根拠)
- [0027-directory-structure.md](0027-directory-structure.md) — `config` カーネルの物理配置(作成タイミング = A7 実装時)
- [0028-naming-convention.md](0028-naming-convention.md) — 環境変数の命名形式(`{SUBSYSTEM}_{NAME}` / `NEXT_PUBLIC_` プレフィックス)。本 ADR は境界・検証・型付けを定める
- [0002-formatter-linter.md](0002-formatter-linter.md) — `process.env` 直読禁止の機械強制(biome `noProcessEnv`)の能力ベース分担。有効化は本 ADR(A7)実装 PR とセット
- [0070-backend-role-separation.md](0070-backend-role-separation.md)(A2)/ [0071-bff-api-integration.md](0071-bff-api-integration.md)(B3・BFF / API 統合)— runtime config の逃し先・受け手アダプタの接続先
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md)(A4・レンダリング戦略)— SSG / ISR の env 凍結との相互参照
- [0090-testing-strategy.md](0090-testing-strategy.md)(B8)— env スタブの具体 API(`vi.stubEnv`)の確定先(同日 Accepted)
- [0153-ci-configuration.md](0153-ci-configuration.md)(B9・CI 構成)— ビルド時検証の CI 組込み
- [0043-middleware-policy.md](0043-middleware-policy.md)(C6・Middleware 方針)— Edge runtime 用に Node API 非依存の config スライスが別途要るかの交点(本文「周辺ルール」参照)
