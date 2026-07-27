# ファイルアップロード seam(presigned 直 PUT 既定 / multipart proxy 例外)

[0070](0070-backend-role-separation.md) の thin proxy 境界(`/api/*`)に隣接して生じるファイルアップロードの seam を、**フロント領域の拡張点**(IF / ローカル機構 + 明示拡張点を敷いて切らない)として明文化する。対象は triage #13(ファイルアップロード)。

> **分割済み**: 本 ADR は当初「BFF・外部境界」の広い括りで 3 つの異質な seam を同居させていたが(ファイルアップロード #13 / 決済 UI #51 / BFF abuse 保護 #49)、「1 ADR = 1 主題」方針に従い per-subject に分割した。
>
> - **決済 UI(#51)** → [0076-payment-ui-seam.md](0076-payment-ui-seam.md)(mount seam と PCI 境界)
> - **BFF abuse 保護(#49)** → [0077-bff-abuse-protection-boundary.md](0077-bff-abuse-protection-boundary.md)(infra / edge 境界 seam)
>
> 本 ADR は **ファイルアップロード seam(#13)** のみを担う。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。独立起票の経緯。本 ADR の内容自体はこの設計討議での方針を成文化したもの。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

[0070](0070-backend-role-separation.md)(A2)が `/api/*` を **thin proxy** に限定した結果、ファイルアップロードの扱いに空白が生じた(遡及監査 #13):

- アップロードを BFF 中継(multipart を `/api/*` proxy)にするか presigned URL 直 PUT にするかが未決。
- [0071](0071-bff-api-integration.md) の fetch wrapper は JSON API 前提で multipart / バイナリに未言及であり、大容量ボディの BFF 中継は **thin proxy 原則(0070)と緊張**する。

本 ADR は [0010](0010-standards-and-non-lockin.md) の 2 原則(§1 デファクトへの準拠 / §2 vendor-independent な正当性材料の必須化)と、**境界判定**(「別ドメイン(infra / backend)の責務か?」の一問)を適用してアップロード seam を仕分ける。

## 決定

### ファイルアップロード(#13)= presigned URL 直 PUT 既定 / multipart proxy は thin proxy 例外の seam

アップロードは **フロント領域の責務**である(アップロード UX はフロントの責務)。ただし thin proxy 原則(0070)との緊張を、**既定を境界の外に逃がす**ことで解消する。

- **既定 = presigned URL 直 PUT**。ブラウザは、backend が発行した署名付き URL に対してストレージへ**直接** PUT / POST する。**大容量ボディは BFF(`/api/*`)を通さない**。
  - 署名付き URL の発行は backend の責務(フロントは発行結果を受け取るだけ)。フロント側の取得口は `adapters/server`(認可付きで backend から署名を得る)/ 直 PUT の送信は `adapters/client`(client 側 remote IO を所有する唯一の層。同一オリジン外への送信は本件 #13 のように ADR が明示に許す場合に限る)に置く([0024](0024-adapters-server-client-split.md) 決定表 #13)。進捗表示・中断・再開は client 側の **upload seam(hook / IF)** に集約し、コンポーネントに散らさない。
  - サイズ制限・許可 content-type・有効期限は **署名ポリシー側**(backend が発行時に埋め込む)で担保し、フロントは表示・事前バリデーション(UX)に留める。
  - **vendor-independent 正当性材料([0010](0010-standards-and-non-lockin.md) §2)**: 署名付き URL は S3 / GCS / Cloudflare R2 / Azure Blob いずれも備える業界横断パターンであり、特定ストレージ SDK・特定 PaaS に依存しない(署名を発行元から抜いても「事前署名 + HTTP PUT」という構造は正当)。BFF が大容量ボディを中継しないことの根拠は、serverless 実行の**実行時間・メモリ・ボディサイズという vendor 横断の物理制約** + thin proxy(0070)であって、フレームワーク推奨ではない。
- **backend が multipart 受け口しか持たない場合は multipart proxy が既定になる**。既定を決めるのは「presigned を発行できる backend か」であり、フロント側の好みではない。presigned が発行されない構成では、下記の例外 seam が唯一の経路となるため、その構成における既定として扱う
  - **v1 サンプルはこちらに該当する**。go-boilerplate の画像アップロードは `POST /v1/products/images`(multipart / レスポンスは `{ imagePath }`)であり presigned URL を発行しないため、サンプル実装は multipart proxy 経路で書く([screens.md](../screens.md) A6 / A7)
  - この場合もサイズ上限・content-type 検証は**必ずフロント側の Route Handler にも置く**(presigned なら署名ポリシーが担保していた層が無くなるため)。413 / 415 / 422 を扱う
- **例外 = multipart proxy(`/api/*` 経由)**。presigned が使えない構成(直アクセス不可なストレージ、送信前にサーバ加工が必須、backend が multipart しか受けない、等)に限り、Route Handler が `request.formData()` 等でボディを受けて backend / ストレージへ中継する **named seam** を許す。ただし:
  - これは **例外であって既定にしない**。多用は thin proxy が業務層化する兆候として扱う([0070](0070-backend-role-separation.md) 禁止事項)。
  - **本 ADR は「例外を認める範囲(許容ボディサイズ上限・ストリーミング中継の要否)の具体値を確定しない」**(用途 / PaaS 依存。保留 = 実装 PR / fork 先。下記 flags 相当)。本 ADR が確定するのは「既定 = presigned 直 PUT / 中継は名前付き例外 seam」という**構造**である。

## 禁止事項

- ❌ 大容量ファイルの本文を `/api/*`(BFF)経由で無条件に中継すること(presigned を発行できる backend では既定 = 直 PUT。中継は名前付き例外 seam に限る。[0070](0070-backend-role-separation.md) thin proxy)
- ❌ multipart proxy 経路でサイズ上限・content-type 検証を Route Handler に置かないこと(署名ポリシーが担保していた層を落とすことになる)
- ❌ アップロードの生 fetch / 進捗管理をコンポーネントに散らすこと(`adapters/client` の upload seam へ集約。[0024](0024-adapters-server-client-split.md))

## 補足

- **タクソノミー**([0140](0140-documentation-operations.md)): 本 ADR は decision(#13 の構造確定)に属する。日常強制される rule(アップロードサイズの具体規約・Route Handler 実装規約)は `docs/rules.md`(未新設・0140 方針)側に置き、本 ADR から逆参照される。
- 本 ADR は既存 Accepted ADR(0070 / 0071 / 0024)本体を編集せず、それらを参照して隣接する空白を埋める(既存 ADR は Protected Documentation)。その後 2026-07-15 に、[0024](0024-adapters-server-client-split.md) 決定表へ #13(presigned 直 PUT)が `adapters/client` の正規役割として反映済(ユーザ指示による整合)。
- **v2 採用予定(局所ライブラリ・2026-07-14)**: 本 decision(既定 = presigned 直 PUT / 中継 = 名前付き例外 seam)本体は不変。採用マトリクス([master-plan §1.2](../plan/master-plan.md))でアップロードは **v2 = 局所機構の materialize**(用途依存)に振り分けられた。**upload seam(`adapters/client` の進捗 / 中断 / 再開 IF・multipart proxy 例外 seam)は 0.0.x/v1 で敷済・機構実体化は v2**。既定の presigned 直 PUT は web 標準(署名付き URL + HTTP PUT)に乗り特定ストレージ SDK・PSP に依存しないため専用ベンダーを持たない。外部クライアント / SDK を採る場合も本体は seam を保持し、[0010](0010-standards-and-non-lockin.md)(vendor-independent 正当化 + adapters/カーネル境界の裏で差替可能・vendor 直参照を feature/component に散らさない)/ [0004](0004-library-management.md)(exact-pin / `pnpm audit`)の枠内で置く。

## 関連 ADR

- [0076-payment-ui-seam.md](0076-payment-ui-seam.md)— 分割の兄弟(決済 UI seam = mount seam と PCI 境界。本 ADR 旧 §2 由来)
- [0077-bff-abuse-protection-boundary.md](0077-bff-abuse-protection-boundary.md)— 分割の兄弟(BFF abuse 保護 = infra 境界 seam。本 ADR 旧 §3 由来)
- [0070-backend-role-separation.md](0070-backend-role-separation.md)(A2)— `/api/*` = thin proxy / 契約 SSOT(本 ADR の親決定。アップロード中継の緊張の起点)
- [0071-bff-api-integration.md](0071-bff-api-integration.md)(B3)— fetch wrapper(JSON 前提)/ `adapters` の resilience(本 ADR がバイナリ / multipart の空白を補う)
- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md)— `adapters` server / client 2 分割(署名取得 = server / 直 PUT = client)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md)— 標準準拠 + vendor-independent 正当性(presigned / 直 PUT の正当化の土台)
- BACKLOG(triage #8 Route Handler 規約)— rules.md / 新規 ADR 未策定。本 ADR が逆参照する連動先
