# ファイルアップロード seam(presigned 直 PUT と multipart proxy の 2 経路。選択は backend の能力)

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

### ファイルアップロード(#13)= presigned 直 PUT と multipart proxy の 2 経路を対等な seam として持つ

アップロードは **フロント領域の責務**である(アップロード UX はフロントの責務)。thin proxy 原則(0070)との緊張は、**大容量ボディを境界の外へ逃がせる経路を第一候補に置く**ことで解消する。

- **第一候補 = presigned URL 直 PUT**(backend が発行できる場合)。ブラウザは、backend が発行した署名付き URL に対してストレージへ**直接** PUT / POST する。**大容量ボディは BFF(`/api/*`)を通さない**。
  - 署名付き URL の発行は backend の責務(フロントは発行結果を受け取るだけ)。フロント側の取得口は `adapters/server`(認可付きで backend から署名を得る)/ 直 PUT の送信は `adapters/client`(client 側 remote IO を所有する唯一の層。同一オリジン外への送信は本件 #13 のように ADR が明示に許す場合に限る)に置く([0024](0024-adapters-server-client-split.md) 決定表 #13)。進捗表示・中断・再開は client 側の **upload seam(hook / IF)** に集約し、コンポーネントに散らさない。
  - サイズ制限・許可 content-type・有効期限は **署名ポリシー側**(backend が発行時に埋め込む)で担保し、フロントは表示・事前バリデーション(UX)に留める。
  - **vendor-independent 正当性材料([0010](0010-standards-and-non-lockin.md) §2)**: 署名付き URL は S3 / GCS / Cloudflare R2 / Azure Blob いずれも備える業界横断パターンであり、特定ストレージ SDK・特定 PaaS に依存しない(署名を発行元から抜いても「事前署名 + HTTP PUT」という構造は正当)。BFF が大容量ボディを中継しないことの根拠は、serverless 実行の**実行時間・メモリ・ボディサイズという vendor 横断の物理制約** + thin proxy(0070)であって、フレームワーク推奨ではない。
- **もう一方の経路 = multipart proxy**。フロント側のサーバがボディを受けて backend / ストレージへ中継する **named seam** を置く。presigned が使えない構成(直アクセス不可なストレージ、送信前にサーバ加工が必須、backend が multipart 受け口しか持たない、等)で用いる。
  - **受け口は Route Handler(`/api/*`)と Server Action のどちらでもよい**。どちらもフロント側サーバがボディを受ける点で同じ経路であり、選択は**進捗・中断を持つ必要があるか**で決まる。ブラウザが送信の進捗を観測できるのは client 発の HTTP に限られるため、進捗・中断・再開を持つなら Route Handler を選び、送信が form の submit と一体で完結してよいなら Server Action を選ぶ。
  - **Server Action を選ぶと進捗・中断は持てない**(送信の途中経過を観測する口が無い)。また framework が持つ既定のボディ上限を明示的に引き上げる必要があり、**その設定は個々の action ではなくアプリ内の全 Server Action に効く**。この 2 点は後から経路を変えずに解消できないため、選択時に引き受ける。
  - この経路ではサイズ上限・content-type 検証を**必ず受け口側にも置く**(presigned なら署名ポリシーが担保していた層が無くなるため)。413 / 415 / 422 を扱う。宣言された content-type は送信側が自由に付けられるので、これだけを根拠にしない。
  - **Server Action を受け口に選ぶと、上限は全 Server Action へ及ぶ。** Next.js の `serverActions.bodySizeLimit` はアプリ単位の設定で、action ごとの上限を持たない。したがってアップロードのために上げた値は、テキストしか受け取らない他の action にも同じ上限で効く。受け入れられないなら受け口を Route Handler へ寄せる —— そちらは route ごとに扱いを決められる。この帰結は受け口の選択と不可分なので、選ぶ時点で確認する。
  - **本 ADR は許容ボディサイズ上限・ストリーミング中継の要否といった具体値を確定しない**(用途 / PaaS 依存。保留 = 実装 PR / fork 先)。ただし**上限は配備先のボディ上限より内側に取る**。中継経路では配備先が先に要求を打ち切るため、それより外側に置いた上限は表明されるだけで効かない。値は config が持ち、経路上で最も小さい上限を入れる。

### 経路の選択は backend の能力で決まる

**どちらを使うかは、接続先 backend が presigned URL を発行できるかで決まる。** フロント側の好みでも、そのとき同梱しているサンプルの実装状態でもない。presigned を発行できるなら直 PUT、multipart 受け口しか持たないなら proxy であり、**後者は「劣った例外」ではなく、その構成における正規経路**である。

したがって本 boilerplate は **両経路の seam を対等に持つ**。片方だけを実装して他方を後付け扱いにしない。

> **サンプルの実装状態を本 ADR へ書き戻さない。** 同梱サンプルが現時点でどちらの経路を通るかは、backend 側の都合で変わる一時的な事実であり、この決定の根拠ではない。サンプルは撤去される前提の付属物であって、撤去後もこの boilerplate は単独で意味を保つ必要がある。経路の具体は接続先ごとに `adapters` の実装が決め、本 ADR は**構造(両経路の seam を持ち、選択は backend の能力に従う)**だけを確定する。

## 禁止事項

- ❌ **presigned URL を発行できる backend に対して** multipart proxy を選ぶこと(その構成では直 PUT が既定。大容量ボディを BFF へ通す理由が無い。[0070](0070-backend-role-separation.md) thin proxy)
- ❌ multipart proxy を「劣った例外」として扱い、seam を片方だけ実装すること(経路は backend の能力で決まる。両経路を対等に持つ)
- ❌ multipart proxy 経路でサイズ上限・content-type 検証を受け口(Route Handler / Server Action)に置かないこと(署名ポリシーが担保していた層を落とすことになる)
- ❌ 中継経路の上限を配備先のボディ上限より外側に置くこと(配備先が先に打ち切るため、その上限は効かない)
- ❌ Server Action を受け口に選びながら、上限の引き上げが他の action へ及ぶことを確認せずに済ませること
- ❌ アップロードの生 fetch / 進捗管理をコンポーネントに散らすこと(`adapters/client` の upload seam へ集約。[0024](0024-adapters-server-client-split.md))

## 補足

- **タクソノミー**([0140](0140-documentation-operations.md)): 本 ADR は decision(#13 の構造確定)に属する。日常強制される rule(アップロードサイズの具体規約・Route Handler 実装規約)は `docs/rules.md`(未新設・0140 方針)側に置き、本 ADR から逆参照される。
- 本 ADR は既存 Accepted ADR(0070 / 0071 / 0024)本体を編集せず、それらを参照して隣接する空白を埋める(既存 ADR は Protected Documentation)。その後 2026-07-15 に、[0024](0024-adapters-server-client-split.md) 決定表へ #13(presigned 直 PUT)が `adapters/client` の正規役割として反映済(ユーザ指示による整合)。
- **v2 採用予定(局所ライブラリ・2026-07-14)**: 本 decision(2 経路を対等な seam として持ち、選択は backend の能力に従う)本体は不変。採用マトリクス([master-plan §1.2](../plan/master-plan.md))でアップロードは **v2 = 局所機構の materialize**(用途依存)に振り分けられた。**upload seam(`adapters/client` の進捗 / 中断 / 再開 IF・multipart proxy 例外 seam)は 0.0.x/v1 で敷済・機構実体化は v2**。既定の presigned 直 PUT は web 標準(署名付き URL + HTTP PUT)に乗り特定ストレージ SDK・PSP に依存しないため専用ベンダーを持たない。外部クライアント / SDK を採る場合も本体は seam を保持し、[0010](0010-standards-and-non-lockin.md)(vendor-independent 正当化 + adapters/カーネル境界の裏で差替可能・vendor 直参照を feature/component に散らさない)/ [0004](0004-library-management.md)(exact-pin / `pnpm audit`)の枠内で置く。

## 関連 ADR

- [0076-payment-ui-seam.md](0076-payment-ui-seam.md)— 分割の兄弟(決済 UI seam = mount seam と PCI 境界。本 ADR 旧 §2 由来)
- [0077-bff-abuse-protection-boundary.md](0077-bff-abuse-protection-boundary.md)— 分割の兄弟(BFF abuse 保護 = infra 境界 seam。本 ADR 旧 §3 由来)
- [0070-backend-role-separation.md](0070-backend-role-separation.md)(A2)— `/api/*` = thin proxy / 契約 SSOT(本 ADR の親決定。アップロード中継の緊張の起点)
- [0071-bff-api-integration.md](0071-bff-api-integration.md)(B3)— fetch wrapper(JSON 前提)/ `adapters` の resilience(本 ADR がバイナリ / multipart の空白を補う)
- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md)— `adapters` server / client 2 分割(署名取得 = server / 直 PUT = client)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md)— 標準準拠 + vendor-independent 正当性(presigned / 直 PUT の正当化の土台)
- BACKLOG(triage #8 Route Handler 規約)— rules.md / 新規 ADR 未策定。本 ADR が逆参照する連動先
