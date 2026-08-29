# ポリシー状態(consent / feature-flag)の供給方針

[0022](0022-capabilities-kernel.md) は「ポリシー状態(consent / feature-flag)は `capabilities` に置かず各 seam が所有」と退去させたが、**退去先の物理的な家が無かった**(構造ブロッカー **S3** = 委譲先消失の型)。`useConsent()` 相当(consent 供給。triage では #50〈サードパーティスクリプトの同意ゲート連動〉/ #61〈analytics の consent gating 接続〉が消費点)・`useFlag()` 相当(#62)の client 供給点が、`capabilities`(runtime 限定)にも `components`(純 UI)にも `model`(表示ロジック)にも `feature`(単一・`features↔features` 禁止)にも座らない。

本 ADR は、この供給を **新カーネルを立てずに既存カーネルの合成で** 定める([0024](0024-adapters-server-client-split.md) の adapters/client を土台とする)。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。S3 の解決を S ごとに 1 主題 = 1 ADR として独立起票したもの(ユーザ決定 2026-07-14)。内容自体はこの設計討議でユーザ確定済み。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きする）

## 背景

[0022](0022-capabilities-kernel.md) がポリシー状態を `capabilities` から退去させた時点では退去先が未定義で、triage の disposition(#62 → [0071](0071-bff-api-integration.md) 追補 = adapters)も server-only 面しか触れておらず、client 供給の半面が宙に浮いていた。`features/consent` のような feature 化は `features↔features` 禁止([0021](0021-frontend-responsibility.md))で他 feature から参照できず不成立。[0024](0024-adapters-server-client-split.md) が adapters に client 面を与えたことで、本 ADR の解決が可能になった。

## 決定: 3 分解して既存カーネルへ(新カーネル不要)

consent / flag の供給を 3 つに分解し、それぞれ既存の家へ置く:

| 分解要素 | 家 | 内容 |
| --- | --- | --- |
| **① 生の値の読み** | `adapters` source 境界 | server は `cookies()`([0025](0025-app-layer-elements.md) の route-segment / route-handler)/ client raw は `capabilities`([0022](0022-capabilities-kernel.md))。**反応的な横断ケースだけは ③ の `stores` が自分で読む**(下記「家の決まり方」) |
| **② セマンティクス + no-op 既定** | `adapters` の source adapter に同居 | **seam 成果物** = #61 analytics no-op sink /「未同意で全 gate」consent 既定(#50 / #61 の同意ゲートが消費)/ #62 flag 既定。gate 述語は純関数。**起動 / ビルド境界も消費する場合は `model`**(下記) |
| **③ ツリーへの供給** | 既定 = **stateless**(RSC が読み props で配る) | [0060](0060-state-management.md)(Server state = RSC fetch 既定)に忠実。反応的が要る横断ケース(同意バナー操作の即時反映等)は横断 client 状態として `stores`([0023](0023-stores-kernel.md) / Zustand)に置く(provider mount は [0026](0026-layout-shell-mount.md)) |

### 家の決まり方(依存マトリクスが先に決める)

上の表は既定であり、**`architecture.ts` の依存マトリクスが許さない組み合わせは既定より優先して次の形を採る**。マトリクスは強制される側なので、表がそれと食い違えば表に従える実装が存在しない。

- **① が `stores` へ移る条件**: 値が「**初回描画より前に同期で要る**」かつ「**反応的**」の両方を満たすとき。`stores` は `capabilities` を import できず(`stores → model / errors / config`)、`capabilities` が公開するのは hook なので Zustand の初期化子から呼べない。この 2 条件が揃う値は `stores` が生の読み書きごと持つ(consent がこれにあたる)
- **② が `model` へ移る条件**: **起動 / ビルド境界**(`proxy.ts` 等)も同じ述語を消費するとき。それらは `adapters` を import できないため(`proxy → model / config / errors`)、`adapters` へ置くと [0131](0131-cookie-consent.md) §1 が cookie 操作を置けと定める場所から届かない。判定と綴りを 1 か所に保つには `model` が唯一の交点になる(`model/session.ts` / `model/authz.ts` と同型)
- どちらの条件も満たさない値は表の既定どおり `adapters` / `capabilities` に置く

これにより [0022](0022-capabilities-kernel.md) の「seam が所有」の**物理 = `adapters` source adapter + no-op 既定 + stateless props(反応的な横断ケースのみ `stores`)** が確定し、委譲先消失が閉じる。consent は [0131](0131-cookie-consent.md) が**軽量機構 + スクリプトゲートを本体同梱**とし(CMP 本体と トラッキング製品は非同梱)、flag ライブラリ本体の非同梱は triage #62 のまま不変で、本 ADR は**その供給方針(seam)**を定める。0131 の gate 述語はこの供給経路に乗る。

## 禁止事項

- ❌ ポリシー状態を **既定で** client store に持つこと(既定は stateless props = RSC が読み props で配る。[0060](0060-state-management.md))。反応的な横断ケース(同意バナー操作の即時反映等)に限り `stores`([0023](0023-stores-kernel.md) / Zustand)を用いてよい
- ❌ 依存マトリクスが許さない配置を、表の既定を理由に実装へ要求すること(「家の決まり方」。表とマトリクスが食い違うときはマトリクスが勝ち、表の側を直す)
- ❌ consent / flag の値取得を各 feature / component に直書きすること(source adapter へ集約)
- ❌ ポリシー状態を `capabilities` に置くこと(runtime 能力に限る。[0022](0022-capabilities-kernel.md))

## 補足

- **採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**(独立起票・S ごと 1 ADR)。
- 本 ADR は供給の**方針**を定める。consent / flag の具体実装(どのソース・どの gate 粒度)は用途依存で fork 先 / 実装 PR。seam(IF + no-op 既定)のみ本体が備える。

## 関連 ADR

- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md) — adapters/server・adapters/client(source adapter の土台。S1)
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md) — ポリシー状態を退去させた元(client raw 読みの家)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — `features↔features` 禁止(feature 化不成立の根拠)
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — #62 server 面の追補先(adapters・runtime config の逃し先)
- [0131-cookie-consent.md](0131-cookie-consent.md) — consent の軽量機構 + スクリプトゲート(本 ADR はその状態供給の seam)
- [0078-dynamic-feature-flag-seam.md](0078-dynamic-feature-flag-seam.md) — 動的 feature flag seam(本 ADR の供給の物理を土台に結線)
- [0082-client-observability.md](0082-client-observability.md) — consent gate の主消費者(#61 プロダクト分析は本 ADR の gate 述語で gate)
- [0060-state-management.md](0060-state-management.md) — stateless 供給既定の根拠
- [0023-stores-kernel.md](0023-stores-kernel.md) — 反応的な横断 consent / flag 状態の置き場(Zustand)
- [0026-layout-shell-mount.md](0026-layout-shell-mount.md) — 反応的供給時の store provider mount(S4)
