# ページネーション・無限スクロールのデータ取得境界

[0040](0040-routing-rendering-strategy.md)(A4)が「レンダリングモードを強制しない」までを確定し、データ取得のキャッシュ設計を [0071](0071-bff-api-integration.md)(B3)へ、`loading.tsx` / Suspense 境界を [0080](0080-error-handling.md)(B6)へ引き渡した結果、一覧画面の **ページネーション / 無限スクロール** の client 追加取得経路が、[0060](0060-state-management.md) の「Server state = RSC fetch 既定 / クライアントでのデータ取得を本体で前提にしない」と正面から緊張したまま所有者を持たない、という穴が残った。とりわけ無限スクロールは `IntersectionObserver` + client fetch を必然的に伴い、その client fetch 経路は [0071](0071-bff-api-integration.md) の fetch wrapper(resilience は主に `adapters/server` に適用 = server 前提)ではカバーされず、所有者を明示しなければ **委譲先消失を再生産**する。本 ADR はこの取得境界を、[0010](0010-standards-and-non-lockin.md) の標準準拠・非ロックイン判断軸の下で確定する。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。本 ADR は [0041](0041-cache-components-decision.md)(triage #7)からの per-subject 分割で独立起票したものである。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

設計フェーズの遡及監査で、0040 が下流 ADR へ引き渡した後に残った「委譲先消失」に近い件として、**#7 ページネーション / 無限スクロール**(triage #7)が特定された。

一覧画面の頁送り・無限スクロールの UI 側扱い(offset vs cursor、ページ状態の表現、client 追加取得の可否)が未定義だった。とりわけ無限スクロールは `IntersectionObserver` + client fetch を必然的に伴い、[0060](0060-state-management.md) の「Server state = Server Component fetch 既定 / クライアントでのデータ取得を本体で前提にしない」と正面から緊張する。加えて、その client fetch 経路は [0071](0071-bff-api-integration.md) の fetch wrapper(resilience は主に `adapters/server` に適用 = server 前提)ではカバーされず、所有者を明示しなければ **委譲先消失を再生産**する。

本 ADR は [0041](0041-cache-components-decision.md)(Cache Components 有効化判断 = triage #1)からの per-subject 分割で独立させたものである。0041 は「1 ADR = 1 主題」の原則に照らすと Cache Components 判定(#1)とページネーション(#7)という主題差を束ねていたため、後者を本 ADR に分離した。

## 決定

### 1. ページネーションは cursor 既定・ページ状態は searchParams(RSC 駆動 = 0060 の内側)

- **cursor ページネーションを既定**とする。offset は「小さく安定した集合」または「ページ番号ジャンプが要件」の場合に限り許容する。
  - **vendor-independent な正当性材料**: cursor はデータの挿入 / 削除に対して安定(境界がずれても行のスキップ・重複が起きない)であり、offset は挿入 / 削除でページ境界がずれる。これは一般的なデータ整合の性質であって Next.js 非依存の根拠である。
- **ページ状態(現在ページ / cursor)は searchParams で表現**する([0060](0060-state-management.md) の「URL state は Next.js 標準機構」に乗る)。ブックマーク・共有・戻る操作が正しく復元できる。
- 頁送り(前 / 次 / 番号)は **searchParams 駆動で RSC が再取得する既定経路**とする。これは 0060 の「Server state = Server Component fetch 既定」の**内側**であり、例外を要さない。したがって**大半の一覧は client 追加取得を持たずに成立する**。

### 2. 無限スクロールの client 追加取得は限定した明示例外・所有は `adapters/client`

- 無限スクロール(`IntersectionObserver` による末尾到達検知 + 追加取得)は client fetch を必然的に伴うため、[0060](0060-state-management.md) の「クライアントでのデータ取得を本体で前提にしない」既定に対する **明示的で限定された例外**として扱う(#7 由来)。例外は狭く保つ:
  - **初回ページは RSC 取得**(§1)。client fetch は「もっと見る」の**増分取得だけ**に限る。
  - **所有 = `adapters/client`**: client の追加取得は生 `fetch` をコンポーネントに散らさず、必ず **`adapters/client`([0024](0024-adapters-server-client-split.md) = client 側 remote IO の所有境界。同一オリジン BFF fetch が主で、presigned 直 PUT 等 ADR が明示に許す例外送信も同層が所有)経由**で行う。resilience(dual timeout / retry / breaker)は server 側 = `adapters/server`([0071](0071-bff-api-integration.md))が持ち、本 ADR の client 追加取得は same-origin(`/api/*` BFF / Route Handler)への薄い fetch に留める。これにより **0071 wrapper が server 前提でカバーしない client 経路の所有者を明示**し、委譲先消失を回避する。
  - **トリガー hook**(末尾到達を検知する reactive client hook)は既定で **feature ローカル**([0060](0060-state-management.md) client state = local から)。複数 feature を跨ぐ横断が生じた時点で **`capabilities` カーネル([0022](0022-capabilities-kernel.md))へ昇格**する([0021](0021-frontend-responsibility.md) 昇格ルール)。
  - **URL 復元性の優先**: 可能な限り searchParams 駆動の「もっと見る」ボタン(RSC 再取得)を優先し、真の無限スクロールは体感上それが要る箇所に限定する。無限スクロール採用時も現在 cursor は URL / state から復元可能に保ち、戻る / リロードで先頭に戻る UX 劣化を避ける。
- client 追加取得の response も **`adapters` 境界で runtime validation・エラー正規化**を通す([0071](0071-bff-api-integration.md) / [0080](0080-error-handling.md))。生 status・生エラーを UI へ漏らさない原則は client 経路でも同じである。
- **データ取得ライブラリ(TanStack Query 等)は引き続き同梱しない**([0060](0060-state-management.md) exclusion を破らない)。増分取得の状態は local state / `adapters/client` の薄い呼び口で足りる範囲に留める。

## 禁止事項

- ❌ ページ状態(現在ページ / cursor)を searchParams 以外(コンポーネント state のみ 等)に閉じ込め、ブックマーク・共有・戻る操作で復元不能にすること(§1)
- ❌ 挿入 / 削除が起きるデータで安易に offset ページネーションを既定にすること(cursor 既定。offset は限定条件のみ)
- ❌ 無限スクロール / 追加取得の client fetch を**生 `fetch` でコンポーネントに直接書く**こと(必ず `adapters/client` 経由。§2 / [0024](0024-adapters-server-client-split.md))
- ❌ client 追加取得に resilience(timeout / retry / breaker)を **client 側で独自実装**すること(resilience は server = `adapters/server` が持つ。client は same-origin の薄い fetch)
- ❌ client 追加取得の response を検証・正規化せず UI へ流すこと([0071](0071-bff-api-integration.md) / [0080](0080-error-handling.md) の境界原則は client 経路にも適用)
- ❌ 無限スクロールを理由にデータ取得ライブラリを持ち込むこと([0060](0060-state-management.md) exclusion)

## 補足

- **既存 ADR 本体の相互参照の張り直しは別作業**: 本 ADR は §2 で 0060 の既定に対する明示例外を宣言するが、参照元である **0060 本文の「client 取得を前提にしない」** は Accepted の Protected Documentation であり、本 ADR 作成時点では編集しない。これへ本 ADR への back-link を付す作業は、[0010](0010-standards-and-non-lockin.md) 補足と同じく **AGENTS.md 整合 / v1 の大規模整理フェーズ**でまとめて行う。それまで旧参照は「client 取得を前提にしない」の文言のまま残る(読み手が旧 ADR だけを読むと本 ADR の例外を見落とし得る点に留意)。
- 本 ADR は [0140](0140-documentation-operations.md) のタクソノミーにおいて **decision** 分類に属する(#7 = 既定への例外を追加する decision)。日常強制される rule(頁送り UI の細部・スケルトン等)は `docs/rules.md`(0140 方針・要新設)側に置く。
- Cache Components(PPR)有効化判断(#1)は本 ADR の対象外であり、[0041](0041-cache-components-decision.md) が所有する。無限スクロールの初回 RSC 取得が拠って立つキャッシュモデル(0.0.x = 従来モデル)は 0041 §1 の確定に従う。

## 関連 ADR

- [0041-cache-components-decision.md](0041-cache-components-decision.md)— Cache Components(PPR)有効化判断(#1。本 ADR の分割元。0.0.x = 無効 = 従来キャッシュモデルの土台)
- [0060-state-management.md](0060-state-management.md)(B5)— Server state = RSC fetch 既定 / URL state = Next 標準機構(本 ADR §1 の土台)/ client 取得非前提(本 ADR §2 が限定例外を追加)/ データ取得ライブラリ非同梱
- [0071-bff-api-integration.md](0071-bff-api-integration.md)(B3)— データ取得のキャッシュ・再検証 / fetch wrapper resilience は `adapters/server` 前提(本 ADR §2 の client 経路の対)
- [0080-error-handling.md](0080-error-handling.md)(B6)— `adapters` 境界のエラー正規化(本 ADR §2 の client 追加取得 response にも適用)
- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md)— `adapters/client`(client 側 remote IO の所有境界。同一オリジン BFF fetch が主。本 ADR §2 の client 追加取得の所有者)
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md)— 横断 client hook の昇格先(無限スクロールのトリガー hook が cross-feature 化した時の家)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md)— 標準準拠・非ロックイン判断軸(本 ADR の vendor-independent 正当性材料の根拠)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md)— 昇格ルール(feature ローカル → capabilities)
