# Cookie 同意(軽量 consent 機構 + スクリプトゲート)

Cookie 同意の**軽量機構**(同意状態の保持・バナー UI・サードパーティスクリプトの読み込みゲート)を boilerplate 本体に同梱する。本格的な同意管理プラットフォーム(CMP / IAB TCF)と、ゲートの先に繋ぐトラッキング製品そのものは同梱しない。

## Status

Accepted (一部 exclusion)

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([0140](0140-documentation-operations.md))。日付 2026-07-13。pre-v1 の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

同意管理は**対象法域(GDPR / ePrivacy / CCPA 等)・使用するトラッキング / アナリティクスの有無・SaaS 選定に強く依存**するため、CMP レベルの実装を本体で一律に決めると fork 先の法令要件を狭める。

一方で、**同意はサードパーティスクリプトの読み込みをゲートする機構**であり、layout の構成([0026](0026-layout-shell-mount.md))・CSP の `script-src`([0111](0111-csp-security-headers.md))・`next/script` の strategy に同時に食い込む。この 3 点は後から差し込むと広範囲の書き換えになるため、**機構だけは最初から持つ**方が構造的に安い。加えて同意状態の供給 seam は [0031](0031-policy-state-supply.md) が既に規定しており、**設置面が実在する**。

## 決定

### 1. 軽量 consent 機構を本体に同梱する

同梱する範囲は次の 4 点に限る。

- **同意状態の保持と読み出し** — cookie に保持し、ツリーへの供給は [0031](0031-policy-state-supply.md)(source adapter + no-op 既定 + stateless props 既定)に従う。cookie 操作は [0043](0043-middleware-policy.md) の `proxy.ts` 側
- **同意バナー UI** — `components` に置く最小のバナー。カテゴリは「必須 / 任意」の 2 値を既定とし、細分カテゴリは fork 先の判断
- **スクリプト読み込みゲート** — 同意が得られるまでサードパーティスクリプトを読み込まない。`next/script` の mount を gate 述語の裏に置く
- **計測用 cookie_id の発行** — 同意後に発行する。未同意の間は発行しない

### 2. ゲートの先に繋ぐ製品は同梱しない(exclusion)

- **GTM / PostHog 等のトラッキング製品本体は v1 では入れない**。機構とゲートだけを持ち、その先には何も繋がない。採用は [0082](0082-client-observability.md) の adapter 越しに fork 先 / v2 が行う
- **CMP・IAB TCF 等の本格的な同意管理は同梱しない**。法域・ベンダー依存が強く、boilerplate 本体で決めると fork 先を狭める。採る場合は本機構を差し替える形になる(gate 述語の消費側は変えない)
- 外部ライブラリ / CMP を使う場合も [0004](0004-library-management.md)(exact pin / `pnpm audit`)・[0021](0021-frontend-responsibility.md)(カーネル配置・命名規律)の枠内で行う

### 3. 同意ゲートの対象

- **ゲートするのはユーザ行動トラッキング**である。[0081](0081-observability-logging.md) の運用テレメトリ(エラー / パフォーマンス)は同意対象と区別する
- ただし **field RUM 等の運用テレメトリを同意対象とする法域要件があり得る**ため、gate 述語は運用テレメトリ側からも再利用できる形にする([0082](0082-client-observability.md))

## 禁止事項

- ❌ 同意状態を確認せずにサードパーティスクリプトを読み込むこと(gate を迂回する `<script>` 直書き)
- ❌ 同意状態の判定ロジックを feature / component に散らすこと(gate 述語は [0031](0031-policy-state-supply.md) の供給経路に一本化する)
- ❌ 未同意の状態で計測用 cookie_id を発行すること
- ❌ CMP / IAB TCF 相当の同意管理を本体へ持ち込むこと(fork 先判断。§2)

## 関連 ADR

- [0031-policy-state-supply.md](0031-policy-state-supply.md) — consent 供給 seam の定義(source adapter + gate 述語 + stateless props)
- [0043-middleware-policy.md](0043-middleware-policy.md)(C6)— 同意状態の cookie 保持
- [0026-layout-shell-mount.md](0026-layout-shell-mount.md) — バナー / スクリプトの mount 位置
- [0111-csp-security-headers.md](0111-csp-security-headers.md) — サードパーティスクリプトの `script-src` 許可(ゲートと同じ対象を扱う)
- [0082-client-observability.md](0082-client-observability.md) — consent gate の主消費者(プロダクト分析は gate 必須・運用テレメトリの法域拡張点)
- [0081-observability-logging.md](0081-observability-logging.md)(B7)— 運用テレメトリ(同意ゲート対象のユーザトラッキングとは区別)
- [0023-stores-kernel.md](0023-stores-kernel.md) — 横断 client 状態として保持する場合の置き場
- [0121-i18n-strategy.md](0121-i18n-strategy.md)(C1)/ [0130-pwa-strategy.md](0130-pwa-strategy.md)(C8)— fork 先判断の exclusion 先例(本 ADR は §2 のみが exclusion)
