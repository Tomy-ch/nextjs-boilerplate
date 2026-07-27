# adapters の server/client 分割と client 側外部接続境界

[0071](0071-bff-api-integration.md) が `adapters`(BFF / API 統合)の中身を、[0022](0022-capabilities-kernel.md) が `capabilities`(client runtime hook)を定めたが、両者を「`adapters` = 外部システム × server / `capabilities` = runtime × client」というミラーで対にした結果、**「外部システム × client」セルが空席**になっていた(構造ブロッカー S1)。ブラウザから外へ出る IO(client→BFF fetch / WebSocket・SSE / analytics・telemetry 送信)を置く家が無い。

本 ADR は、この空席 = **client 側の外部接続境界**を、`adapters` を **1 カーネル内 2 element に分割**することで確定する(構造ブロッカー **S1**)。あわせて [0022](0022-capabilities-kernel.md) の「ミラー」framing を **2 軸モデル**へ訂正する。ポリシー状態(consent / flag)の供給は本 ADR の adapters/client を土台に [0031](0031-policy-state-supply.md)(S3)が定める。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。本 ADR は「S1 の解決を既存 ADR への追補で埋めず、内容として独立させ、S ごとに 1 主題 = 1 ADR とする」判断(ユーザ決定 2026-07-14)により独立起票したもの。内容自体はこの設計討議でユーザ確定済み。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きする）

## 背景

設計フェーズの構造ブロッカー網羅検証で、[0022](0022-capabilities-kernel.md) のミラーが 2 軸のうち対角線しか埋めていないことが判明した。`adapters` は server-only([0071](0071-bff-api-integration.md) + [0022](0022-capabilities-kernel.md) 禁止事項 + triage #67)で client コードを受け入れられず、`capabilities` は remote IO を明示拒否し、`features` / `components` への生 fetch は [0071](0071-bff-api-integration.md) が禁止 —— **全出口が閉じていた**。0021 が `adapters` の例に挙げる「storage / analytics」も、client でしか起きないため server-only 宣言と矛盾していた。

## 決定

### 1. 2 軸モデル([0022](0022-capabilities-kernel.md) framing の訂正)

境界カーネルは 2 つの軸で位置づける:

- **WHAT**: remote 外部システム(アプリが呼び出す先)/ local runtime(アプリが動く器)
- **WHERE**: server / client

| | server | client |
| --- | --- | --- |
| **remote 外部システム** | `adapters/server` | `adapters/client` |
| **local runtime** | (config / `instrumentation.ts`) | `capabilities` |

`capabilities` は `adapters` の「client ミラー」ではなく、**WHAT が異なる**(runtime 境界)。[0022](0022-capabilities-kernel.md) の「adapters の client 側ミラー」という説明は本 ADR が上記に訂正する(**0022 の実質ルール = capabilities の責務・use-client・受け入れない は不変**。説明のみ訂正)。

### 2. `adapters` を 1 カーネル内 2 element に分割

外部システム境界は **1 責務**(型変換 + resilience)であり、server / client は**実行文脈の差 = element 属性**。別カーネルにはしない(1 責務が 2 カーネルに割れるのを避ける)。

```text
src/adapters/
├── server/   element: adapters/server
└── client/   element: adapters/client
```

| element | 実行文脈 | import 可 | 中身 |
| --- | --- | --- | --- |
| `adapters/server` | **server-only**(`import "server-only"`) | `model` / `errors` / `logging` / **`config`(ここだけ)** | backend API client・secret 有・resilience([0071](0071-bff-api-integration.md)) |
| `adapters/client` | **`"use client"`** | `model` / `errors` / `logging` / client config(**server config 不可・secret 無**。client config = NEXT_PUBLIC リテラルは可) | 同一オリジン BFF fetch(#7)/ WebSocket・SSE(#56)/ analytics 送信(#61)/ telemetry 送信(#59 / #60)/ アップロード送信(#13。presigned 直 PUT または BFF の multipart proxy へ向けた送信。既定は backend の受け口で決まる = [0075](0075-file-upload-seam.md))。**remote のみ** |

- **local ブラウザ API(#43 Web Storage・#44 client cookie 読み)は `adapters` でなく `capabilities`**([0022](0022-capabilities-kernel.md))。clipboard(#26)と同型 = browser runtime API であり外部システムではない
- **宛先オリジン**: 同一オリジン BFF(`/api/*`)が主経路。**同一オリジン外への送信も、ADR が明示に許す場合に限り `adapters/client` が所有する**(#56 realtime のバックエンド直結 / managed サービス([0074](0074-runtime-communication-seam.md))・#13 presigned 直 PUT([0075](0075-file-upload-seam.md)。backend が multipart しか受けない構成では宛先は同一オリジン BFF になる))。telemetry / analytics は [0081](0081-observability-logging.md) により BFF 中継(外部直送禁止)
- `features` は両 element の公開面を import 可。`capabilities` は `adapters` を import しない
- ESLint boundaries を 2 element に割り、**secret / RSC 境界を機械強制**(server-only に client hook 混入・client に config import はエラー)

## 禁止事項

- ❌ `adapters/client` に secret / server config を置くこと(client bundle 漏洩)。client config の NEXT_PUBLIC リテラルは可
- ❌ `adapters/server` に client hook / `"use client"` を混ぜること(逆も。RSC 境界。[0040](0040-routing-rendering-strategy.md))
- ❌ local ブラウザ API(storage / clipboard / cookie 読み)を `adapters` に置くこと(→ `capabilities`)

## 補足

- **採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**(独立起票・S ごと 1 ADR)。
- ポリシー状態(consent / flag)の source adapter と供給方針は本 ADR の adapters/client を土台に [0031](0031-policy-state-supply.md)(S3)が定める。
- **既存 ADR への内容反映は 2026-07-14 に適用済**(ユーザ承認のもと): [0071](0071-bff-api-integration.md) に client 面 pointer / [0022](0022-capabilities-kernel.md) の framing を 2 軸モデルへ訂正 + #43・#44 の capabilities 移管 / [0021](0021-frontend-responsibility.md) 依存マトリクスに 2 element / [0020](0020-adopted-architecture.md) / [0027](0027-directory-structure.md) の構造図。

## 関連 ADR

- [0071-bff-api-integration.md](0071-bff-api-integration.md) — `adapters`(BFF / API 統合)の中身。本 ADR はその server/client 面を確定
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md) — `capabilities`(runtime hook)。本 ADR が「ミラー」framing を 2 軸モデルへ訂正
- [0031-policy-state-supply.md](0031-policy-state-supply.md) — consent / flag の source adapter + 供給(本 ADR の adapters/client が土台。S3)
- [0025-app-layer-elements.md](0025-app-layer-elements.md) — Route Handler(client 送信の受け側 = `adapters/server` の import 元)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — RSC / Client 境界(server-only / use-client の機械強制の根拠)
- [0081-observability-logging.md](0081-observability-logging.md) — ブラウザ→BFF 中継(client 送信面 = `adapters/client`)
