---
imports-allowed: [model, errors, config] # 生成物。`pnpm gen:architecture` で直す
forbidden: [adapters, components, capabilities, server-config, business-logic]
test-requirement: unit
---

# stores

複数 feature が共有する client 状態を置く client-only カーネルです。実装時の store は Zustand を用います。

## 受け入れるもの

- 選択状態、ウィザード、グローバル UI トグルなどの横断 client 状態
- ポリシー状態のうち、**初回描画より前に同期で要り、かつ反応的**なもの。この 2 条件が揃う値は、生の
  読み書きごとここが持つ（[0031](../../docs/adr/0031-policy-state-supply.md)「家の決まり方」）

## 受け入れないもの

- server state、単一 feature の状態、UI マークアップ、secret、業務ロジック

## モジュール

| モジュール | 役割 |
| --- | --- |
| `consent-store.ts` | 任意の用途に cookie を使ってよいかという意思。選んだ結果を cookie へ残し、その場でツリーへ反映する |

<!-- sample:begin -->
同梱のサンプルが加えるもの:

| モジュール | 役割 |
| --- | --- |
| `cart-store.ts` | サンプル画面が共有する「カートを開いているか」という要求。hook をそのまま公開し selector で読ませる形の例 |

<!-- sample:end -->
## 運用

- client-only の実装では `"use client"` を最小の境界に置く
- 単一 feature の状態は feature 内の local state に留める
- `create` が返す store は module に 1 つで、Provider を要しない。Provider を要する形を採るなら、その
  mount 位置は [0026](../../docs/adr/0026-layout-shell-mount.md) が定める

### store の形

- 1 ファイル 1 store。ファイルは `<対象>-store.ts`、型は `<対象>Store`、hook は `use<対象>Store`。テストは
  隣に `<対象>-store.test.ts`（DOM に触るなら `.tsx`）を置く（[0027](../../docs/adr/0027-directory-structure.md)
  フラット共置）。`pnpm gen` に store の種類は無い（`feature` / `component` / `adapter` のみ）ので手で置く
- `create<State>()` の初期化子に、初期値と更新の操作を一緒に置く。操作は state の一部として持ち、読む側に
  `setState` を直接叩かせない —— 更新の入口が store の中に揃う
- 読む側は**値ごとに selector で選ぶ**（`useXStore((s) => s.field)`）。store 全体を取ると、無関係な値が変わる
  たびに描き直る。操作だけが要る側は操作だけを選ぶ —— 操作の参照は変わらないので、状態が動いても描き直らない
- 公開面は 2 通りある。読む側が feature で、読み書きに副作用が無いなら、hook をそのまま export する。
  **読みや書きに副作用が伴う**（保存先から読み戻す、保存先へ書く）なら store は export せず、状態を返す hook と
  書き込む関数だけを公開する。**書き込みと反映は 1 つの関数にまとめる** —— 別々に呼べる形にすると、書いたが
  反映していない状態とその逆が作れる（例: [`consent-store`](consent-store.ts) の `decideConsent`）

### 持つ状態の切り方

- **持つのは要求で、見せ方ではない。**「中身を見たい」を持ち、drawer で本文へ被せるか脇の領域を出すかは、
  幅を知っている器が決める。見せ方を store に持つと、器が変わるたびに store が変わる
- サーバが所有する値の写しは持たない（[0023](../../docs/adr/0023-stores-kernel.md)）。**持ちそうに見えるものほど、
  持たないことを doc に書く** —— 開閉を持つ store が中身を持たない、のように
- **寿命を doc に書く**: リロードをまたぐか、またぐなら保存先はどこか。またぐ store は次項の初期値の制約に掛かる

### サーバ側の初期値と hydration

- **初期値はサーバとブラウザで同じにする。** 初期化子で `document` / `window` / `location` / storage を読まない
  —— サーバには無く、あっても両側で違う値になる
- ブラウザでしか読めない値は、**「まだ読んでいない」を初期値に置き、hook の mount 後の effect で 1 回だけ読む。**
  「読んだが無い」と分けて持つ —— どちらもゲートは閉じるが、尋ねるかどうかが逆になる（判別 union の形は
  [`model/consent`](../model/consent.ts) の `ConsentState`）。読み終えたかを見てから読み、2 度目の mount で
  読み直さない。以後の書き換えは書き込む関数だけが行う
- 帰結として、サーバはその値を知らないので、**値に依る面は読み取りの後に現れる**。知らないまま出すか、知るまで
  待つかのどちらかしかない。サーバ側で読まない根拠は [0131](../../docs/adr/0131-cookie-consent.md) §1
- **Zustand の hook のサーバ側スナップショットは `getInitialState()`** で、読み終えた後も初期値を返す。Cache
  Components の下では穴が届いた時点で subtree の hydration がもう一度走り、そのとき server snapshot が読まれて
  「まだ読んでいない」へ巻き戻る —— 出した面が一度消えて開き直り、その消失が layout shift として数えられる。
  **mount 後に読み戻す store は Zustand の hook を公開せず**、`useSyncExternalStore(store.subscribe, snapshot,
  snapshot)` と、両側で同じ現在値を返す 1 つの snapshot 関数で束ねる（例: [`consent-store`](consent-store.ts) の
  `useConsentState`）。hydration mismatch の一般論は
  [`docs/design/rendering.md`](../../docs/design/rendering.md)「hydration mismatch は偶発的ではない」

### ブラウザの保存先へ書く store

- cookie の属性を用途ごとに明示すること、`HttpOnly` を付けられない帰結、綴りを `model` の 1 口に寄せること、
  biome の `noDocumentCookie` をファイル単位の overrides で外す宣言は
  [`docs/rules.md`](../../docs/rules.md)「データ分類と機微情報」のアプリ cookie の項が持つ
- **`secure` は `location.protocol === "https:"` のときだけ付ける。** 常に付けると `http://localhost` の開発で
  保存されず、選んでも次の描画でまた尋ねる
- 綴りの解釈（読めない値をどちらへ倒すか、版の突合）は `model` に置き、store は読み書きの口だけを持つ

### 使う側

- `components` は `stores` を import できない（[`docs/design/placement.md`](../../docs/design/placement.md)）。
  store を読む UI は feature か、root layout が mount する `app` の island に置く
- 全画面に掛かる状態は、それを読む面を **1 つの island** にまとめる。同じ状態を別々の island が購読すると、
  変えた直後に片方だけが反応する瞬間ができる
- story は decorator の中で、描画の前に `useXStore.setState(...)` で状態を置く。story ごとに変わる値は
  `parameters` で受ける

### テストの書き方

- `test-requirement` は `unit`。hook を介さない store は `getState()` / `setState()` / `subscribe()` で回し、
  node 環境で足りる。hook を持つ store（`useSyncExternalStore` を束ねるもの）は Testing Library の
  `renderHook` / `act` で回し、ファイル先頭に `// @vitest-environment jsdom` を置く（既定は node）
- module に 1 つの store は前のテストの状態を持ち越す。`beforeEach` で `setState` により初期値へ戻す ——
  読む側のテストも同じ
- **mount 後に 1 回だけ読み戻す store は `setState` で戻せない**（読んだかどうかも module が持つ）。テストごとに
  `vi.resetModules()` してから動的 `import` で読み直し、保存先はその前に置く
- サーバ側スナップショットは `renderToStaticMarkup` で Probe を描いて固定する。読む前は「まだ読んでいない」を、
  読み終えた後は読んだ値を返すことの両方
- cookie の属性は `document.cookie` を読んでも見えない（getter が返すのは名前と値だけ）。
  `vi.spyOn(document, "cookie", "set")` で書いた文字列を捕まえる。https 側は
  `vi.stubGlobal("location", { protocol: "https:" })`。後片付けは `afterEach` で `vi.unstubAllGlobals()` と
  `max-age=0` の上書き
- 購読している側へ変化が届くことを `subscribe` で固定する
- ケースの並びは [`docs/testing-conventions.md`](../../docs/testing-conventions.md)（store は「値を返す対象」。
  `// ----- 正常系 -----` / `// ----- 異常系 -----`）

### 追加のしかた

1. 昇格基準を確かめる —— 2 つ以上の feature が読み書きするか、[0031](../../docs/adr/0031-policy-state-supply.md)
   の 2 条件が揃うか。どちらでもなければ feature 内の local state
2. `<対象>-store.ts` を作り、`"use client"` を置く
3. 型・初期値・操作を書く。doc に「持たない写し」「寿命」、ブラウザでしか読めない値があればその読み取りの時点を書く
4. テストを隣に置く
5. 上の「モジュール」表に 1 行足す。読む側の feature README の依存カーネル表に、なぜ横断になるかを書く

## 監査の観点

| 観点 | 判定の形 | 根拠 |
| --- | --- | --- |
| `forbidden: adapters` — `adapters` を import せず、`fetch` などの remote IO を持たない。server state は RSC と `adapters` が持つ | violation。import は機械が落とすので、ここで見るのはグローバルの `fetch` の呼び出し | [0023](../../docs/adr/0023-stores-kernel.md) 禁止事項。機械: ESLint boundaries |
| `forbidden: components` — UI 部品を import せず、UI マークアップを持たない | violation | [0023](../../docs/adr/0023-stores-kernel.md) 禁止事項。機械: ESLint boundaries と `project-rules/no-markup-outside-ui-layers` |
| `forbidden: capabilities` — `capabilities` を import しない | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) 依存マトリクス。機械: ESLint boundaries |
| `forbidden: server-config` — server config（`*.server.ts`）を import せず、secret を持たない。`NEXT_PUBLIC_` の公開定数（`*.client.ts`）は読んでよい | violation | [0023](../../docs/adr/0023-stores-kernel.md) 禁止事項 / [0021](../../docs/adr/0021-frontend-responsibility.md) 依存マトリクス。ESLint は `config` を層の粒度でしか見ない |
| `forbidden: business-logic` — 業務ロジックを持たない。持つのは横断する client 状態とその更新だけ | violation。状態の更新か業務の判定かが読み分けられないときは suggestion | [0023](../../docs/adr/0023-stores-kernel.md) 禁止事項 |
| API の応答を store へ写して二重にキャッシュしない。選択の記録に含む表示値のスナップショットはこれに当たらない | suggestion（鮮度の責任を誰が持つかは store の型から決まらない） | [0023](../../docs/adr/0023-stores-kernel.md) 禁止事項 |
| 置いてある store は複数の feature から使われる。[0031](../../docs/adr/0031-policy-state-supply.md)「家の決まり方」で来た値（初回描画より前に同期で要り、かつ反応的）はこの数え方の対象外 | import する feature スライスが 2 つ未満なら suggestion | [0023](../../docs/adr/0023-stores-kernel.md) 禁止事項 / [0031](../../docs/adr/0031-policy-state-supply.md) 家の決まり方 / この README「運用」 |
| Zustand のストアを `src/stores/` の外で作らない | violation | [0023](../../docs/adr/0023-stores-kernel.md) 禁止事項 |
| 初期化子でブラウザでしか読めない値を読まず、mount 後に読み戻す store は両側で同じ現在値を返す snapshot で束ねる | 初期化子が `document` / `window` / `location` / storage に触れば violation。mount 後に読み戻す store が Zustand の hook をそのまま公開していれば violation。`renderToStaticMarkup` で固定するテストが無ければ suggestion | この README「サーバ側の初期値と hydration」 |
| store の doc に、持たない写しと寿命が書かれている | 書かれていなければ suggestion | この README「持つ状態の切り方」 |

## 関連する ADR

- [0021](../../docs/adr/0021-frontend-responsibility.md) — 層の責務と import 境界
- [0023](../../docs/adr/0023-stores-kernel.md) — このカーネルが受け持つ横断 client 状態と、server state の写しを置かない線
- [0026](../../docs/adr/0026-layout-shell-mount.md) — Provider や全画面に掛かる island を root layout へ mount する例外
- [0027](../../docs/adr/0027-directory-structure.md) — カーネル内のフラット共置
- [0031](../../docs/adr/0031-policy-state-supply.md) — 同意などポリシー状態の供給の形と、`stores` が生の読み書きごと持つ条件
- [0041](../../docs/adr/0041-cache-components-decision.md) — Cache Components の採用。root layout でサーバ側に cookie を読むと全画面が動的な穴を持つため、ブラウザで読み戻す形になる
- [0060](../../docs/adr/0060-state-management.md) — Zustand の採用と、server state をどこが持つか
- [0131](../../docs/adr/0131-cookie-consent.md) — 同意状態をブラウザ側で読む決定と、その帰結
