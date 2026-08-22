# パフォーマンス予算

パフォーマンスの **計測指標(Core Web Vitals)/ 予算の仕組み(Lighthouse・bundle size)/ 具体閾値の所在** を定める。boilerplate は**仕組みと、用途に依らない閾値**を持ち、**用途で動く閾値だけを fork 先**へ委ねる。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([0140](0140-documentation-operations.md))。本 ADR の内容自体はユーザ決定済み(Tier 5)。日付 2026-07-13。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

BACKLOG C3 は、Core Web Vitals SLO・Lighthouse 閾値・bundle size 予算・計測の仕組みを未決としていた。

**予算値のうち用途(コンテンツ量・対象デバイス・SLA)に依存するのは bundle size であり、Core Web Vitals の閾値は依存しない。** 後者は Web の標準が "good" として定める境界そのもので、どのアプリでも同じ値を指す。両者を「予算値」として一括で fork 先へ委ねると、**どのフォークも計測はするが誰も落ちない**状態になり、仕組みだけが残る。

## 決定

### 1. 計測指標 = Core Web Vitals

- パフォーマンスの一次指標は **Core Web Vitals(LCP / INP / CLS)** とする(業界標準)。lab 計測(CI Lighthouse)に対する **field 値(RUM)の収集経路は [0082](0082-client-observability.md) が定める**(INP 等は実ユーザ操作を要するため field 側で補完)

### 2. 予算の仕組み(計測 + ハードゲート)

- **Lighthouse / bundle size 予算を CI で計測し、超過で落とす**。組込みは **B9([0153](0153-ci-configuration.md))** の枠(job 分割 / PR コメント upsert 基盤)に従う。計測 job は 2 つで、`lighthouse` が画面ごとの Core Web Vitals を、`bundle-budget` が route ごとの client JavaScript を持つ
- **2 つは判定の時点が違う。** `bundle-budget` は PR ごとの required check、`lighthouse` は保護ブランチへの push と日次で回し、落ちたら issue を立てる。**PR でも待たずに測る場合が 2 つあり、どちらも構造で決まる** —— 画面の宣言(`e2e/lib/screens.ts`)が動いたとき(**一度も測られていない画面**が生まれた可能性があり、比べる先の数値が存在しない)と、layout が動いたとき(全画面がそこを通る)。数値を要さずに理由を言えるものだけを置く。それ以外の「大きい差分」は変更行数で見るが、**こちらは gate ではなく合図**であり、線は `performance-budget.yaml` が「根拠のある数ではない」と明記したうえで持つ。**Lighthouse の計測は直列でしか成立しない** —— 同時に測ると並列度そのものが数値へ混ざるため、費用が `画面数 × 試行回数` に張り付く(同梱サンプルの実測で 23 画面 × 3 試行 ≒ 16 分)。試行を削れば runner のぶれを吸う中央値を失い、画面を削れば宣言から全数を引く意味を失うので、**削るのは網羅ではなく頻度**とする。代償は、退行の検知が 1 マージぶん遅れること
- **閾値は本 ADR ではなく [`performance-budget.yaml`](../../performance-budget.yaml) が持つ**。値を変えるたびに ADR を書き換える形にすると、閾値を動かした事実が決定の履歴に紛れる。宣言には**根拠を必須**にし、空なら読み込みの時点で落とす
- Lighthouse が判定するのは **LCP / CLS / TBT の 3 つだけで、performance スコアは見ない**。スコアは 5 指標の加重平均であり、下がったときにどれが下がったかを答えられない。INP は実ユーザの操作を要して lab では測れないため、その代替として TBT を見る(field 値の収集経路は [0082](0082-client-observability.md))
- **CI runner の数値はぶれるため、画面ごとに複数回測って中央値を採る**。試行回数も同じ宣言が持つ。ぶれを理由に閾値を緩め続けると gate として機能しなくなるので、緩めるのは**その画面が重いことを設計として引き受けたとき**に限る
- **開く画面の一覧は計測側で持たない**。[`e2e/lib/screens.ts`](../../e2e/lib/screens.ts) の宣言(build の出力と突き合わされる)をそのまま使う。一覧を 2 箇所に持つと、片方だけへ足された画面が黙って測られないまま緑で通る
- **client JavaScript は成果物から引く**。`next build` の出力に First Load JS の列が無いため、route ごとの `__RSC_MANIFEST` と `build-manifest.json` から chunk を集めて gzip する。数えるのは **公開 route の単位**であり、成果物の entry の単位ではない —— 並行ルート(`@slot`)を持つ route は entry を複数持ち、開いたときの HTML はその全ての script を読むので、和集合で数える。entry ごとに数えると同じ route が複数行に割れ、上限も増分もそのうちの 1 つしか見ない
- **polyfill は数えない**。Next.js が `<script nomodule>` で出すため、[0102](0102-browser-support.md) が対応対象とするブラウザは一度も取得しない。数えると、誰も読まない量が全 route へ一律に乗り、予算が見ているはずの「開いた人が払う量」から離れる

### 3. 具体閾値の所在

**用途で動くかどうかで所在が分かれる。**

| 閾値 | 所在 | 理由 |
| --- | --- | --- |
| Core Web Vitals の LCP / CLS | **boilerplate 本体が持ち、fork 先もそのまま引き継ぐ** | "good" の境界は Web の標準が定める固定値であり、アプリの用途では動かない |
| TBT | boilerplate 本体が持つ | **これは Core Web Vitals ではなく、Lighthouse が INP の lab 代替として置く指標である。**したがって根拠も上とは別で、"標準が定めた値だから"ではなく"INP を lab で測る手段が他に無いから"そのまま採る。INP そのものの "good" 境界(200 ms)と数値が一致するのは Lighthouse のスコアリング規約の側の都合であり、[0010](0010-standards-and-non-lockin.md) §2 の非ロックイン判定に照らせば、Lighthouse を外した瞬間にこの値の根拠は失われる。**計測手段を変えるときは、この行だけ置き直すこと** |
| bundle size の route ごとの上限 | **fork 先が測り直して置き換える** | 同梱サンプルの実測に由来する値で、別のアプリでは意味を持たない |
| bundle size の増分の上限 | boilerplate 本体が持つ | 依存更新や chunk の切り直しで動く幅であり、用途に依らない |

画面ごとに上限を緩めるのは、その画面が重いことを設計として引き受けたときに限り、`performance-budget.yaml` の `lighthouse.screens` へ根拠付きで宣言する。

### 4. 重さを持ち込まない書き方

**予算は超えてから直すより、超える書き方を避けるほうが安い。** 同梱サンプルの計測で繰り返し現れた形を、規約として置く。

- **値を 1 つ取るために、検証やスキーマの一式を引き込まない。** 定数・項目名・上限値は、それを使う側が検証を必要としないなら、検証を持たない module へ置く。JavaScript の import は module 単位なので、`const` を 1 つ取る import が zod のスキーマ一式を bundle へ載せる。入力欄の `name` は `form-names.ts`、件数の上限は `page-size.ts` のように、**綴りと数だけを持つ module** を分けるのが既定
- **初期表示に要らない重い部品は `next/dynamic` で最初に読む一式から外す。** 判断の材料は「その画面を開いた人が必ず見るか」であり、見ない可能性があるもの(閉じている脇の領域、折り返しの下にある編集面や作図)を外す。**枠は出来上がりと同じ寸法で置く** —— 置かないと、届いた瞬間に下の要素がまとめて動く
- **`next/dynamic` は「見るまで取りに行かない」ではない。** 取得が始まるのは**要素がマウントした時点**で、`hidden` で隠れていても、折り返しの下にあっても始まる。したがって効くのは**最初に読む一式(`bundle-budget` が数える範囲)から外れること**までで、同じページを開いた人はそのバイトを結局払う。取得そのものを遅らせたいなら、描かない条件を持つのは呼び出し側であり、`dynamic` ではない
- **待機表示を、外枠が既に持っているデータへ置かない**([0040](0040-routing-rendering-strategy.md) の「境界は待つものの単位で置く」)。外枠と画面が同じ取得を共有する場合、画面側の `<Suspense>` は既に手元にある値を待つだけで、**画面を二度継ぎ足して読み始めた位置を動かす**
- **和文の Web フォントを本文へ置かない**([0051](0051-styling-system.md) §5)。`@font-face` の宣言が描画をブロックする CSS として載るため、client JavaScript より先に効く
- `NEXT_PUBLIC_` の表面積最小化([0030](0030-environment-variable-management.md))・`"use client"` 境界の葉押し下げ([0040](0040-routing-rendering-strategy.md))が、これらの土台

## 禁止事項

- ❌ 計測の仕組み自体を持たないこと
- ❌ 根拠を書かずに閾値を置くこと(読み込みの時点で落とす)
- ❌ 落ちたことを理由に閾値を緩めること(gate として機能しなくなる)
- ❌ 計測する画面の一覧を `e2e/lib/screens.ts` の外に持つこと
- ❌ 定数を取るためだけに、検証・スキーマを持つ module から import すること

## 関連 ADR

- [0153-ci-configuration.md](0153-ci-configuration.md)(B9)— Lighthouse / bundle 計測の CI 組込み先(job 分割 / PR コメント基盤。計測 job 自体は実装 PR で追加)
- [0082-client-observability.md](0082-client-observability.md)— CWV の field 値(RUM)収集経路を補完(lab の Lighthouse では INP 等を計測できないため)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md)(A4)— `"use client"` 葉押し下げ(bundle 抑制の土台)
- [0030-environment-variable-management.md](0030-environment-variable-management.md)(A7)— `NEXT_PUBLIC_` 表面積最小化
- [0050-styling-strategy.md](0050-styling-strategy.md)(B1)— Tailwind(CSS サイズの土台)
