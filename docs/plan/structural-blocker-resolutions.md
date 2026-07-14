# 構造ブロッカー解決方針(実装フェーズ前)

作成: 2026-07-14 / 由来: Fable 5 サブエージェントによる**構造ブロッカー網羅検証**(ADR 群 + 74 件 triage の突き合わせ)
位置づけ: 「74 件(= [adr-gap-triage.md](adr-gap-triage.md))を実装しようとしたとき、現行アーキに **valid な置き場(カーネル/家/seam)が無いため詰まる**」型のブロッカーを事前に潰す。**全 5 件の解決方針をユーザ承認済(2026-07-14)**。ADR 本体への反映は最終整理フェーズで一括(下記チェックリスト)。

## 発見と解決(全 5 件・確定)

### 0. capabilities カーネル(横断 client hook の家)— ADR 0022 で解決済み

昇格ルール(横断要素を model/components/adapters へ)に **reactive な横断 client hook の出口が無かった**。→ 10 個目のカーネル **`capabilities`** 新設([0022](../adr/0022-capabilities-kernel.md))。responsibility = runtime(ブラウザ+FW)能力の client hook 供給・`"use client"` 固定。

### S1【カーネル級】client 側の外部接続境界が無い

0022 のミラーは「adapters=外部システム×server / capabilities=runtime×client」の**対角線だけ**を埋め、「**外部システム×client**」セルが空席だった。家無し = #7 client→BFF fetch / #56 WebSocket・SSE / #59 RUM 送信 / #60 client エラー送信 / #61 analytics 発火。0021 が adapters 例に挙げる「storage/analytics」が server-only 宣言と矛盾。

**決定**: `adapters` を **1 カーネル内 2 element に分割**(別カーネルにしない = 外部境界は 1 責務・server/client は実行文脈差 = element 属性):

```
src/adapters/
├── server/   element: adapters/server — server-only・config はここだけ・secret 有・backend client(0071)
└── client/   element: adapters/client — "use client"・config 不可・secret 無・remote のみ
```

- `adapters/server` → model/errors/logging/**config**
- `adapters/client` → model/errors/logging(config 不可)。中身 = 同一オリジン BFF fetch(#7)/ WebSocket・SSE(#56)/ analytics 送信(#61)/ telemetry 送信(#59/#60)
- **local ブラウザ API(#43 storage・#44 client cookie 読み)は adapters でなく `capabilities`**(clipboard #26 と同型 = browser runtime API)。adapters/client は remote のみ
- ESLint boundaries を 2 element に割り、secret/RSC 境界を**精緻化**(0022 の狙いは後退でなく前進)

### S2【追補】Route Handler の element 帰属が未定義(Accepted 同士の矛盾)

0021 依存マトリクス(`app → features のみ`)と 0030 受け手表(`Route Handler → adapters 直 import`)が矛盾。Server Action は `feature/actions.ts` の家をもらったが Route Handler は無い。

**決定**: `app` を **3 element に分割**(すべて App Router 特殊ファイル。Pages Router は [0040](../adr/0040-routing-rendering-strategy.md) / AGENTS.md / 公式 doc `route-handlers.md` line 25「Route Handlers = API Routes の equivalent・併用不要」で除外を裏取り済):

| element | 対象 | 許可 import |
| --- | --- | --- |
| `app/route-segment` | page/layout/loading/error(App Router UI) | `features` |
| `app/route-handler` | **`route.ts`**(= Pages API Routes の App Router 置換・唯一の HTTP 口) | `adapters/server` / errors / logging(**thin proxy・業務ロジック禁止** 0011/0015) |
| `app/metadata` | robots/sitemap/manifest 等 | `config` / model(起動・ビルド境界例外) |

### S3【seam の家】consent / flag の client 供給点が無い

0022 が「ポリシー状態は capabilities に置かず各 seam 所有」と退去させたが、退去先の物理の器が無かった(委譲先消失の型)。

**決定**: **新カーネル不要 — 3 分解して既存カーネルへ**:

1. **生の値読み** → `adapters` source 境界(server は `cookies()` / client raw は `capabilities`)
2. **セマンティクス + no-op 既定** → `adapters` の source adapter に同居(**滑走路成果物** = #61 no-op sink・#32 未同意で全 gate 既定・#62 flag 既定)
3. **供給** → 既定 stateless(RSC→props・[0060](../adr/0060-state-management.md) 忠実)/ 反応的の稀ケースのみ S4 layout Provider

→ 「seam の物理 = adapters source adapter + no-op 既定 + stateless props」で委譲先消失を閉じる。

### S4【追補】root layout への横断 UI / Provider mount 経路が無い

`<Toaster/>`・グローバル nav/footer・各 Provider を root layout に置く経路が無い(`app/route-segment` は features のみ・0022 の mount 例外は capabilities 限定)。

**決定**: **mount 例外を一般化 + layout/page を区別**(新カーネル不要):

- **`layout.tsx`(特に root)** = 横断 UI シェル(nav/footer/`<Toaster/>`)を `components` から / Provider を `components`・`capabilities`・S3 ポリシー seam から **薄く mount 可**(配置のみ・hook 呼び + データ配線は書かない = feature の仕事)
- **`page.tsx`** = `features` のみ(不変)
- 根拠 = root layout は「どの feature にも属さない **app シェル**の合成点」で page(=1 feature)と性質が違う
- 横断 UI 状態の帰属: トースト queue → `components`(UI 状態・`useToast()`)。テーマ → `capabilities`/`components`

## 決定の正 = 独立 ADR(2026-07-14・追補でなく独立起票)

S1〜S4 の**決定の実体は独立 ADR に起票済**(ユーザ判断「追補系は独立が望ましければ独立・**S ごとに 1 主題 = 1 ADR**」。採番は 2026-07-14 にブロック帯〈0001〜0155〉で確定)。既存 ADR への反映は**純機械的な整合**のみをバッチに残す。

- **[0024](../adr/0024-adapters-server-client-split.md)** = **S1** の正(adapters server/client 分割・2 軸モデル訂正)
- **[0025](../adr/0025-app-layer-elements.md)** = **S2** の正(app 3 element・Route Handler・Pages 除外)
- **[0031](../adr/0031-policy-state-supply.md)** = **S3** の正(consent/flag = source adapter + no-op 既定 + stateless props)
- **[0026](../adr/0026-layout-shell-mount.md)** = **S4** の正(layout の横断 UI/Provider mount 例外)
- capabilities = [0022](../adr/0022-capabilities-kernel.md) / 標準準拠・非ロックイン = [0010](../adr/0010-standards-and-non-lockin.md)

## ADR 反映チェックリスト(純機械反映・**2026-07-14 全て反映済**)

ユーザ承認のもとバッチ適用済み(当該 ADR 群はコミット前の未追跡ファイル group)。

- [x] **0020**: 9 → 10 カーネル宣言(intro カーネル列 / 構造図 / mermaid / go マッピング表に `capabilities`・adapters server/client・app 3 element / 関連 ADR)
- [x] **0021**: 責務テーブルに `capabilities` 行・adapters server/client・app 3 element・model 表示結果型(軽微 a)/ 依存マトリクスを 10 カーネル + app 3 element + adapters 2 element + features→capabilities に / 昇格 4 出口 / Enforcement element / 層別 README 10 カーネル / 関連 ADR に capabilities 系(0022/0024/0025/0026)
- [x] **0027**: 構造図に capabilities・adapters server/client / 「server/client 分割は RSC 境界の原理的分割」明記 / MSW 置き場 = `mocks/`(軽微 c)/ 10 カーネル
- [x] **0071**: `adapters` の server/client 面 → **0024** へ pointer(resilience は主に server 面)
- [x] **0022**: 「adapters ミラー」framing の 2 軸モデル訂正 / #43・#44 の capabilities 移管
- [x] **0030**: 受け手表に metadata routes 行 + Route Handler = `app/route-handler` element / Edge 互換 config スライスの所有を 0030 と明記(軽微 b)/ 10 カーネル
- [x] **0043**: 「proxy.ts は 10 カーネル外」に更新(9→10 波及)

## 軽微な帰属決定(2026-07-14 確定・ブロッカー未満)

Fable が「ブロッカー未満・要確認」とした 3 件。実装を詰まらせないが、loose end を残さないよう帰属を確定した:

- **a. `ActionState<T>` 型の帰属 = `model`**: 成功値 + field / form エラーを載せた**表示結果型**であり、`model`(表示 VO / 結果型)に置く。`errors` の sentinel を import するが、`errors` は transport 非依存を保つ(型を持ち込まない)。B8(`ActionState<T>` をコードで同梱)実装時にこの帰属で。
- **b. Edge 互換 config スライスの所有 = `0030`(config ADR)**: Edge / Node runtime の config スライス差は **0030 が所有**し、具体は実装 PR で吸収([0043](../adr/0043-middleware-policy.md) の proxy runtime とは相互参照のみ)。
- **c. MSW 生成物(#73/#74)の物理置き場 = `src/` 外の `mocks/`(または テスト co-location)**: B3(orval 生成の do-not-edit)と分離する。[0027](../adr/0027-directory-structure.md) の co-location 規約に一行を足す(B3 吸収時)。

これらは絶対に実装を詰まらせないため独立 ADR にはせず、バッチで既存 ADR へ一行ずつ反映する(下記チェックリスト)。

## 総評

**構造ブロッカーは capabilities + S1〜S4 の計 5 件で、全て解決方針確定(新カーネルは capabilities の 1 つのみ・他は既存カーネルの element 分割 or 追補で吸収)。** 実装フェーズ着手前に潰すべきは S1・S2(adapters 実装・0081 中継・#61 滑走路・ESLint boundaries の全 PR をブロックしていた)。以降、既知の構造ブロッカーは無い。
