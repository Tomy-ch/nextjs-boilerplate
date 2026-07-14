# 決済 UI seam(mount seam と PCI 境界)

決済(Stripe Elements / PayPal / Adyen 等)を **本体非同梱(exclusion)** としたうえで、EC 系 fork が採用したときに乗る **フロント領域の mount seam**(SDK の DOM マウント点 + client_secret 受け渡し口)と、**別ドメイン(backend / PSP)の PCI 境界 seam**(生カード情報をフロントに持たせない = PCI SAQ-A 相当)を分けて明文化する。対象は triage #51(決済 UI マウント seam)。本 ADR は [0075](0075-bff-external-boundary-seam.md) §2 を per-subject に切り出したものである。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。独立起票。本 ADR の内容自体はこの設計討議での方針を成文化したもの。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

[0070](0070-backend-role-separation.md)(A2)が `/api/*` を **thin proxy** に限定し、[0071](0071-bff-api-integration.md)(B3)の fetch wrapper が JSON API を前提とした結果、決済 UI の扱いが空白として残った([adr-gap-audit.md](../plan/adr-gap-audit.md) #51):

- 決済 SDK(Stripe Elements / PayPal Buttons / Adyen Drop-in 等)を本体非同梱とする **exclusion の宣言すら存在しない**(i18n / PWA / 同意と違い明文がない)。
- 採用時の seam(外部スクリプト方針・PCI 上フロントに置いてよい範囲・BFF 中継の要否)が未定義。

決済は性質の異なる 2 ドメインに割れる(フロントの UI マウント面 / backend・PSP の PCI 準拠面)。本 ADR は [0010](0010-standards-and-non-lockin.md) の 2 原則(§1 デファクトへの準拠 / §2 vendor-independent な正当性材料の必須化)と、**境界判定**(「別ドメイン(infra / backend)の責務か?」の一問)を各面に通して仕分ける。

## 決定

決済は 2 つのドメインに割れる。**境界判定**を各面に通す。

### 1. フロント領域 = 決済 SDK の UI マウント seam

決済 SDK(Stripe Elements / PayPal Buttons / Adyen Drop-in 等)は **本体非同梱(exclusion)** とし、EC 系 fork が採用したときに乗る **mount seam**(SDK が iframe / redirect を差し込む DOM マウント点 + client_secret 等の受け渡し口)だけを名前付きで敷く。

- 外部スクリプトの読込は [0131](0131-cookie-consent.md)(同意ゲート)と CSP(triage #46 = 未策定)に連動させる。決済 SDK の `<script>` は同意 / CSP 許可の下でのみロードする(サードパーティスクリプト規約 = triage #50 rules.md 未策定と一貫させる)。

### 2. 別ドメイン(backend / PSP)= PCI 境界 seam で切る

決済処理・金額確定・冪等性・**PCI-DSS 準拠範囲**は backend / PSP の責務。フロントは **生カード情報に触れない**構成(SDK が iframe / redirect でカードデータを隔離し、フロント JS がカード番号・CVC を保持しない = PCI SAQ-A 相当)に留める。PaymentIntent 等の作成は backend、フロントは client_secret / トークンの受け取りのみ(受け取り口は `adapters/server`)。

- **vendor-independent 正当性材料([0010](0010-standards-and-non-lockin.md) §2)**: 「カードデータをフロント JS から隔離する」構造は PCI SSC が定める規格(SAQ-A / iframe 隔離)であって特定 PSP(Stripe / PayPal / Adyen)に依存しない(PSP を抜いても「フロントは生カード情報を持たない」は正当)。boilerplate が固定するのは mount seam の形だけで、PSP・実装詳細は fork 先の嗜好に委ねる([0070](0070-backend-role-separation.md) の認証 out-of-scope と同型)。

## 禁止事項

- ❌ 決済 SDK を boilerplate 本体に同梱すること / 特定 PSP を本体前提に組み込むこと(mount seam のみ・SDK と PSP は fork 先判断)
- ❌ フロント JS で生カード情報(カード番号 / CVC)を保持・送信する構成にすること(SDK の iframe / redirect 隔離 = PCI SAQ-A 相当を破る)
- ❌ 決済 SDK の外部スクリプトを同意 / CSP ゲートの外でロードすること([0131](0131-cookie-consent.md) / CSP)

## 補足

- **タクソノミー**([0140](0140-documentation-operations.md)): 本 ADR は exclusion(決済 SDK 非同梱)に属する。日常強制される rule(サードパーティスクリプト規約)は `docs/rules.md`(未新設・0140 方針)側に置き、本 ADR から逆参照される。
- 本 ADR は既存 Accepted ADR(0070 / 0071 / 0131 / 0010 / 0024)本体を編集せず、それらを参照して隣接する空白を埋める(既存 ADR は Protected Documentation)。
- **v2 採用予定(局所ライブラリ・2026-07-14)**: 決済 SDK 非同梱(exclusion)本体は不変。採用マトリクス([adoption-matrix.md](../plan/adoption-matrix.md))で決済 UI は **v2 = 局所ライブラリ採用**(用途依存・EC 系 fork)に振り分けられた。**mount seam(SDK の DOM マウント点 + client_secret 受け渡し口)と PCI 境界 seam(生カード情報をフロントに持たせない = SAQ-A 相当)は 0.0.x/v1 で敷済・SDK 採用は v2**(Stripe〈`@stripe/stripe-js` + Elements〉・Thin = mount seam)。採用時も本体は mount seam / PCI 境界を保持し、Stripe を [0010](0010-standards-and-non-lockin.md)(vendor-independent 正当化 + adapters/カーネル境界の裏で差替可能・vendor 直参照を feature/component に散らさない)/ [0004](0004-library-management.md)(exact-pin / `pnpm audit`)の枠内で置く。

## 関連 ADR

- [0075-bff-external-boundary-seam.md](0075-bff-external-boundary-seam.md)— 分割元(ファイルアップロード seam)。本 ADR は 0075 §2(決済 UI)を per-subject に切り出したもの
- [0077-bff-abuse-protection-boundary.md](0077-bff-abuse-protection-boundary.md)— 分割の兄弟(BFF abuse 保護 = infra 境界 seam。0075 §3 由来)
- [0070-backend-role-separation.md](0070-backend-role-separation.md)(A2)— `/api/*` = thin proxy / 契約 SSOT(決済処理・PCI 準拠が backend 責務であることの親決定)
- [0071-bff-api-integration.md](0071-bff-api-integration.md)(B3)— fetch wrapper(JSON 前提)/ `adapters` の resilience(client_secret 受け取り口の土台)
- [0131-cookie-consent.md](0131-cookie-consent.md)(C9)— 同意ゲート(決済 SDK 外部スクリプトの読込条件)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md)— 標準準拠 + vendor-independent 正当性(PCI SAQ-A の正当化の土台)
- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md)— `adapters` server / client 2 分割(client_secret / トークンの受け取り = server 側)
- [docs/plan/adr-gap-triage.md](../plan/adr-gap-triage.md)— #51 の disposition の管理先
- BACKLOG(triage #46 CSP / #50 サードパーティスクリプト)— rules.md / 新規 ADR 未策定。本 ADR が逆参照する連動先
