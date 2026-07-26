# Cache Components(PPR)有効化判断

[0040](0040-routing-rendering-strategy.md)(A4)が「レンダリングモードを強制しない」までを確定し、データ取得のキャッシュ設計を [0071](0071-bff-api-integration.md)(B3)へ、`loading.tsx` / Suspense 境界を [0080](0080-error-handling.md)(B6)へ引き渡した結果、なお **穴が残った**。`Cache Components`(PPR 既定化 = `next.config.ts` の `cacheComponents: true`)の有効化可否が「B3 / B6 確定後に判断」と保留されたまま宙吊りである(両者は既に Accepted)。本 ADR はこの 1 点を、[0010](0010-standards-and-non-lockin.md) の標準準拠・非ロックイン判断軸の下で確定する。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。本 ADR は triage #1 から独立起票したものである。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

**分割注記**: 本 ADR は当初「Cache Components 判定(#1)+ ページネーション(#7)」を束ねていたが、「1 ADR = 1 主題」の原則に照らして per-subject 分割し、ページネーション / 無限スクロールのデータ取得境界(旧 §2 / §3)を [0073](0073-pagination-fetch-boundary.md) へ分離した。本 ADR は Cache Components 有効化判断(旧 §1 = #1)に縮約している。

## 背景

設計フェーズの遡及監査で、0040 が下流 ADR へ引き渡した後に残った **「委譲先消失」に近い件**が特定された(triage #1 = 判定)。

- **#1 Cache Components(PPR)有効化判断**: 0040 は本文で「`Cache Components` の有効化可否は保留する。データ取得([B3])・env のプリレンダー凍結([0030](0030-environment-variable-management.md) A7)と交差するため、それらの確定後に判断する」と明示保留した。0071(B3)/ 0080(B6)は Accepted になり、0071 は「`Cache Components` の有効化可否は 0040 の保留に従う」、0080 §4 も「Suspense × PPR の相互作用は 0040 の保留に従う」と、いずれも 0040 へ差し戻す形で判断を先送りしていた。トリガー(B3 / B6 Accepted)は成立済みであり、**判断を下すだけ**の状態にある。

裏取り(`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md`): `cacheComponents` は 16.0.0 で導入され、従来の `ppr` / `useCache` / `dynamicIO` を **1 つに統合**した設定である。有効化するとデータ取得は明示 `use cache` しない限りプリレンダーから除外され、`use cache` を page / function / component 粒度で置く運用が前提になる。さらに有効時は client-side navigation で React `<Activity>` により旧ルートを unmount せず **state を保存**する(遷移意味論そのものが変わる)。

## 決定

### Cache Components(PPR)は 0.0.x では有効化しない(`cacheComponents: false`)

- **0.0.x の間は `cacheComponents` を有効化しない**(`next.config.ts` に `cacheComponents: true` を書かない = 既定の無効のまま)。0040 が保留した判断を、本 ADR が **「0.0.x = 無効」に確定**する。**v1.0.0 / fork 先で再評価**する余地は残す(恒久禁止ではなく、安定運用前の既定選択)。
- `next.config.ts` は保護対象の root config([AGENTS.md](../../AGENTS.md) AI Modification Scope)であり、本 ADR は**方針を確定するのみ**で同ファイルは編集しない。現状すでに未設定(= 無効)であるため、本決定は現状の追認 + 明文化にあたる。
- **vendor-independent な正当性材料**([0010](0010-standards-and-non-lockin.md) §2 = Next.js の推奨だけを根拠にしない):
  - **可逆性 / 最小コミットメント**: 無効 → 有効は「必要な箇所に `use cache` を足す」非破壊的な前進移行だが、有効前提で書いたツリー(PPR の static shell / dynamic hole 分割・`use cache` 粒度)を無効へ戻すのは書き直しになる。基盤(boilerplate)の既定は、最も広い fork 先が乗れる **可逆で低サプライズな側**に倒すべきであり、これは Next.js の推奨とは独立した「基盤既定の設計原則」である。
  - **選択肢の先食い回避**: `cacheComponents: true` は「何を `use cache` するか / どの粒度で」という**特定のキャッシュ・アーキテクチャを先に確定する**ことを事実上要求する。しかし 0071 は具体値(何を・どれだけ・どの tag で)を「用途依存のため実装 PR / fork 先で確定」と意図的に開けている。有効化は 0071 が開けた選択肢を先食いする。
  - **遷移意味論の非既定化**: 有効時は全ルートの client-side navigation が `<Activity>` により状態保存挙動へ変わり、dropdown / dialog 等の UI パターンが影響を受ける(裏取り: `cacheComponents.md`)。安定運用前の boilerplate でこの意味論を既定化しない。
  - **交差関心の未確定**: 0030(A7)の env プリレンダー凍結・0080 §4 の Suspense × PPR 相互作用と交差する。これらを固める前に既定を反転させない。
- **有効化しない間のキャッシュモデル**は、0040 / 0071 が既に敷いた **従来モデル(`fetch` 既定 uncached + `cache: 'force-cache'` 等の opt-in)** を用いる(本 ADR は新モデルを導入しない)。キャッシュ指定の所有層(`adapters` / 呼び出す RSC)・tag 命名・ミューテーション後 revalidate の規約は [0071](0071-bff-api-integration.md)「データ取得のキャッシュ・再検証」節が正であり、本決定はそれと整合する。

## 禁止事項

- ❌ 0.0.x で `next.config.ts` に `cacheComponents: true` を設定すること(有効化は v1 / fork 先の再評価事項)
- ❌ `cacheComponents` 無効のまま `use cache` / `cacheLife` / `cacheTag` に依存した設計を書くこと(これらは有効時の機構。無効時は従来モデルの opt-in を使う)

## 補足

- **既存 ADR 本体の相互参照の張り直しは別作業**: 本 ADR は 0040 の保留を「0.0.x = 無効」に確定するが、参照元である **0040 本文の「有効化可否は保留」/ 0071 の「0040 の保留に従う」/ 0080 §4 の「0040 の保留に従う」** はいずれも Accepted の Protected Documentation であり、本 ADR 作成時点では編集しない。これらへ本 ADR への back-link を付す作業は、[0010](0010-standards-and-non-lockin.md) 補足と同じく **AGENTS.md 整合 / v1 の大規模整理フェーズ**でまとめて行う。それまで旧参照は「保留に従う」の文言のまま残る(読み手が旧 ADR だけを読むと本 ADR の確定を見落とし得る点に留意)。
- 本 ADR は [0140](0140-documentation-operations.md) のタクソノミーにおいて **judgment** 分類に属する(#1 = 保留の判断を下す judgment)。
- 再評価トリガー(v1 / fork 先)で `cacheComponents: true` を採用する場合、`use cache` 粒度・PPR の static shell / dynamic hole 分割・0030 の env プリレンダー凍結との整合・0080 §4 の Suspense × PPR は、その時点で 0071 / 0080 のキャッシュ節を追補して確定する。
- ページネーション / 無限スクロールのデータ取得境界(旧 §2 / §3 = #7)は本 ADR の対象外であり、[0073](0073-pagination-fetch-boundary.md) が所有する。無限スクロールの初回 RSC 取得が拠って立つキャッシュモデルは本 ADR の「0.0.x = 従来モデル」確定に従う。

## 関連 ADR

- [0073-pagination-fetch-boundary.md](0073-pagination-fetch-boundary.md)— ページネーション / 無限スクロールのデータ取得境界(#7。本 ADR からの per-subject 分割先。従来キャッシュモデルの上に乗る)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md)(A4)— `Cache Components` 有効化可否を保留(本 ADR が「0.0.x = 無効」に確定)/ レンダリングモード非強制
- [0071-bff-api-integration.md](0071-bff-api-integration.md)(B3)— データ取得のキャッシュ・再検証(既定 uncached・opt-in・所有層)/ `Cache Components` 判断を 0040 保留へ差し戻していた(本 ADR が確定)
- [0080-error-handling.md](0080-error-handling.md)(B6)— §4 Suspense × PPR は 0040 保留に従う(本 ADR と連動・張り直しは補足参照)
- [0030-environment-variable-management.md](0030-environment-variable-management.md)(A7)— env プリレンダー凍結(Cache Components 判断との交差)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md)— 標準準拠・非ロックイン判断軸(本 ADR の vendor-independent 正当性材料の根拠)
