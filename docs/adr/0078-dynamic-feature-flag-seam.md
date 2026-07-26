# 動的 feature flag・段階的配信 seam(A-B / 段階的公開)

[0030](0030-environment-variable-management.md) の env は **ビルド/起動時に凍結される immutable fail-fast** の値であり、**再デプロイなしで変えたい動的フラグ値**とは構造的に相性が悪い。本 ADR は、その env モデルが扱わない **動的 feature flag / A-B テスト / 段階的公開(triage #62)** を、**サービス非同梱(exclusion)+ 名前付き拡張点(seam)** として明文化する。flag 供給の物理的な「家」は既に [0031](0031-policy-state-supply.md)(source adapter + no-op 既定 + stateless props)が持ち、動的値の出所は [0071](0071-bff-api-integration.md)(runtime config 逃し先)が持つため、本 ADR はそれらを**再決定せず結線**し、**(a) 評価場所の既定**と **(b) 動的フラグ値の出所と [0030](0030-environment-variable-management.md) env との緊張の解消**、および **RSC キャッシュとの相互作用の保守的既定**のみを確定する。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。本 ADR は元 [0074](0074-runtime-communication-seam.md) が「0071 の request/response wrapper が扱わない runtime seam」という消極的括りで #56(双方向通信)と #62(動的 flag)を束ねていたものを、「1 ADR = 1 主題」方針に従い **#62 動的 feature flag / 段階的配信 seam を独立起票**して切り出したもの。内容自体はこの設計討議でユーザ確定済み。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

拡張点の遡及監査(triage #62)で、**env([0030](0030-environment-variable-management.md)・ビルド/起動時固定・immutable fail-fast)が動的フラグ値と相性が悪い**ことが指摘された。動的 feature flag / A-B / 段階的公開は「[0030](0030-environment-variable-management.md) の env 既定モデルの外側にある runtime 関心事」であり、seam なしで後入れすると [0021](0021-frontend-responsibility.md) の依存マトリクスに収まらない(段階的公開は RSC / キャッシュ / proxy すべてに触る横断関心事)。

この seam の**物理的な置き場**は、その後の構造ブロッカー解決で既に確定している:

- **#62 の flag 供給**は [0031](0031-policy-state-supply.md) が **source adapter(生値読み)+ no-op 既定 + stateless props** の 3 分解で確定済み。**動的フラグ値の出所(runtime config 逃し先)**は [0071](0071-bff-api-integration.md) が持つ(**評価場所を server 既定とする決定自体は本 ADR §1 が下す**。0071 は「値の出所」を、本 ADR は「評価場所」を確定する分担)。

したがって本 ADR は**新カーネルも新しい家も立てない**。既存の家を結線したうえで、なお未確定の 2 点 —— **評価場所の既定**、および **動的フラグ値の出所と [0030](0030-environment-variable-management.md) env の関係** —— を、設計思想([0010](0010-standards-and-non-lockin.md) 標準準拠・非ロックイン)からべき論で確定する。

なお、同じ「往復モデルの外側の runtime seam」として元 [0074](0074-runtime-communication-seam.md) に併記されていた **双方向/ストリーム通信(WebSocket / SSE・#56)** は、subject が異なるため [0074](0074-runtime-communication-seam.md) 側に残置し分離した。

## 決定

### flag / A-B / 段階的公開サービス本体は非同梱(exclusion)

SaaS(LaunchDarkly / Statsig / Unleash / GrowthBook 等)を boilerplate に埋め込まない(triage #62 / [0031](0031-policy-state-supply.md) のまま不変)。供給方針(生値読み + no-op 既定 + stateless props 供給)は [0031](0031-policy-state-supply.md) が確定済みであり、本 ADR は**再決定しない**。以下の 2 点のみ確定する。

### 1. 評価場所の既定 = server(vendor-independent 根拠付き)

フラグ評価は既定で **server 側(RSC / route handler / Server Action)** で行う(**server 評価を既定とする決定は本 ADR が下す**。[0071](0071-bff-api-integration.md) の runtime config 逃し先〈動的値の出所〉と結線する)。独立根拠:

- ① フラグ判定ロジックと SaaS SDK を **client bundle から排除**できる(バンドルサイズ)。
- ② client 評価で起きる **flag flicker / CLS を回避**できる(レイアウト安定)。

いずれもプラットフォーム中立な web パフォーマンス根拠であり、「フレームワーク推奨」ではない([0010](0010-standards-and-non-lockin.md) §2 の vendor-independent 正当化)。

### 2. 動的フラグ値の出所と [0030](0030-environment-variable-management.md) env の関係整理(緊張の解消)

「フラグ値を env に載せる」と [0030](0030-environment-variable-management.md)(env = ビルド/起動時に凍結・immutable fail-fast)と衝突する。本 ADR はこれを**衝突させずに分岐で解く**:

- **再デプロイ単位で固定するフラグ**(deploy 単位の kill switch 等)= **[0030](0030-environment-variable-management.md) の env / 目的別 config で持ってよい**(凍結が正しい振る舞い)。
- **再デプロイなしで変えたい動的フラグ** = env に載せない。[0030](0030-environment-variable-management.md) の周辺ルール「再デプロイなしで変えたい値は **BFF runtime config へ逃がす**」([0071](0071-bff-api-integration.md) 補足)に従い、**リクエスト時に source adapter(cookie / BFF runtime config / 外部サービス)から読む**([0031](0031-policy-state-supply.md) の source adapter)。

これにより [0030](0030-environment-variable-management.md) と本 ADR は**補完関係**になり矛盾しない(env は静的フラグ、runtime config / source adapter は動的フラグ)。具体ソース(cookie か BFF runtime config か外部か)は用途依存で [0031](0031-policy-state-supply.md) / 実装 PR / fork 先が持つ。

### 3. RSC キャッシュとの相互作用(保守的立場 + 保留)

ユーザ / コホートで変わるフラグ評価結果を、キャッシュ / PPR の static 出力へ**誤って焼き込まない**。フラグで分岐する内容は **dynamic(uncached)扱い、またはコホートを cache key に含める**ことを既定とする。なお Cache Components(PPR 既定化)は [0041](0041-cache-components-decision.md) が **0.0.x = `cacheComponents` 無効に確定済み**(v1/fork で再評価)。**フラグ評価 × cache key の具体設計は用途依存**のため、本 ADR では上記の保守的既定のみ定め、**具体は実装 PR へ委ねる**。

## 禁止事項

- ❌ flag / A-B / 段階的公開サービス本体を同梱すること(exclusion。[0031](0031-policy-state-supply.md) / [0131](0131-cookie-consent.md) と同型)
- ❌ **動的フラグ値を [0030](0030-environment-variable-management.md) の env / 目的別 config 経由に載せること**(env は凍結。動的値は runtime config / source adapter へ逃がす)
- ❌ フラグ評価ロジック / SaaS SDK を既定で client bundle に載せること(評価既定 = server。flicker / CLS 回避・バンドル排除)
- ❌ ユーザ / コホート依存のフラグ評価結果をキャッシュ / PPR static 出力へ焼き込むこと(dynamic 扱い or cohort を cache key に含める)

## 補足

- **採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**(元 0074 からの独立起票)。
- 本 ADR は元 [0074](0074-runtime-communication-seam.md) の §2 を「1 ADR = 1 主題」方針で切り出したもの。元 ADR 本文自身が「**2 主題(#56 / #62)を消極的括りで束ねており、グラブバッグ化の懸念から 2 ADR へ分割する余地がある**」と自認していた(→ 本分割で解消)。
- 本 ADR は保守的に **評価場所 = server 既定 + 動的値 = runtime config / source adapter 逃し + cache 焼き込み回避**の指針までを定め、具体機構(source の選択・cache key 設計)は実装 PR / fork 先へ委ねる。
- 本 ADR は [0140](0140-documentation-operations.md) のタクソノミーで **exclusion(+ 拡張点)** 分類に属する。exclusion 本体(非同梱宣言)と named seam(拡張点)を併記する型に従う。
- **v2 採用予定(局所ライブラリ・2026-07-14)**: SaaS 非同梱(exclusion + 拡張点)本体は不変。採用マトリクス([master-plan §1.2](../plan/master-plan.md))で動的 feature flag は **v2 = 局所ライブラリ採用**(用途依存)に振り分けられた。**flag 供給 seam(source adapter + no-op 既定 + stateless props〈0031〉/ 評価既定 = server / 動的値 = runtime config 逃し)は 0.0.x/v1 で敷済・SaaS 採用は v2**(既定 = env + adapter〈GrowthBook 等差替可〉・Thin)。採用時も本体は source adapter / no-op 既定 / server 評価既定を保持し、flag SaaS を [0010](0010-standards-and-non-lockin.md)(vendor-independent 正当化 + adapters/カーネル境界の裏で差替可能・vendor 直参照を feature/component に散らさない)/ [0004](0004-library-management.md)(exact-pin / `pnpm audit`)の枠内で置く。

## 関連 ADR

- [0074-runtime-communication-seam.md](0074-runtime-communication-seam.md)— 双方向/ストリーム通信 seam(#56)。本 ADR と元は同一 ADR で「往復モデルの外側の runtime seam」として併記されていた分割元
- [0031-policy-state-supply.md](0031-policy-state-supply.md)(S3)— flag 供給(source adapter + no-op + stateless props。本 ADR は再決定せず結線)
- [0071-bff-api-integration.md](0071-bff-api-integration.md)(B3)— 動的フラグ値の runtime config 逃し先(値の出所。本 ADR §1 の server 評価が結線する先。評価場所の既定は本 ADR が確定)
- [0030-environment-variable-management.md](0030-environment-variable-management.md)(A7)— env = ビルド/起動時固定(静的フラグの家)。動的フラグは runtime config へ逃がす境界
- [0041-cache-components-decision.md](0041-cache-components-decision.md) — Cache Components を 0.0.x 無効に確定(フラグ評価 × cache key 相互作用の依存先)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md)— 非ロックインの vendor-independent 正当化(server 評価既定の独立根拠)
- [0131-cookie-consent.md](0131-cookie-consent.md)— exclusion(+ 拡張点)分類の同型例
