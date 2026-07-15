# Cookie 同意 / 同意管理(exclusion)

Cookie 同意バナー・トラッキング同意管理(GDPR / ePrivacy 等の法令対応)を **boilerplate 本体に同梱しない** ことを意図的な除外(exclusion)として記録し、fork 先が採用する場合の seam のみ示す。

## Status

Accepted (exclusion; v2 に局所採用を予定)

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([決定 5](../plan/pre-implementation-decisions.md))。本 ADR の内容自体はユーザ決定済み(Tier 5 = 用途依存の判断)。日付 2026-07-13。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

**v2 採用予定(局所ライブラリ・2026-07-14)**: **0.0.x/v1 の非同梱(exclusion)方針は v2 まで不変**であり、採用マトリクス([adoption-matrix.md](../plan/adoption-matrix.md))で Cookie 同意は **v2 = 局所ライブラリ採用**(用途依存・法域依存)に振り分けられた(v2 で採用へ移行予定)。**seam(cookie 保持 / consent gate 述語)は 0.0.x/v1 で敷設予定([0031](0031-policy-state-supply.md) で規定済み・実装は実装 PR)・機構採用は v2**(軽量 consent 機構〈adapter 抽象。CMP は差替可〉・Medium)。採用時も本体は seam を保持し、CMP / consent 機構を [0010](0010-standards-and-non-lockin.md)(vendor-independent 正当化 + adapters/カーネル境界の裏で差替可能・vendor 直参照を feature/component に散らさない)/ [0004](0004-library-management.md)(exact-pin / `pnpm audit`)の枠内で置く。

## 背景

C 系(Tier 5)の当初列挙(C1〜C6)に同意管理は含まれておらず、「やらない」判断自体が未記録(沈黙)だった(敵対的レビューで判明。2026-07-13)。アナリティクスの**配置**は [0020](0020-adopted-architecture.md) / [0021](0021-frontend-responsibility.md) で `adapters` の責務例として触れられるが、**同意管理(consent gating・バナー UI・トラッキング可否判定)は別軸**であり未成文だった。

同意管理は**対象法域(GDPR / ePrivacy / CCPA 等)・使用するトラッキング / アナリティクスの有無・SaaS 選定に強く依存**するため、boilerplate 本体で一律に決めると fork 先の法令要件を狭める。

## 決定: boilerplate 本体に同梱しない(fork 先判断)

- **0.0.x/v1 では Cookie 同意バナー・同意状態管理・consent gating・同意連動のトラッキング制御を boilerplate 本体に同梱しない**。fork 先の法令要件 / トラッキング構成に応じて判断する(exclusion。本体側は v2 で局所採用予定 = Status 注記)
- 導出根拠: [0011](0011-no-docker.md) の「用途未定の表示層」ロール + BACKLOG out of scope 原則([0121](0121-i18n-strategy.md) / [0130](0130-pwa-strategy.md) と同じ fork 先判断の論理)
- **fork 先が同意管理を採用する場合の seam**(参考):
  - 同意状態の保持・読み出しは cookie(`proxy.ts` の cookie 操作 = [0043](0043-middleware-policy.md))で行い、ツリーへの供給は [0031](0031-policy-state-supply.md)(adapters source adapter + no-op 既定 + stateless props 既定)。横断 client 状態として保持が必要な場合の置き場は [0023](0023-stores-kernel.md)(`stores`)
  - **トラッキング / アナリティクスの実行可否は同意状態にゲートする**([0081](0081-observability-logging.md) の観測性は運用テレメトリであり、ユーザ行動トラッキングとは区別する — 同意ゲートの対象は後者)。ただし **field RUM 等の運用テレメトリを同意対象とする法域要件があり得る**ため、その場合の gate 拡張点は [0082](0082-client-observability.md)(0031 gate 述語の再利用)に従う
  - 外部ライブラリ / CMP(Consent Management Platform)を使う場合も [0004](0004-library-management.md)(exact pin / `pnpm audit`)・[0021](0021-frontend-responsibility.md)(カーネル配置・命名規律)の枠内で行う

## exclusion の扱い

- 本 ADR は「意図的にやらない」判断の記録である([決定 5](../plan/pre-implementation-decisions.md) タクソノミー: exclusion = ADR)。fork 先が導入する分にはこの exclusion は障害にならない

## 関連 ADR

- [0011-no-docker.md](0011-no-docker.md) — 用途未定の表示層ロール(fork 先判断の根拠)
- [0121-i18n-strategy.md](0121-i18n-strategy.md)(C1)/ [0130-pwa-strategy.md](0130-pwa-strategy.md)(C8)— 同じ fork 先判断の exclusion 先例
- [0081-observability-logging.md](0081-observability-logging.md)(B7)— 運用テレメトリ(同意ゲート対象のユーザトラッキングとは区別)
- [0082-client-observability.md](0082-client-observability.md) — consent gate の主消費者(プロダクト分析 #61 は gate 必須・運用テレメトリの法域拡張点)
- [0031-policy-state-supply.md](0031-policy-state-supply.md) — consent 供給 seam の定義(source adapter + gate 述語 + stateless props)
- [0043-middleware-policy.md](0043-middleware-policy.md)(C6)— 同意状態の cookie 保持 seam(採用時)
- [0023-stores-kernel.md](0023-stores-kernel.md) — 横断 client 状態として保持する場合の置き場
