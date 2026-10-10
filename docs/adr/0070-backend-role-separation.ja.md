> **このファイルは [`0070-backend-role-separation.md`](0070-backend-role-separation.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `0070-backend-role-separation.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `0070-backend-role-separation.md` だけです。このファイルは人間が読むための翻訳です。

# バックエンドとの役割分離

[0011](0011-no-docker.ja.md) の「Next.js = プレゼンテーションレイヤー / バックエンド別リポ」を具体化し、**Next.js が抱える責務範囲 / BFF 境界(`/api/*` の責務)/ ドメインロジックの所在 / バックエンドとの契約 SSOT / 境界値の所有** を定める。

## Status

Accepted

## 背景

Next.js が抱える責務(UI / 認証トークン交換 / BFF / 集約 — どこまでか)・バックエンドとの契約(REST / GraphQL / RPC と SSOT の所在)・ドメインロジックの所在を、本 ADR が確定する。

BFF 境界は、[0011](0011-no-docker.ja.md) の thin proxy 決定と「認証・DB は用途依存(out of scope)」原則から導出する。**契約 SSOT と境界値所有**は、バックエンドが契約成果物を所有しフロントがその消費者になる、という関係から導出する。

## 決定

### Next.js の責務範囲

- Next.js は **UI レンダリング + 薄い BFF** に責務を限る。ビジネスロジック・ドメインモデル・永続化はバックエンド別リポ / 別サービスが持つ([0011](0011-no-docker.ja.md))
- プレゼンテーションレイヤーに残る「ドメイン相当」は表示用 `model`(VO / フォーマッタ / 表示バリデーション)のみ([0020](0020-adopted-architecture.ja.md) / [0021](0021-frontend-responsibility.ja.md))。ビジネスルールは持たない

### `/api/*` = thin proxy(BFF 境界)

- `/api/*`(Route Handler)は **thin proxy** に限る。許可される責務は、バックエンドへのプロキシ / 認証トークンの中継・交換の seam / 最小限のヘッダ付与に留める([0011](0011-no-docker.ja.md) thin proxy)
- **業務ロジック・複数 API の重い集約を `/api/*` に書かない**。集約が必要な場合も feature の server 関数 / `adapters`([0021](0021-frontend-responsibility.ja.md))で最小限に行い、BFF が業務レイヤー化することを避ける
- **認証・セッションの具体モデルは用途依存**(out of scope。Auth.js / Clerk / 自前 BFF / SaaS IdP 等)。本リポジトリは token 交換の seam を許すが、特定 IdP・特定セッション方式を前提にしない

### バックエンドとの契約 SSOT

- **契約の SSOT はバックエンドリポの `openapi.gen.yaml`** である。バックエンドはバンドル済みの spec をクロスリポ契約成果物としてコミットし、フロントはその消費者に徹する。REST + OpenAPI を契約形式とする
- フロントはこの成果物を取り込んで型 + runtime validation を生成する。取り込み機構・生成は [0072](0072-api-type-generation.ja.md) が正
- **バックエンド API spec を手書き型で複製しない**

### 境界値の所有

- **OpenAPI は wire contract であって domain rule ではない**。境界値はレイヤーごとに別の関心事が所有する
- 方向不変条件: **OpenAPI request 制約 ⊆ domain rule ⊆ OpenAPI response 容量**(request は最も厳しく、response は最も緩い)
- **response には server 側の runtime 検証がない**ため、**フロントの生成 validation(zod)が契約破れを検知する最後の砦**になる。したがってフロントは response を **`adapters` 境界で runtime validation** する(具体は [0072](0072-api-type-generation.ja.md) で zod 検証、[0071](0071-bff-api-integration.ja.md) が受け取り点)
- 生成型・外部型を内層に漏らさない([0020](0020-adopted-architecture.ja.md) 設計原則 3 型漏洩禁止)。変換は所有境界 = `adapters` で自前 view 型へ行う
- **上流由来の値を網羅的に無害化しない。** バックエンドから返る値・利用者が入れた値・第三者から届いた値を、プレゼンテーションレイヤーが想定しうるすべての悪意へ対して安全にすることは、設計目標に置かない。始末するのは**このレイヤーが自分で作った値**である —— 自分で組み立てた文字列を自分でレンダリングするとき、自分で作った URL を自分で開くとき、自分で持った値を外へ出すとき。そこから先を引き受けようとすると、守る対象が無限に広がるうえ、**本来の持ち主（値を作ったレイヤー）が手当てしなくてよくなる。** 脅威を特定できるものは名指しで置く（レンダリングの許可リスト、送信先の限定）が、それは網羅ではなく個別の判断である
- **契約が返さない値をプレゼンテーションレイヤーで導出しない。** 一覧の行から求まる集計値のように計算規則がバックエンドに在るものは、契約に無ければ画面にも無い。プレゼンテーションレイヤーで組み立てると規則のコピーが生まれ、バックエンドが規則を変えたとき画面だけが古い値を出す。要るなら契約へ足す

## 禁止事項

- ❌ `/api/*` に業務ロジック・ドメインモデル・重い集約を書くこと(thin proxy に限る)
- ❌ `src/` に DB 接続・ORM を足すこと([0011](0011-no-docker.ja.md))（強制: 持たない —— 採らない決定。DB 接続・ORM は依存と接続のコードの追加として diff に現れ、置いていないこと自体が状態である）
- ❌ バックエンド API spec を手書き型で複製すること(SSOT = `openapi.gen.yaml`。生成は [0072](0072-api-type-generation.ja.md))（強制: 散文 —— **寄せられない**。手書きの型が契約のコピーかは形の一致ではなく意味で決まり、偶然同じ形の自前の view 型と区別できない）
- ❌ 特定の認証・セッションモデルを本リポジトリに前提として組み込むこと(用途依存)（強制: 散文 —— **寄せられない**。特定のモデルを前提にしているかは seam の形の判断で、コードの形からは決まらない）
- ❌ 生成型・外部型を `model` 等の内層へ漏らすこと(変換は `adapters` 境界)（強制: ESLint boundaries（`architecture.ts` の `RESTRICTED_AREAS` の `adapters-gen`）が `model` / `features` からの生成物の直接 import を落とす。`adapters` の公開面を経由した素通しは散文 —— **寄せられない**。公開面が返す型が生成型か自前の view 型かは推論を経た型の出所で決まり、import の形からは決まらない）
- ❌ 契約が返さない値(集計値等)をプレゼンテーションレイヤーで計算して出すこと(規則のコピーになる)（強制: 散文 —— **寄せられない**。プレゼンテーションレイヤーの計算が backend の規則のコピーかは計算の意味で決まり、式の形からは決まらない）
- ❌ 上流由来の値の網羅的な無害化を、このレイヤーの責務として引き受けること(始末するのは自分が作った値。脅威を特定できるものは名指しで置く)

## 関連 ADR

- [0011-no-docker.md](0011-no-docker.ja.md) — プレゼンテーションレイヤーロール / thin proxy / DB・認証は別リポ(本 ADR の親決定)
- [0020-adopted-architecture.md](0020-adopted-architecture.ja.md) — 型漏洩禁止(境界値変換の根拠)/ `model` の範囲
- [0021-frontend-responsibility.md](0021-frontend-responsibility.ja.md) — `adapters` = 外部接続・変換の所有境界 / 集約の置き場
- [0071-bff-api-integration.md](0071-bff-api-integration.ja.md) — API クライアント配置・fetch wrapper・response 検証の受け取り点
- [0072-api-type-generation.md](0072-api-type-generation.ja.md) — 契約 SSOT の取り込み・型 + zod 生成・runtime validation
- [0080-error-handling.md](0080-error-handling.ja.md) — バックエンドエラーの正規化(境界での error 変換)
