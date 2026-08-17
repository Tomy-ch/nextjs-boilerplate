# 認証のフロント側 seam

**認証本体(IdP・ユーザDB・資格情報検証・トークン発行・session の永続実装)は本 boilerplate の out of scope である**([0070](0070-backend-role-separation.md))。この宣言を前提に本 ADR は、fork 先がどの認証プロバイダを選んでも変わらない **フロント側の seam(接続点)の形** のみを定める。すなわち session の保管場所規約 / 認可 2 層(optimistic + 確定認可)の分担 / 保護ルートの表現 / 未認証時リダイレクトと `returnUrl` / ログアウト時の状態破棄を、[0021](0021-frontend-responsibility.md) のカーネル上の座標として確定する。seam の形は発明せず、**Next.js 公式 auth ガイドの文書化パターンに乗る**([0010](0010-standards-and-non-lockin.md) §1)。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。独立起票。本 ADR の内容自体はこの設計討議でユーザ確定済み。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

認証は out of scope でありながら、**seam なしでは保護ページが 1 枚も書けない**という点で、out-of-scope 領域の中で最も「seam の欠落」が濃い(triage #45)。関連する断片は既に複数 ADR に散っている:

- [0070](0070-backend-role-separation.md)(A2)— 「認証・セッションの具体モデルは fork 先判断」「thin proxy / token 交換の seam は許す」「確定的な認可はデータ境界」
- [0043](0043-middleware-policy.md)(C6)— 「`proxy.ts` は optimistic チェックのみ / 確定認可はデータ境界 / Node.js runtime / 唯一の防御線にしない」
- [0021](0021-frontend-responsibility.md) — `adapters/server`(secret 可・`server-only`)/ `model`(表示用 VO)/ app の thin 原則
- [0040](0040-routing-rendering-strategy.md)(A4)— Server Component 既定 / `"use client"` を葉へ / Server Action は編成のみ

これらは各 ADR の関心の副産物として断片化しており、「保護ページをどう書くか」を問う読み手は 4 本を横断せねばならず **局所推論が崩れている**。本 ADR はこの断片を **Next.js 文書化パターン**として 1 本に束ね、認証 seam の推論起点を一本化する。

**裏取り元**: `node_modules/next/dist/docs/01-app/02-guides/authentication.md`(実装前確認。「This is NOT the Next.js you know」— Next.js 16)。同ガイドの Authorization 節は (1) httpOnly session cookie に最小 payload を格納、(2) 認可を 2 層(optimistic checks with Proxy〈optional〉+ Data Access Layer の `verifySession()` を React `cache()` で memo 化した確定認可)、(3) DTO で必要データのみ返す、を推奨形として文書化している。

**0070 の中立との整合(triage #45 で確定した論点)**: 0070 が守る中立は **プロバイダ中立**であって **seam の形の中立ではない**。Next.js 自身が httpOnly cookie を標準推奨している以上、それに乗るのは特定方式の先取りではなく **プラットフォーム標準準拠**([0010](0010-standards-and-non-lockin.md) §1)であり、0070 の「特定の認証・セッションモデルを本体に前提として組み込まない」とは衝突しない。本 ADR が固定するのは seam の形(座標)のみで、プロバイダ・session 実装詳細(stateless vs DB / 暗号化方式)は fork 先に委ねる。

## 決定

### 1. session の保管 = httpOnly cookie / payload 最小

- session の保管場所の seam は **httpOnly cookie**(Next.js `cookies()` API)とする。cookie は **server で set** し、`httpOnly` / `Secure` / `SameSite` / `Max-Age`(or `Expires`)/ `Path` を既定属性とする(具体既定値・アプリ cookie 規約は rules.md #44 が保持)。
- **payload は最小**(id / role 等の後続リクエストで使う一意データのみ)。PII(電話番号・メール・カード情報)や機微情報(パスワード)を **cookie に入れない**。
- **vendor-independent 正当性材料**(0010 §2 必須):
  - **httpOnly = XSS によるトークン窃取の緩和** — client-side JS から cookie を読めなくすることで、XSS 起点の session 窃取という web 一般の攻撃面を塞ぐ。これは Next.js 固有の話でなく MDN / OWASP 由来の web セキュリティ基本原理である。
  - **最小 payload = 最小権限(least privilege)/ 最小データ露出** — cookie は各リクエストで送出され改竄面でもあるため、載せる情報を必要最小に絞ることは attack surface と情報漏洩を減らす一般原則である。
- session 実装詳細(stateless JWT 風 vs DB session id / 暗号化・署名方式)は **fork 先判断**([0070](0070-backend-role-separation.md))。boilerplate 本体は特定方式を組み込まない。

### 2. 認可は 2 層(optimistic + 確定)/ 確定認可はデータ源に最も近い所

Next.js 文書化パターンに乗り、認可を **2 層**に分ける:

- **optimistic(楽観)層 = `proxy.ts`**(optional・[0043](0043-middleware-policy.md))— cookie の session のみを読み、権限ベースの **リダイレクト / UI 出し分け**に使う。**DB / データ源参照は禁止**(Proxy は prefetch 含む全 route で走るため。cookie 読みは `req.cookies.get(...)` に留める)。**唯一の防御線にしない**。Node.js runtime([0043](0043-middleware-policy.md))。
- **確定認可層 = Data Access Layer(DAL)**— session を検証する `verifySession()` を **`adapters/server`**([0021](0021-frontend-responsibility.md) / [0024](0024-adapters-server-client-split.md))に置き、**React `cache()` で 1 render pass 内を memo 化**する。データ取得 / Server Action / Route Handler は必ずこの `verifySession()` を通してから進む。「security checks はデータ源に最も近い所で行う」= **確定認可の本丸はデータ境界**([0070](0070-backend-role-separation.md) / [0043](0043-middleware-policy.md) と一貫)。
- **カーネル座標の導出**(べき論): `verifySession()` は session cookie(`server-only`)と secret を扱う **remote/runtime 境界 = `adapters/server`** に属する(secret を持てる唯一の実行層 = `adapters/server`。[0021](0021-frontend-responsibility.md) 依存マトリクス / [0024](0024-adapters-server-client-split.md))。DAL を `adapters/server` に置くことで「session verify は境界アダプタが所有し、内側の層(`model` / feature 純粋ロジック)は session を知らない」が保たれる(型漏洩禁止・[0020](0020-adopted-architecture.md))。
- **vendor-independent 正当性材料**(0010 §2 必須):
  - **データ境界での確定認可 = 多層防御(defense in depth)** — Proxy(edge/入口)の楽観チェックは最適化配置(CDN)や prefetch の都合で信頼の単一点にできないため、検査を **データ源直近**に置いて最終防御線とする。これは「認可はリソースアクセス直前に行う」という web セキュリティ一般原則であり、Next.js を正当化から抜いても成立する(0010 運用テスト: Yes)。

### 3. DTO / 露出データの最小化

- session / user データを内側(Client Component / view)へ渡す際は、**DTO で必要フィールドのみを返す**。user オブジェクト全体(パスワード・電話番号等を含み得る)を渡さない。
- **カーネル座標**: DTO の形(公開してよい view 用の型)は **`model`**(表示用 VO / view 型)が所有し、DTO への変換(shaping・可視性判定)は所有境界 = **`adapters/server`** で行う(生成型・外部型を内層へ漏らさない変換の所有境界。[0070](0070-backend-role-separation.md) 境界値所有 / [0020](0020-adopted-architecture.md))。
- **vendor-independent 正当性材料**: **DTO = 最小権限 / 最小露出** — client に渡るのは「表示に必要な安全なフィールド」に限定され、over-fetch した機微データの client 漏洩を構造的に防ぐ。これも web 一般原則で Next.js 非依存。

### 4. 保護ルートの表現 / チェックの各所配置

- 保護は **各所でチェック**する(layout / page / leaf / Server Actions / Route Handlers)。`proxy.ts` の optimistic リダイレクトは入口の pre-filter に過ぎず、各データアクセス点で `verifySession()`(DAL)を通すことを既定とする。
- app(route / page)は **thin driving adapter** のまま([0040](0040-routing-rendering-strategy.md) / [0021](0021-frontend-responsibility.md))。保護のための編成(verifySession 呼び出し → 分岐 → feature 呼び出し)は **feature の server 関数 / RSC**([0021](0021-frontend-responsibility.md))が行い、`page.tsx` に認可ロジックを直書きしない。
- **静的ルートの注意**: build 時に取得され全ユーザで共有される静的 route は DAL(request 時検証)が効かないため、その保護は `proxy.ts`(optimistic)側で行う(Next.js ガイド注記)。

### 5. 未認証リダイレクト / `returnUrl` / ログアウト時の状態破棄

- 未認証時のリダイレクト先(サインイン route)と復帰用 `returnUrl`(元 URL の保持・検証)の規約は seam として名前を付けて残す。**open redirect を避けるため `returnUrl` は同一 origin の相対パスに限定検証する**(web 一般の入力検証)。
- ログアウトは **session cookie の破棄(server)+ client 側の派生状態・キャッシュの teardown** を伴う。破棄の起点は `adapters/server`(cookie 削除)に置く。
- サインイン UI・session 更新(refresh)の具体は §6 の Resolver に閉じる。本 ADR は座標(どの層が何を所有するか)と拡張点の名前を敷く。

### 6. 動く最小 session 機構を本体へ同梱する(Resolver IF 方式)

**IF 定義だけを置いて実装を fork 先に丸投げしない。** 使われない IF は腐り、実装時に必ず書き直されるため、**既定実装を 1 つ同梱して実際に動かす**。禁止事項の「特定の session 実装詳細を本体に前提として組み込まない」は、次の切り分けで満たす。

- **コアに残すもの(fork 先が書き直さない部分)** — seam の座標 / 保護ルート判定 / `returnUrl` の検証 / ログアウト時の状態破棄 / RBAC ヘルパ / `verifySession()` の呼び出し規約
- **Resolver の裏に隠すもの(各社の事情が入る部分)** — session の暗号化・署名方式 / OIDC クライアントの実装 / トークンの保管形式。これらは **Resolver IF** の内部処理とし、fork 先は Resolver を差し替えるだけで自社方式へ移行できる
- **既定実装を 1 つ同梱する**。サンプルが実際にこの既定 Resolver を使う(= 設置面が実在する)ため、空の IF 定義にはならない
- 認証フローは **Authorization Code + PKCE** とし、**Route Handler(`/api/auth/*`)が IdP と直接やりとりする**。ブラウザが持つのは httpOnly の BFF session cookie のみで、**Access Token をブラウザへ露出しない**。画面側の実装は「ログインボタン → `/api/auth/login` へ遷移」に留める
- 認証が要る API 呼び出しは、**BFF 経由で Bearer が自動付与される前提**で実装する(個別に Authorization ヘッダを組み立てない)
- **401 = 未ログイン / セッション切れ → サインインへ**、**403 = 権限不足 → 導線ごと出し分け**([0080](0080-error-handling.md) の分類に対応させる)
- Resolver の IF 形状 / 既定実装のライブラリ選定 / refresh の扱い / role の取得元は**実装 PR で確定**する([v1 実装計画](../plan/v1-implementation-plan.md) P5-4)

### 7. 未認証時の状態を、ログイン成立の時点で引き継ぐ

未認証のまま操作を始められる機能は、ログイン成立の時点でその状態を認証済みの主体へ**引き継ぐ**必要がある。§5 がログアウト時の破棄を扱うのに対し、本節は逆向きの接続点を敷く。

- **引き継ぎ元の識別子は httpOnly cookie に置き、BFF が持つ**。ブラウザへ露出させない理由は §1 の session と同じ(XSS 起点の窃取の緩和)。**session cookie とは別の cookie** にする — 未認証でも発行され、寿命も主体も session と一致しないため、session payload へ混ぜると §1 の「payload は最小」に反する。用途接頭辞と `Secure` / `HttpOnly` / `SameSite` / `Max-Age` の明示は `rules.md` #44 に従う。
- **引き継ぎを起こすのは `/api/auth/*` の callback ただ 1 箇所**。未認証時の識別子と確立直後の session が同時に手元にあるのはここだけで、1 回の認証往復につき 1 回だけ走る。`proxy.ts` は不可(§2 / [0043](0043-middleware-policy.md) — optimistic 層に副作用を置かない)。画面側からも呼ばない(ブラウザは Access Token を持たない。§6)。
- **引き継ぎの失敗でログインを失敗させない**。ログインの成否は認証の成否で決まる。引き継ぎは付随する処理であり、失敗はログに残して利用者にはログイン成功として見せる。
- **引き継ぎの規則はバックエンドが持つ**([0070](0070-backend-role-separation.md))。合算・上限・優先といった判断は業務ロジックであり、BFF は起点を与えるだけで規則を実装しない。
- **引き継ぎの結果は BFF が受け取れる形にする**。切り捨てや丸めなど利用者へ知らせるべき結果が生じうる場合、バックエンド内部の認証完了フックに寄せると報告先が無くなる。表示するかどうかは画面の判断に残す。
- **引き継ぎ後、元の識別子の cookie は破棄する**。引き継ぎ済みの識別子が残ると、二重適用の経路になり、引き継ぎ先が他者の主体である場合には到達経路にもなる。ログアウト時の teardown(§5)にも含める。

**vendor-independent 正当性材料**([0010](0010-standards-and-non-lockin.md) §2): 引き継ぎを認証往復の**片側 1 箇所**に閉じるのは、同じ状態遷移を複数の起点から起こすと二重適用と競合の面が増えるという一般原則(単一の書き込み経路)による。失敗でログインを落とさないのは、**関心の分離** — 認証の可否を、認証と無関係な処理の成否に従属させないこと。

## 禁止事項

- ❌ 認証 seam の形を独自発明・中立化すること(Next.js 文書化パターン = httpOnly cookie / optimistic + DAL / DTO に乗る。[0010](0010-standards-and-non-lockin.md) §1)
- ❌ 本 ADR の決定を「Next.js が推奨するから」だけで正当化すること(vendor-independent 材料 = httpOnly:XSS 緩和 / データ境界:多層防御 / DTO・最小 payload:最小権限 を本体に添える。[0010](0010-standards-and-non-lockin.md) §2)
- ❌ 特定の認証プロバイダ・IdP・session 実装詳細(暗号化方式 / stateless vs DB)を **Resolver の外**へ組み込むこと(§6。既定実装は Resolver の裏に閉じ、差し替え可能に保つ。[0070](0070-backend-role-separation.md))
- ❌ Access Token をブラウザ(client JS / localStorage / 非 httpOnly cookie)へ露出させること(§6)
- ❌ 設置面のない空の IF / port 定義だけを置いて実装を持たないこと(§6)
- ❌ `proxy.ts` を確定認可の主機構・唯一の防御線にすること / Proxy 内で DB・データ源を参照すること(optimistic・cookie 読みのみ。[0043](0043-middleware-policy.md))
- ❌ 確定認可(`verifySession()` / DAL)を `adapters/server` 以外に置くこと / session・secret を内側の層(`model` / feature 純粋ロジック / client)へ漏らすこと([0021](0021-frontend-responsibility.md) / [0024](0024-adapters-server-client-split.md) / [0020](0020-adopted-architecture.md))
- ❌ cookie payload に PII・機微情報を載せること / user オブジェクト全体を DTO なしで client へ渡すこと
- ❌ `page.tsx` / `layout.tsx` に認可の編成ロジックを直書きすること(thin driving adapter。編成は feature。[0040](0040-routing-rendering-strategy.md))
- ❌ `returnUrl` を検証せず外部 URL へリダイレクトすること(open redirect。同一 origin 相対パスに限定)
- ❌ 未認証時の識別子をブラウザから読める形(localStorage / 非 httpOnly cookie)で持つこと / session cookie の payload へ混ぜること(§7)
- ❌ 引き継ぎを callback 以外(`proxy.ts` / 画面 / 複数の起点)から起こすこと / 引き継ぎの失敗でログインを失敗させること(§7)
- ❌ 引き継ぎの規則(合算・上限・優先)をフロントに実装すること(業務ロジックはバックエンド。§7 / [0070](0070-backend-role-separation.md))

## 補足

- 本 ADR は **seam の座標(どの層が session verify / DTO / cookie を所有するか)** に加えて、**動く最小 session 機構の同梱**(§6 Resolver IF + 既定実装 1 本)を確定する。boilerplate 本体が持つのは既定実装であって「唯一の実装」ではない。
- **#47 CSRF / origin 検証の同居は本 ADR では行わない**(triage で「要検討」)。CSRF(Server Actions `allowedOrigins` / SameSite cookie 前提)は triage 一次分類 **rule** であり、`docs/rules.md`(0140 方針・要新設)#47 が主 Rationale = 0070 で持つのが素直。本 ADR の httpOnly / SameSite cookie 前提が CSRF rule の土台を提供する関係のみを明記し、規約本体は同居させない([0140](0140-documentation-operations.md) 「decision と rule を分ける」タクソノミー)。
- **CSP / セキュリティヘッダ(#46・別 ADR 予定)との境界**: 認証 seam(本 ADR)と CSP 実行時本体(別 ADR)は別関心。cookie 属性・認可分担は本 ADR、`Content-Security-Policy` / `X-Frame-Options` 等のヘッダ配置は CSP ADR が所有する。両者を同居させない(局所推論の維持)。
- **既存 ADR 本体は編集しない**(0021 / 0040 / 0070 / 0043 は Accepted の Protected Documentation)。本 ADR は片方向参照で断片を集約するが、**旧 ADR からの back-link(相互参照)付与は AGENTS.md 整合 / v1 大規模整理フェーズでまとめて行う**。それまで局所推論の起点一本化は本 ADR → 旧 ADR の一方向に留まる(下記 flags)。
- 本 ADR は [0140](0140-documentation-operations.md) タクソノミーにおいて **decision**(seam 定義)分類に属する。日常強制される rule(cookie 属性既定値 = #44 / CSRF = #47)は `docs/rules.md` 側が持つ。

## 関連 ADR

- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — 標準準拠(§1 seam はデファクトに乗る)/ 非ロックイン判定(§2 vendor-independent 正当性材料の必須化)。本 ADR の 2 原則の土台
- [0070-backend-role-separation.md](0070-backend-role-separation.md)(A2)— 認証は out of scope / thin proxy・token 交換の seam / 確定認可はデータ境界(プロバイダ中立の意味 = 本 ADR の前提)
- [0043-middleware-policy.md](0043-middleware-policy.md)(C6)— `proxy.ts` = optimistic のみ / Node.js runtime / 唯一の防御線にしない(認可 optimistic 層の所有)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — `adapters/server`(DAL / secret / `server-only`)/ `model`(DTO view 型)/ app の thin 原則(カーネル座標の SSOT)
- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md) — `adapters/server`(secret 可)vs `adapters/client`(secret 不可)。DAL が server 面に属する根拠
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md)(A4)— Server Component 既定 / `page.tsx` thin / Server Action 編成のみ(各所チェックの配置根拠)
- [0020-adopted-architecture.md](0020-adopted-architecture.md) — 型漏洩禁止(session・secret を内層へ漏らさない)
- [0140-documentation-operations.md](0140-documentation-operations.md) — decision / rule タクソノミー(#44 cookie 属性・#47 CSRF は rules.md 側)
