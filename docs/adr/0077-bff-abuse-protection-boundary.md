# BFF abuse 保護境界(infra / edge seam)

`/api/*`(テレメトリ中継を含む公開エンドポイント)への abuse 保護を、**infra(PaaS / edge)ドメインの境界 seam**(レート制限 / DDoS 緩和 / WAF = 名前付きで残して切る)と、**本体に最小限残す防御**(Route Handler のボディサイズ上限・content-type 検証・入力バリデーション)に分けて明文化する。対象は triage #49(BFF abuse 保護)。本 ADR は [0075](0075-bff-external-boundary-seam.md) §3 を per-subject に切り出したものである。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。独立起票の経緯。本 ADR の内容自体はこの設計討議での方針を成文化したもの。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

[0070](0070-backend-role-separation.md)(A2)が `/api/*` を **thin proxy** に限定し、[0081](0081-observability-logging.md)(B7)が「ブラウザ → BFF 中継」をテレメトリの seam にした結果、abuse 保護の空白が生じた([adr-gap-audit.md](../plan/adr-gap-audit.md) #49):

- `/api/*`(テレメトリ中継含む)へのレート制限・ボディサイズ上限・認証なしエンドポイントの保護を、本体で持つか PaaS / fork 先に委ねるかの線引きが未定義。
- [0081](0081-observability-logging.md) の中継 seam が **無防備な公開エンドポイント**を本体構成に生むにもかかわらず、防御方針がない。

本 ADR は [0010](0010-standards-and-non-lockin.md) の 2 原則(§1 デファクトへの準拠 / §2 vendor-independent な正当性材料の必須化)と、**境界判定**(「別ドメイン(infra / backend)の責務か?」の一問)を適用して abuse 保護を仕分ける。

## 決定

**境界判定 = Yes(別ドメイン)**。レート制限・DDoS 緩和・WAF は **infra(PaaS / edge)ドメインの責務**であり、boilerplate 本体に実装を抱えず、**名前付きの境界 seam を残して切る**。

### 1. PaaS / edge へ委譲する防御(infra 境界 seam)

レート制限・IP / bot フィルタ・DDoS 緩和・大域的な WAF は Vercel / Cloudflare / AWS 等の edge / WAF 機能で敷く。本体はこれを前提とし、fork 先が自身の PaaS で設定する拡張点として明示する([0081](0081-observability-logging.md) が生む無防備エンドポイント = テレメトリ中継 `/api/*` の保護もここに載る)。

- **vendor-independent 正当性材料([0010](0010-standards-and-non-lockin.md) §2)**: 公開エンドポイントを edge で多層防御する構造は OWASP / 一般的 web セキュリティの原則であって特定 PaaS 機能に依存しない(Vercel / Cloudflare / AWS WAF いずれでも成立)。

### 2. 本体に最小限残す防御(フロント領域で表現可能な防御)

個々の Route Handler が **ボディサイズ上限・content-type 検証・入力バリデーション** を forwarding 前に行うことは、Next.js 公式 BFF ガイドの「proxy する前に validation を足す」パターンに乗る範囲であり、edge の有無に関わらず本体が持つ最小防御として Route Handler 設計規約(triage #8 rules.md 未策定)側で受ける。

### 3. 保守的立場(保留)

「[0081](0081-observability-logging.md) の中継 seam が生む無防備エンドポイントの保護を、本体でどこまで持ち / どこから PaaS へ委ねるか」の **具体的な線引きは本 ADR では確定しない**。本 ADR が確定するのは「rate limit / DDoS / WAF = infra 境界 seam で切る」「入力・サイズ検証の最小防御 = 本体 Route Handler 規約」という **帰属の骨格** に留める(具体値は用途 / PaaS 依存。保留 = 実装 PR / fork 先。下記 flags 相当)。

## 禁止事項

- ❌ レート制限 / DDoS 緩和 / WAF を boilerplate 本体のアプリコードに実装すること(infra 境界 seam = PaaS / edge へ委譲)
- ❌ 公開 `/api/*`(テレメトリ中継含む)にボディサイズ上限・content-type / 入力検証を一切設けず forwarding すること(本体が持つ最小防御)

## 補足

- **タクソノミー**([0140](0140-documentation-operations.md)): 本 ADR は decision(#49 の帰属確定)に属する。日常強制される rule(Route Handler 実装規約)は `docs/rules.md`(未新設・0140 方針)側に置き、本 ADR から逆参照される。
- **トピック上の関連**: 本 ADR(infra abuse 保護)は観測性 ADR([0081](0081-observability-logging.md))の中継 seam と密接に関連する(0081 が保護対象の無防備エンドポイントを生む起点であるため)。連番運用のためファイルは移動せず、関連は索引・相互参照で表現する。
- 本 ADR は既存 Accepted ADR(0070 / 0081 / 0010)本体を編集せず、それらを参照して隣接する空白を埋める(既存 ADR は Protected Documentation)。

## 関連 ADR

- [0075-bff-external-boundary-seam.md](0075-bff-external-boundary-seam.md)— 分割元(ファイルアップロード seam)。本 ADR は 0075 §3(BFF abuse 保護)を per-subject に切り出したもの
- [0076-payment-ui-seam.md](0076-payment-ui-seam.md)— 分割の兄弟(決済 UI seam = mount seam と PCI 境界。0075 §2 由来)
- [0070-backend-role-separation.md](0070-backend-role-separation.md)(A2)— `/api/*` = thin proxy(無防備エンドポイントを生む起点の親決定)
- [0081-observability-logging.md](0081-observability-logging.md)(B7)— ブラウザ → BFF 中継 seam(無防備エンドポイントを生む起点。本 ADR の保護対象)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md)— 標準準拠 + vendor-independent 正当性(edge 多層防御の正当化の土台)
- [docs/plan/adr-gap-triage.md](../plan/adr-gap-triage.md)— #49 の disposition の管理先
- BACKLOG(triage #8 Route Handler 規約)— rules.md / 新規 ADR 未策定。本 ADR が逆参照する連動先
