> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# capabilities

connectivity、media query、storage、clipboard など、複数 feature が使うブラウザ runtime 能力の client hook を置くカーネルです。

## 受け入れるもの

- 横断利用される client-only hook と browser API の薄い抽象

## 受け入れないもの

- remote IO、server config、業務状態、UI、ポリシー状態
- UI に密着した挙動の hook（focus trap / scroll lock など）。runtime 能力ではなく UI 挙動なので、その
  コンポーネントへ共置する（[0022](../../docs/adr/0022-capabilities-kernel.ja.md) 合成方針）

## 運用

- client-only の実装では `"use client"` を最小の境界に置く
- 単一 feature 専用 hook は feature 内に置く
- Provider を export して root layout に mount する形は [0022](../../docs/adr/0022-capabilities-kernel.ja.md) /
  [0026](../../docs/adr/0026-layout-shell-mount.ja.md) が定める。Provider の外で呼ばれた hook が throw するか
  no-op になるかは hook の側が決める（[`docs/rules.ja.md`](../../docs/rules.ja.md#layers)）

### 供給の形

hook が返すものは、能力が**変わり続ける値**か**一度起きる出来事**かで決まる。

- **変わり続ける値**（条件の一致、回線の有無、直近の向き）は `useSyncExternalStore` で供給する。
  `subscribe` / `snapshot` / `serverSnapshot` を別々の関数として置き、購読の開始と解除は `subscribe` の
  返り値で対にする。ブラウザの値を `useState` へコピーして `useEffect` で追う形は採らない —— 外部の値を
  読む React の標準の形がこちらであり（[0022](../../docs/adr/0022-capabilities-kernel.ja.md) 移植性）、
  サーバ側の初期値が `serverSnapshot` という 1 か所に立つ
- **一度起きる出来事**（要素が見えた）は callback で受け取り、見張る対象へ渡す ref を返す。「起きた」を
  state で配ると、読む側がそれを見張る effect と最新の処理を掴む ref を書くことになり、その一式が読む
  側の数だけ増える。callback は ref に最新を保ち、**処理が変わっても購読を張り直さない** —— 張り直しの
  瞬間に起きた出来事は落ちる
- **何をするかは持たない。** 知らせるだけで、そこで何を始めるかは呼び出し側が決める
- 省略できる調整（手前の距離、見張るかどうか）は 1 つの options object で受け、デフォルトは hook 側が持つ。
  **見張るかどうかを option で受け、`false` の間は購読そのものを持たない** —— 要素の出し入れと購読の
  有無を分けて扱えるようにする（読み終えた、続きが無い、の場面で目印を残したまま知らせだけを止める）
- 揺れる入力から向きや段を導くときは、名前を持つ定数で不感帯を置き、その理由を定数の doc に書く。
  最小単位で切り替えると、指の震えや慣性の揺り返しで姿が入れ替わり続ける（例:
  [`use-scroll-direction`](use-scroll-direction.ts) の `THRESHOLD_PX`）
- hook API はデファクト標準の形（慣用のシグネチャ）に寄せる（[0022](../../docs/adr/0022-capabilities-kernel.ja.md)
  移植性）

### サーバ側の初期値

サーバには browser の値が無い。`serverSnapshot` は**初回の HTML が取るべき姿**を返す関数として置き、
doc に「常に X を返す」と、なぜその側かを書く。選ぶのは「利用者がまだ何もしていない側」か「その HTML
が配られたこと自体が前提とする側」で、実装はどれも同じ決め方をしている。

| 能力 | サーバの値 | 選んだ根拠 |
| --- | --- | --- |
| 条件の一致 | 一致していない側 | 条件は評価できない。一致した側にだけ現れる UI は hydration の後に現れる |
| 回線の有無 | 繋がっている側 | 繋がっていない端末へ配られるのはキャッシュされた応答 |
| 直近の向き | まだ動いていない側 | 位置を知れない |

**サーバに値が無い能力は、hook の `@remarks` に次の 3 点を書く**: サーバの値、初回レンダリングがどちらの姿に
なるか（hydration までは操作できるかもその姿に従う）、それゆえ使えない出し分け（本文の幅・順序が変わる
もの）。初期値と実際の環境がずれるぶんだけ hydration で表示が動くため、位置が動く出し分けには使わせない
（CSS 側で表現する）。何が使ってよい出し分けかは「使う側の線」。

### 購読の持ち方

- 値が引数で決まる（query）なら、購読は呼び出しごとに持ち、引数を deps にして張り直す
- 値が画面に 1 つしか無い（scroll の向き）なら、購読は module に 1 つへ畳む。listener の集合を持ち、
  **最初の購読で監視を始め、最後の解除で終える**。コンポーネントの数だけ listener を張ると、イベントのたびに同じ
  計算がその数だけ走る。畳んだ分だけ module が状態を持つので、テストは module を読み直す（「テストの
  書き方」）
- scroll の listener は `{ passive: true }` で張る
- 解除は必ず返し、テストで固定する

### 使う側の線

- **位置が動く出し分けは CSS で行い、この hook で行わない。** 使ってよいのは、DOM を残したままでは
  成立しないもの（focus trap を持つ面）と、現れても位置が動かないもの。規則は
  [`docs/rules.ja.md`](../../docs/rules.ja.md#layout)、hydration との関係は
  [`docs/design/rendering.md`](../../docs/design/rendering.md#サーバでしか分からないことブラウザでしか分からないことがある)
  が持つ
- 幅の段を条件にするときは数値を書かず、[`model/breakpoint`](../model/breakpoint.ts) が design token
  から組む文字列を渡す。JS 側に数値を書くと、段を差し替えたときに CSS 側の境界とずれる
- **能力と、その先の成否は別。** 回線があることと通信が成立していることは別で、接続の生死は接続を持つ
  側（購読 seam）が持つ。画面はどちらも要る（[0022](../../docs/adr/0022-capabilities-kernel.ja.md)
  受け入れないもの）

### テストの書き方

**hook のテストは Vitest + React Testing Library の `render` / `act` を使う**。`test-requirement` は
`unit` だが、React の hook API を内部で使うものは React のツリーを介してしか呼べないため、純粋ロジックと
同じ手段では検証できない（選択基準は「対象が hook API を使うか」。[0090](../../docs/adr/0090-testing-strategy.ja.md)）。

- ファイル先頭に `// @vitest-environment jsdom` を置く。デフォルトの環境は node（`vitest.config.ts`）
- hook を呼ぶだけの Probe component を書き、返り値をレンダリング結果に映して読む
  （[`docs/testing-conventions.md`](../../docs/testing-conventions.md#component--hook-のテスト--testing-library-の原則) の「利用者が観測するものをアサートする」）
- jsdom に無い browser API は `vitest.setup.ts` が補う（補いの一覧はそのファイルが持つ）。**変化を起こす
  必要があるテストは、そのファイルで `vi.stubGlobal` に制御できる最小の実装を置く** —— listener の集合と、
  それを発火させる `change` / `fire` を返す形。読み取り専用の値（`navigator.onLine` / `window.scrollY`）は
  `vi.spyOn(…, "get")` / `Object.defineProperty` で差し替える
- サーバ側の初期値は `renderToStaticMarkup` でレンダリングして固定する。stub を置かずに回し、browser の値を見ずに
  初期値を返すことを確かめる
- 解除を固定する。購読ごとの hook は unmount 後の listener 数が 0 であること、module に畳んだ hook は
  最後のコンポーネントが外れたときだけ `removeEventListener` が呼ばれ、まだコンポーネントが残るあいだは呼ばれないこと
- module に畳んだ購読は前のテストの状態を持ち越す。テストごとに `vi.resetModules()` してから動的
  `import` で読み直し、Probe の呼ぶ先を差し替える

## 置いている hook

| hook | 供給する能力 |
| --- | --- |
| [`use-media-query`](use-media-query.ts) | 幅・入力方式などのメディア条件の一致 |
| [`use-online-status`](use-online-status.ts) | 回線が繋がっているか（`navigator.onLine` の購読） |
| [`use-scroll-direction`](use-scroll-direction.ts) | 直近の scroll がどちらへ向いたか |
| [`use-on-visible`](use-on-visible.ts) | 要素が見えたこと（`IntersectionObserver` の購読） |

## 監査の観点

| 観点 | 判定の形 | 根拠 |
| --- | --- | --- |
| `forbidden: adapters` — `adapters` を import せず、`fetch` などの remote IO を持たない | violation。import と購読の組み立て（`EventSource` / `WebSocket`）は機械が落とすので、ここで見るのはグローバルの `fetch` の呼び出し | [0022](../../docs/adr/0022-capabilities-kernel.ja.md) 禁止事項。機械: ESLint boundaries と `no-restricted-syntax` |
| `forbidden: components` — UI コンポーネントを import しない | violation | [0021](../../docs/adr/0021-frontend-responsibility.ja.md) 依存マトリクス。機械: ESLint boundaries |
| `forbidden: stores` — `stores` を import しない | violation | [0021](../../docs/adr/0021-frontend-responsibility.ja.md) 依存マトリクス。機械: ESLint boundaries |
| `forbidden: server-config` — server config（`*.server.ts`）を import しない。`NEXT_PUBLIC_` の公開定数（`*.client.ts`）は読んでよい | violation | [0022](../../docs/adr/0022-capabilities-kernel.ja.md) 禁止事項 / [0021](../../docs/adr/0021-frontend-responsibility.ja.md) 依存マトリクス。ESLint は `config` をレイヤーの粒度でしか見ない |
| `forbidden: business-state` — 業務状態、同意や feature flag のようなポリシー状態、購読の生死や backoff のような通信機構の状態を持たない。持つのはブラウザ runtime の能力だけ | 業務状態は violation。状態がポリシーや通信機構のコピーかどうかが読み分けられないときは suggestion | [0022](../../docs/adr/0022-capabilities-kernel.ja.md) 禁止事項 |
| 置いてある hook は複数の feature から使われる。1 つの feature 専用の hook は feature の内側に置く | 使う feature が 1 つしか無ければ suggestion | [0022](../../docs/adr/0022-capabilities-kernel.ja.md) / この README「運用」 |
| サーバに値が無い能力は、サーバ側の初期値を hook の doc に書く | 書かれていなければ violation。`renderToStaticMarkup` で固定するテストが無ければ suggestion | この README「サーバ側の初期値」/「テストの書き方」 |
| 変わり続ける値は `useSyncExternalStore` で供給し、`serverSnapshot` を名指す | browser の値を `useState` へコピーして `useEffect` で追う形なら suggestion | この README「供給の形」 |
| 購読を張った hook は解除を返し、テストが解除を固定する | 解除が無ければ violation。解除を固定するテストが無ければ suggestion | この README「購読の持ち方」/「テストの書き方」 |

## 関連する ADR

- [0021](../../docs/adr/0021-frontend-responsibility.ja.md) — レイヤーの責務と import 境界
- [0022](../../docs/adr/0022-capabilities-kernel.ja.md) — このカーネルが受け持つ範囲と、単一 feature 用の hook を昇格させない線
- [0026](../../docs/adr/0026-layout-shell-mount.ja.md) — Provider を root layout へ薄く mount する例外
- [0040](../../docs/adr/0040-routing-rendering-strategy.ja.md) — Server / Client Component の割り方と `"use client"` の置き場
- [0090](../../docs/adr/0090-testing-strategy.ja.md) — レイヤーごとのテストの受け持ちと co-location
