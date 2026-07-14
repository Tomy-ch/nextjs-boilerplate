# バックエンドとの役割分離

[0011](0011-no-docker.md) の「Next.js = 表示層 / バックエンド別リポ」を具体化し、**Next.js が抱える責務範囲 / BFF 境界(`/api/*` の責務)/ ドメインロジックの所在 / バックエンドとの契約 SSOT / 境界値の所有** を定める。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([決定 5](../plan/pre-implementation-decisions.md))。本 ADR の内容自体はユーザ決定済み([決定 4](../plan/pre-implementation-decisions.md))。日付 2026-07-13。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

AGENTS.md の `[TODO] Backend Role Separation`(BACKLOG A2)は、Next.js が抱える責務(UI / 認証トークン交換 / BFF / 集約 — どこまでか)・バックエンドとの契約(REST / GraphQL / RPC と SSOT の所在)・ドメインロジックの所在を未決としていた。暫定運用は「`/api/*` に業務ロジックを書かない(薄い proxy / token 交換のみ)/ `src/` に DB 接続・ORM を足さない / バックエンド API spec を手書き型で複製しない」だった。本 ADR がこれを確定させる。

go-boilerplate は**バックエンド本体**であり、フロントの前段 proxy 責務(BFF / token 交換)の前例を持たない(調査で確認)。したがって A2 の BFF 境界は go からの翻案元がなく、[0011](0011-no-docker.md) の thin proxy 決定と「認証・DB は fork 先判断(out of scope)」原則から導出する新規決定である。一方、**契約 SSOT と境界値所有**は go-boilerplate に確立された規約(**go 側**の ADR 0009 / 0052 / 0070。本リポの同番号 ADR ではない)があり、その消費者側として翻案する。

## 決定

### Next.js の責務範囲

- Next.js は **UI 描画 + 薄い BFF** に責務を限る。ビジネスロジック・ドメインモデル・永続化はバックエンド別リポ / 別サービスが持つ([0011](0011-no-docker.md))
- 表示層に残る「ドメイン相当」は表示用 `model`(VO / フォーマッタ / 表示バリデーション)のみ([0020](0020-adopted-architecture.md) / [0021](0021-frontend-responsibility.md))。ビジネスルールは持たない

### `/api/*` = thin proxy(BFF 境界)

- `/api/*`(Route Handler)は **thin proxy** に限る。許可される責務は、バックエンドへのプロキシ / 認証トークンの中継・交換の seam / 最小限のヘッダ付与に留める([0011](0011-no-docker.md) thin proxy)
- **業務ロジック・複数 API の重い集約を `/api/*` に書かない**。集約が必要な場合も feature の server 関数 / `adapters`([0021](0021-frontend-responsibility.md))で最小限に行い、BFF が業務層化することを避ける
- **認証・セッションの具体モデルは fork 先判断**(out of scope。Auth.js / Clerk / 自前 BFF / SaaS IdP 等)。本 boilerplate は token 交換の seam を許すが、特定 IdP・特定セッション方式を前提にしない

### バックエンドとの契約 SSOT

- **契約の SSOT はバックエンドリポの `openapi.gen.yaml`**(go-boilerplate ADR 0012「バンドル済み `openapi.gen.yaml` をクロスリポ契約成果物として保持」の消費者側)。REST + OpenAPI を契約形式とする
- フロントはこの成果物を取り込んで型 + runtime validation を生成する。取り込み機構・生成は **B4([0072](0072-api-type-generation.md))** が正
- **バックエンド API spec を手書き型で複製しない**(AGENTS.md 暫定を確定)

### 境界値の所有(go-boilerplate ADR 0015 翻案)

- **OpenAPI は wire contract であって domain rule ではない**。境界値は層ごとに別の関心事が所有する(go-boilerplate ADR 0015「境界値所有」/ `boundary-ownership.md` の翻案)
- 方向不変条件: **OpenAPI request 制約 ⊆ domain rule ⊆ OpenAPI response 容量**(request は最も厳しく、response は最も緩い)
- **response には server 側の runtime 検証がない**ため、**フロントの生成 validation(zod)が契約破れを検知する最後の砦**になる(go-boilerplate `boundary-ownership.md` が明示)。したがってフロントは response を **`adapters` 境界で runtime validation** する(具体は [0072](0072-api-type-generation.md) B4 で zod 検証、[0071](0071-bff-api-integration.md) B3 が受け取り点)
- 生成型・外部型を内層に漏らさない([0020](0020-adopted-architecture.md) 設計原則 3 型漏洩禁止)。変換は所有境界 = `adapters`(go の `internal/controller/conv` パターンの翻案)で自前 view 型へ行う

## 禁止事項

- ❌ `/api/*` に業務ロジック・ドメインモデル・重い集約を書くこと(thin proxy に限る)
- ❌ `src/` に DB 接続・ORM を足すこと([0011](0011-no-docker.md))
- ❌ バックエンド API spec を手書き型で複製すること(SSOT = `openapi.gen.yaml`。生成は [0072](0072-api-type-generation.md))
- ❌ 特定の認証・セッションモデルを boilerplate 本体に前提として組み込むこと(fork 先判断)
- ❌ 生成型・外部型を `model` 等の内層へ漏らすこと(変換は `adapters` 境界)

## 補足

- 本 ADR の Accepted に伴い、AGENTS.md の `[TODO] Backend Role Separation` 節の削除・書き換えを実施する(未実施 — AGENTS.md は Protected Documentation のため、変更案の提示とユーザ承認を経て適用する)

## 関連 ADR

- [0011-no-docker.md](0011-no-docker.md) — 表示層ロール / thin proxy / DB・認証は別リポ(本 ADR の親決定)
- [0020-adopted-architecture.md](0020-adopted-architecture.md) — 型漏洩禁止(境界値変換の根拠)/ `model` の範囲
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — `adapters` = 外部接続・変換の所有境界 / 集約の置き場
- [0071-bff-api-integration.md](0071-bff-api-integration.md)(B3)— API クライアント配置・fetch wrapper・response 検証の受け取り点
- [0072-api-type-generation.md](0072-api-type-generation.md)(B4)— 契約 SSOT の取り込み・型 + zod 生成・runtime validation
- BACKLOG B6(エラーハンドリング)— バックエンドエラーの正規化(境界での error 変換)
