# Cache Components(PPR)有効化判断

`Cache Components`(PPR 既定化 = `next.config.ts` の `cacheComponents: true`)の採否を、[0010](0010-standards-and-non-lockin.md) の標準準拠・非ロックイン判断軸の下で定める。レンダリングモードの選択は [0040](0040-routing-rendering-strategy.md) が、データ取得のキャッシュ・再検証は [0071](0071-bff-api-integration.md) が、Suspense 境界の配置は [0080](0080-error-handling.md) が持ち、本 ADR はそれらの上で **PPR を採るかどうか** の 1 点だけを持つ。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。本 ADR は triage #1 から独立起票したものである。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

この判断は、データ取得のキャッシュ設計([0071](0071-bff-api-integration.md))・env のプリレンダー凍結([0030](0030-environment-variable-management.md))・Suspense 境界の配置([0080](0080-error-handling.md))と交差する。いずれも既に確定しているため、本 ADR は採否だけを扱う。

裏取り(`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md`): `cacheComponents` は 16.0.0 で導入され、従来の `ppr` / `useCache` / `dynamicIO` を **1 つに統合**した設定である。有効化するとデータ取得は明示 `use cache` しない限りプリレンダーから除外され、`use cache` を page / function / component 粒度で置く運用が前提になる。さらに有効時は client-side navigation で React `<Activity>` により旧ルートを unmount せず **state を保存**する(遷移意味論そのものが変わる)。

## 決定

### Cache Components(PPR)を v1 で採用する(`cacheComponents: true`)

- **v1 で有効化する。** [0040](0040-routing-rendering-strategy.md) が保留した判断を、本 ADR が「採用」に確定する。
- **根拠は実測である。** `(shop)` の layout で cookie を読む 2 つの取得(カートとセッション)を `<Suspense>` の穴へ落とすと、`/` / `/about` / `/privacy` / `/terms` / `/products/[id]` / `/purchases/[code]` と admin の 2 枚が**部分プリレンダーへ入る**。`/about` の静的な殻は header・nav・footer・本文を含む 12.4 KB の HTML で、**バックエンドへ 1 度も行かずに配れる**。この分割を持たない限り、同じ画面はカートとセッションの往復を待ってから 1 バイト目を返す。**トップは追加の分割なしにこの形へ入る** —— 見出しを `Suspense` の外、取得を内に置く形で書かれているためである。
- **待つコストが実在する。** 殻と穴の分割・`use cache` の粒度は route の構造そのものであり、後から入れることは同じ画面を二度書くことを意味する。
- **有効化の前提は [0112](0112-data-classification-cache-boundary.md)** のデータ分類とキャッシュ境界である。PPR は「何が静的な殻へ入るか」を決める機構であり、**分類が無いまま有効化すると事故の面だけが先に開く**。
- **PPR は public data に対する性能最適化として扱う。** user-scoped な値については、共有・静的キャッシュの恩恵より機密性を優先する([0112](0112-data-classification-cache-boundary.md) 不変条件 1 / 2)。
- **本 ADR は方針を確定するのみで、有効化と移行は実装 PR が持つ。** 移行には shell の穴あけ・共有 fetch wrapper の締切を壁時計から単調時計へ寄せること・`export const dynamic` を読む描画モード突合ゲートの作り直し・各 route の分割・`<Activity>` の回帰確認が含まれる。
- **引き受ける代償**(採用によって発生し、消えないもの):
  - **可逆性の低下**: 無効 → 有効は `use cache` を足す前進移行だが、有効前提で書いたツリー(静的な殻 / 動的な穴の分割・`use cache` の粒度)を無効へ戻すのは書き直しになる。v1 で採る判断はこれを引き受ける。
  - **キャッシュ設計の骨格を本体が持つこと**: 「何を `use cache` するか / どの粒度で」は [0071](0071-bff-api-integration.md) が具体値を fork 先へ開けている領域である。**具体値は開けたまま、寿命をどこへ置くかの骨格だけを本体が決める**。
  - **遷移意味論の変更**: 全ルートの client-side navigation が `<Activity>` により状態保存挙動へ変わる(前の route を unmount せず hidden にする)。dropdown / dialog / 一覧の位置復元への影響は E2E と VRT で見る。
  - **交差関心の確定が実装 PR へ移ること**: [0030](0030-environment-variable-management.md) の env プリレンダー凍結と [0080](0080-error-handling.md) §4 の Suspense × PPR 相互作用は、移行 PR で確定する。
- **有効化後のキャッシュモデル**は `use cache` + `cacheLife` / `cacheTag` を正とする。キャッシュ指定の所有層(`adapters` / 呼び出す RSC)・tag 命名・ミューテーション後 revalidate の規約は [0071](0071-bff-api-integration.md)「データ取得のキャッシュ・再検証」節が引き続き正であり、**user-scoped な値は [0112](0112-data-classification-cache-boundary.md) に従い既定で uncached** とする。

## 禁止事項

- ❌ [0112](0112-data-classification-cache-boundary.md) の分類とキャッシュ境界が無い状態で有効化すること
- ❌ 有効化と移行が着地する前に `use cache` / `cacheLife` / `cacheTag` へ依存した設計を書くこと(これらは有効時の機構である)
- ❌ キャッシュヒット率や PPR 適用率を理由に、user-scoped な値を静的な殻・共有キャッシュへ載せること([0112](0112-data-classification-cache-boundary.md))

## 補足

- 本 ADR は [0140](0140-documentation-operations.md) のタクソノミーにおいて **judgment** 分類に属する。
- `use cache` の粒度・静的な殻 / 動的な穴の分割・[0030](0030-environment-variable-management.md) の env プリレンダー凍結との整合・[0080](0080-error-handling.md) §4 の Suspense × PPR は、移行 PR の中で 0071 / 0080 のキャッシュ節を追補して確定する。
- ページネーション / 無限スクロールのデータ取得境界は本 ADR の対象外であり、[0073](0073-pagination-fetch-boundary.md) が所有する。無限スクロールの初回 RSC 取得が拠って立つキャッシュモデルは本 ADR の確定に従う。

## 関連 ADR

- [0073-pagination-fetch-boundary.md](0073-pagination-fetch-boundary.md)— ページネーション / 無限スクロールのデータ取得境界(#7。本 ADR からの per-subject 分割先。従来キャッシュモデルの上に乗る)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md)(A4)— `Cache Components` 有効化可否を保留(本 ADR が v1 採用に確定)/ レンダリングモード非強制
- [0071-bff-api-integration.md](0071-bff-api-integration.md)(B3)— データ取得のキャッシュ・再検証(既定 uncached・opt-in・所有層)。有効化後のキャッシュ節の追補先
- [0112-data-classification-cache-boundary.md](0112-data-classification-cache-boundary.md)— データ分類とキャッシュ境界(本 ADR の有効化の前提)
- [0080-error-handling.md](0080-error-handling.md)(B6)— §4 Suspense × PPR は 0040 保留に従う(本 ADR と連動・張り直しは補足参照)
- [0030-environment-variable-management.md](0030-environment-variable-management.md)(A7)— env プリレンダー凍結(Cache Components 判断との交差)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md)— 標準準拠・非ロックイン判断軸(本 ADR の vendor-independent 正当性材料の根拠)
