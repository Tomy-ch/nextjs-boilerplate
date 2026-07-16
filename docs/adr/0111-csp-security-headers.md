# CSP・セキュリティヘッダ(実行時)

実行時のブラウザ側防御 —— **Content-Security-Policy(CSP)ポリシー本体 / per-request nonce 運用 / レスポンスセキュリティヘッダ(`X-Frame-Options` / `Referrer-Policy` / `Permissions-Policy` / `X-Content-Type-Options` / HSTS)の既定セットと配置先(`next.config.ts` の `headers()` vs `src/proxy.ts` vs PaaS/CDN)** を定める。[0110](0110-security-operations.md) が CI/ビルド実行時点で払える防御(サプライチェーン・SAST・秘密スキャン)を収録するのに対し、本 ADR は **実行時(リクエスト応答時)にしか払えない防御** の本体を 1 本に束ね、局所推論の起点を集約する。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。独立起票。相互参照(back-link)付与は同フェーズでまとめて行う([決定 5](../plan/pre-implementation-decisions.md))。本 ADR は triage #46 の「実行時本体=新規 ADR」側に対応する([adr-gap-triage.md](../plan/adr-gap-triage.md))。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

[adr-gap-audit.md](../plan/adr-gap-audit.md) #46 は「CSP / セキュリティヘッダ」を空白領域として挙げた。[0110](0110-security-operations.md)(B10)はサプライチェーン/CI 系防御(Dependabot / gitleaks / Trivy / CodeQL / 依存監査)のみで、**実行時のブラウザ側防御が丸ごと空白**であり、[0043](0043-middleware-policy.md)(C6)は「Proxy でヘッダ操作が可能」とのみ述べてポリシー本体・配置方針を持たない。後付けの CSP は既存の inline script/style との衝突で最も導入コストが高く、初期に方針を固めておく価値が高い。

[adr-gap-triage.md](../plan/adr-gap-triage.md) は #46 を **複合 disposition** に仕分けた —— (a) **CSP 適合チェック**(inline 違反検出・ヘッダ well-formed 検証・回帰)は CI 時点で払えるため [0110](0110-security-operations.md) が逆参照ゲートで持つ / (b) **CSP ポリシー内容 + nonce の実行時運用 + ヘッダ配置**は実行時で CI では払えないため **新規 ADR(本 ADR)**。新規化の主理由は「shift-left で払えない」ことに加え、**局所推論可能性** —— 「このリポの CSP はどこで・何を enforce するか」を問う読み手が 0110/0043/0010 に散らばらず本 ADR 1 本で完結して読めることを最大化するためである。

本リポジトリは **Next.js 16 / React 19**。実装前に `node_modules/next/dist/docs/` を確認した結果(AGENTS.md「This is NOT the Next.js you know」)、以下を前提とする(`01-app/02-guides/content-security-policy.md`):

- **nonce ベース CSP は `src/proxy.ts` で per-request に nonce を生成**し、`Content-Security-Policy` ヘッダ + `x-nonce` リクエストヘッダに載せる。Next.js は SSR 時に CSP ヘッダから nonce を抽出し、フレームワークスクリプト・ページ JS・生成 inline・`<Script nonce>` に **自動付与**する
- **nonce を使うと全ページが dynamic rendering を要求**する(nonce はリクエストごとに変わるため)。**静的最適化・ISR は無効化され、CDN キャッシュ不可**となり、**Partial Prerendering(PPR)/ Cache Components とは非互換**である
- **nonce を使わない CSP は `next.config.ts` の `headers()`** で静的に付与できる。ただし Next.js の inline を許すには `'unsafe-inline'`(防御が弱い)か、**実験的な SRI(hash ベース・App Router 限定)** が要る。SRI は静的生成・CDN キャッシュを保てるが `experimental` である
- 静的なセキュリティヘッダ(`X-Frame-Options` / `Referrer-Policy` / `Permissions-Policy` / `X-Content-Type-Options` / HSTS)は **`next.config.ts` の `headers()`** で宣言的に付与でき、レンダリングモードに依存しない

## 決定

### 1. 標準準拠と非ロックインの位置づけ([0010](0010-standards-and-non-lockin.md) 適用)

- CSP・各セキュリティヘッダは **W3C / IETF の Web プラットフォーム標準**(CSP Level 3 / RFC 6797 HSTS / Referrer-Policy / Permissions-Policy)であり、**ブラウザが enforce する**。seam(ヘッダを吐く場所)は Next.js のデファクト(`next.config.ts` `headers()` / `proxy.ts` のヘッダ操作)に乗る([0010](0010-standards-and-non-lockin.md) §1・[0043](0043-middleware-policy.md))が、**防御の実体は Next.js に依存しない**。
- **vendor-independent 正当性材料**(0010 §2 の必須記載。「Next.js が推奨するから」で終わらせない): CSP = XSS・clickjacking・コードインジェクションへの **多層防御**(`script-src` で任意スクリプト実行を、`frame-ancestors`/`X-Frame-Options` で clickjacking を、`object-src 'none'`/`base-uri 'self'` で注入面を絞る)/ HSTS = 中間者・ダウングレード攻撃の緩和 / `X-Content-Type-Options: nosniff` = MIME スニッフィング由来の XSS 緩和 / `Referrer-Policy` = リファラ経由の情報漏洩の最小化。**運用テスト(0010 §2)**: 「Next.js を正当化から抜いても、これらのヘッダは正当か?」→ **Yes**(任意の HTTP サーバ・CDN 上で等価に有効)。ゆえに標準に乗っても縛られていない = 非ロックイン。

### 2. 既定で敷く静的ヘッダ(レンダリングモード非依存・`next.config.ts` `headers()`)

以下は **リクエスト内容に依存しない静的ヘッダ**であり、`next.config.ts` の `headers()` で全経路に付与する。静的生成・SSR いずれとも両立し、[0040](0040-routing-rendering-strategy.md)「特定レンダリングモードを強制しない」を侵さない。boilerplate 本体の **既定セット**とする:

- `X-Frame-Options: DENY`(+ CSP `frame-ancestors 'none'` と二重掛け。埋め込みが要る fork は緩める)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy`: **deny-by-default 寄りの最小許可**(未使用の強力機能 = `camera` / `microphone` / `geolocation` 等を明示 off。使う fork が開ける)
- `Strict-Transport-Security`: **保守的既定**(`max-age` を控えめに設定)。`includeSubDomains` / `preload` の付与と PaaS/CDN 側での終端は **fork 先判断**(下記 §4)

### 3. CSP ポリシー本体(ディレクティブ基線)

CSP の **ディレクティブ基線**を本 ADR の決定として固定する(Next.js 公式の strict CSP 例に準拠。vendor-independent な最小権限の具体化):

```text
default-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```

- `script-src` / `style-src` の inline 許可方式(nonce / `'unsafe-inline'` / SRI hash)は **enforce seam により分岐**する(下記 §4)。外部オリジン(タグマネージャ・決済 SDK 等)の追加は、fork が [0131](0131-cookie-consent.md)(同意ゲート)と連動して `script-src`/`connect-src`/`img-src` に足す拡張点とする(サードパーティスクリプト規約は triage #50 = rules.md)。
- 導入初期の衝突検出のため、**`Content-Security-Policy-Report-Only` での段階導入を推奨**する(enforce へ切り替える前に違反を可視化)。

### 4. enforce seam の 2 系統と既定(名前付き拡張点)

CSP は「別ドメイン(infra/backend)の責務」ではなく **表示層が吐く実行時防御** なので、**名前付きの拡張点を 2 系統敷く**。どちらを既定にするかは [0040](0040-routing-rendering-strategy.md) の制約で決める:

- **seam A(既定・静的)= `next.config.ts` `headers()` に非 nonce CSP**。inline は当面 `'unsafe-inline'`(弱いが静的・CDN と両立)か、strict 化が要れば実験的 SRI へ。**レンダリングモードを固定しない**([0040](0040-routing-rendering-strategy.md))ため、これを boilerplate の既定とする。
- **seam B(opt-in・strict)= `src/proxy.ts` で per-request nonce**。`strict-dynamic` + nonce の strict CSP を敷けるが、**全ページを dynamic rendering に固定**し、静的最適化・ISR・CDN キャッシュ・PPR/Cache Components を犠牲にする。ゆえに **既定にはしない**。厳格な脅威モデル(機微データ・`'unsafe-inline'` 禁止のコンプライアンス要件)を持つ fork が **明示的に opt-in** する拡張点として名前を与える。
- **既定の理由**: nonce CSP を既定で `proxy.ts` に載せると全経路が dynamic に倒れ、[0040](0040-routing-rendering-strategy.md)「モードを強制しない」・[0043](0043-middleware-policy.md)「Proxy は薄い last resort」の双方に反する。boilerplate は**開いておく**側に倒し、strict 化は fork の選択に委ねる。
- seam B を採る場合も [0043](0043-middleware-policy.md) の制約を守る: `proxy.ts` は薄く保ち、nonce 生成とヘッダ設定に限る(業務ロジック・重い処理を書かない)。`matcher` で prefetch・静的アセット(`_next/static` 等)を除外する(Next.js 公式ガイダンス)。

### 5. ヘッダ配置先の分担(`next.config.ts` vs `proxy.ts` vs PaaS)

| ヘッダ種別 | 既定の配置先 | 備考 |
| --- | --- | --- |
| 静的ヘッダ(§2) | `next.config.ts` `headers()` | リクエスト非依存。宣言的・実行時コストなし |
| 非 nonce CSP(seam A) | `next.config.ts` `headers()` | 静的・CDN 両立(既定) |
| nonce CSP(seam B) | `src/proxy.ts` | per-request。opt-in。dynamic 固定 |
| HSTS の終端強制 | **PaaS/CDN も可(境界 seam)** | edge で一括付与する構成もある。二重掛けの整合は fork が確認 |

- **PaaS/CDN での付与は「境界 seam」**として認める(HSTS・一部の静的ヘッダは配送層で終端する構成が現実的)。boilerplate 本体は `next.config.ts` を SSOT とするが、**PaaS 側と重複・矛盾しない**ことを fork がデプロイ時に確認する(同一ヘッダの二重付与を避ける)。

### 6. CI 適合スライスは 0110 が逆参照ゲートで持つ(本 ADR は実行時本体)

- 本 ADR は **実行時本体**(ポリシー内容・nonce 運用・配置)のみを所有する。**CSP 適合の CI チェック**(inline script/style 違反の検出・`Content-Security-Policy` ヘッダの well-formed 検証・回帰)は CI 時点で払える防御であり、[0110](0110-security-operations.md) の shift-left 原則に属する。したがって **0110 側に CI 適合ゲートを 1 本追加し、本 ADR を逆参照(`> Rationale: 0111`)する**構成とする(triage #46 の複合 disposition)。
- **本 ADR 単独では #46 は完結しない**: 0110 は Accepted の Protected Documentation のため、0110 本体への CI ゲート追記は **ユーザ承認を経た別作業**である(下記「補足」+ 本 ADR は実行時本体側のみを確定する)。

## 禁止事項

- ❌ nonce ベース CSP(`proxy.ts`)を boilerplate の **既定**にすること(全経路を dynamic に固定し [0040](0040-routing-rendering-strategy.md)「モード非強制」に反する。strict 化は fork の opt-in = seam B)
- ❌ CSP・セキュリティヘッダを「Next.js が推奨するから」だけで正当化すること([0010](0010-standards-and-non-lockin.md) §2。vendor-independent な多層防御根拠を欠く)
- ❌ seam の形(nonce の載せ方・ヘッダ配置)を独自発明・中立化すること([0010](0010-standards-and-non-lockin.md) §1。Next.js デファクト = `headers()` / `proxy.ts` に乗る)
- ❌ `proxy.ts` に nonce 生成・ヘッダ設定以外の業務ロジックを書くこと([0043](0043-middleware-policy.md) 薄い境界。seam B 採用時も遵守)
- ❌ CSP を「別ドメインの責務」として沈黙で省略すること(表示層の実行時防御。seam A/B を名前付きで敷く)
- ❌ `script-src`/`style-src` に恒常的な `'unsafe-inline'` を残したまま「strict CSP を敷いた」と称すること(弱い許可の明示。strict を謳うなら nonce か SRI へ)

## 補足

- **0110 への CI ゲート追加は未実施**。0110 は Protected Documentation のため、CSP 適合チェック(inline 違反検出・ヘッダ well-formed 検証)を 0110 の Security グループに 1 本追加する変更案は、ユーザ承認を経て別作業で適用する。本 ADR(実行時本体)と 0110 ゲート(CI 適合スライス)は #46 の**両輪**であり、**片側のみでは #46 は閉じない**。
- **#47 CSRF / Server Actions の origin 検証**(`serverActions.allowedOrigins` / SameSite cookie 前提)は triage で **rules.md(主 Rationale [0070](0070-backend-role-separation.md))** に仕分けられており、本 ADR には**同居させない**(triage は同居を「要検討」とした)。CSRF は認証・cookie 運用と境界を接するが、**認証のフロント側 seam ADR([0079](0079-auth-frontend-seam.md))が #47 CSRF / origin 検証を「rules.md 側・本 ADR 非同居(主 Rationale = 0070)」と確定済み**。本 ADR は CSP・レスポンスヘッダの実行時本体に射程を限る。
- ヘッダ実装(`next.config.ts` `headers()` への追加・seam B の `proxy.ts` 追加)は本 ADR Accepted 後の実装 PR。`next.config.ts` は root config(AGENTS.md AI Modification Scope の保護対象)であり、変更はユーザ指示のもとで行う。
- 本 ADR は [0140](0140-documentation-operations.md) のタクソノミーで **decision** 分類に属する(実行時防御の選定=決定)。日常強制される rule(サードパーティスクリプト #50・XSS/サニタイズ #48 等)は rules.md 側に置き、本 ADR を Rationale として逆参照する。

## 関連 ADR

- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — 標準準拠(seam は Next.js デファクトに乗る)+ 非ロックイン正当化(vendor-independent 材料の必須記載)。本 ADR の判断軸
- [0110-security-operations.md](0110-security-operations.md)(B10)— CI/ビルド時点の防御(shift-left)。CSP 適合の CI ゲートを逆参照で持つ(#46 の CI 適合スライス側)
- [0043-middleware-policy.md](0043-middleware-policy.md)(C6)— `proxy.ts` = 薄い last resort。seam B(nonce CSP)の実装制約
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md)(A4)— レンダリングモード非強制。nonce CSP を既定にしない根拠
- [0041-cache-components-decision.md](0041-cache-components-decision.md)— Cache Components は 0.0.x=無効に確定(nonce CSP の dynamic 化と非互換のため既定にしない根拠を補強)
- [0131-cookie-consent.md](0131-cookie-consent.md)(C9)— 同意ゲート(外部スクリプトの CSP allowlist と連動)
- [0070-backend-role-separation.md](0070-backend-role-separation.md)(A2)— #47 CSRF/origin 検証の主 Rationale(本 ADR には同居させない)
- [docs/plan/adr-gap-triage.md](../plan/adr-gap-triage.md) — #46 の複合 disposition(実行時本体=本 ADR / CI 適合=0110 逆参照ゲート)
