# PWA 戦略(exclusion)

PWA(Progressive Web App)— **Web App Manifest / Service Worker / オフライン対応** を **boilerplate 本体に同梱しない** ことを意図的な除外(exclusion)として記録し、fork 先が採用する場合の Next.js 上の seam のみ示す。

## Status

Accepted (exclusion)

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([決定 5](../plan/pre-implementation-decisions.md))。本 ADR の内容自体はユーザ決定済み(Tier 5 = 用途依存の判断)。日付 2026-07-13。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

**v2 採用予定(局所ライブラリ・2026-07-14)**: 本 exclusion 本体は不変。採用マトリクス([adoption-matrix.md](../plan/adoption-matrix.md))で PWA は **v2 = 局所ライブラリ採用**(用途依存)に振り分けられた。**seam(`app/manifest.(json|ts)` / SW 実装点)は 0.0.x/v1 で敷済・ライブラリ採用は v2**(Serwist〈`@serwist/next`〉・Medium)。採用時も本体は seam を保持し、Serwist を [0010](0010-standards-and-non-lockin.md)(vendor-independent 正当化 + adapters/カーネル境界の裏で差替可能・vendor 直参照を feature/component に散らさない)/ [0004](0004-library-management.md)(exact-pin / `pnpm audit`)の枠内で置く。

## 背景

C 系(Tier 5)の当初列挙(C1〜C6)に PWA は含まれておらず、「やらない」判断自体が未記録(沈黙)だった(敵対的レビューで判明。2026-07-13)。i18n([0121](0121-i18n-strategy.md))が用途依存として**明示的に exclusion 記録**されたのに対し、同じく用途依存の PWA が沈黙のままだと「意識的に線引きした」痕跡が残らない。本 ADR はその線引きを明文化する。

Next.js には Web App Manifest のファイル規約(`app/manifest.(json|ts)`)が存在するが、Service Worker / オフラインキャッシュは Next.js の自動組込み機構ではなく、fork 先の実装(または `@ducanh2912/next-pwa` 等の外部ライブラリ)を要する。PWA が有用かは**配信形態・オフライン要件・インストール可能性の要否に強く依存**する。

## 決定: boilerplate 本体に同梱しない(fork 先判断)

- **Web App Manifest / Service Worker / オフラインキャッシュ / インストール促進(A2HS)を boilerplate 本体に同梱しない**。用途依存のため fork 先で必要になった時点で判断する(exclusion)
- 導出根拠: [0011](0011-no-docker.md) の「用途未定の表示層」ロール + BACKLOG out of scope 原則([0121](0121-i18n-strategy.md) / [0052](0052-ui-component-policy.md) / [0060](0060-state-management.md) と同じ fork 先判断の論理)
- **fork 先が PWA を採用する場合の seam**(参考):
  - Web App Manifest は Next.js の **`app/manifest.(json|ts)`** ファイル規約で生成する([0044](0044-seo-metadata-strategy.md) のアイコン体系と接続。アイコンは `app/icon.*` / `apple-icon.*`)
  - Service Worker / オフラインキャッシュは Next.js の自動組込みがないため fork 先で実装する。外部ライブラリを使う場合も [0004](0004-library-management.md)(exact pin / `pnpm audit`)・[0021](0021-frontend-responsibility.md)(カーネル配置・命名規律)の枠内で行う

## exclusion の扱い

- 本 ADR は「意図的にやらない」判断の記録である([決定 5](../plan/pre-implementation-decisions.md) タクソノミー: exclusion = ADR)。fork 先が導入する分にはこの exclusion は障害にならない

## 関連 ADR

- [0011-no-docker.md](0011-no-docker.md) — 用途未定の表示層ロール(fork 先判断の根拠)
- [0121-i18n-strategy.md](0121-i18n-strategy.md)(C1)/ [0052-ui-component-policy.md](0052-ui-component-policy.md) / [0060-state-management.md](0060-state-management.md) — 同じ fork 先判断の exclusion 先例
- [0044-seo-metadata-strategy.md](0044-seo-metadata-strategy.md)(C7)— `manifest.*` / アイコン体系の seam(採用時)
