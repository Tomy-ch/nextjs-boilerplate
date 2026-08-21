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
- **2 つは判定の時点が違う。** `bundle-budget` は PR ごとの required check、`lighthouse` は保護ブランチへの push と日次で回し、落ちたら issue を立てる。**Lighthouse の計測は直列でしか成立しない** —— 同時に測ると並列度そのものが数値へ混ざるため、費用が `画面数 × 試行回数` に張り付く(同梱サンプルの実測で 23 画面 × 3 試行 ≒ 16 分)。試行を削れば runner のぶれを吸う中央値を失い、画面を削れば宣言から全数を引く意味を失うので、**削るのは網羅ではなく頻度**とする。代償は、退行の検知が 1 マージぶん遅れること
- **閾値は本 ADR ではなく [`performance-budget.yaml`](../../performance-budget.yaml) が持つ**。値を変えるたびに ADR を書き換える形にすると、閾値を動かした事実が決定の履歴に紛れる。宣言には**根拠を必須**にし、空なら読み込みの時点で落とす
- Lighthouse が判定するのは **LCP / CLS / TBT の 3 つだけで、performance スコアは見ない**。スコアは 5 指標の加重平均であり、下がったときにどれが下がったかを答えられない。INP は実ユーザの操作を要して lab では測れないため、その代替として TBT を見る(field 値の収集経路は [0082](0082-client-observability.md))
- **CI runner の数値はぶれるため、画面ごとに複数回測って中央値を採る**。試行回数も同じ宣言が持つ。ぶれを理由に閾値を緩め続けると gate として機能しなくなるので、緩めるのは**その画面が重いことを設計として引き受けたとき**に限る
- **開く画面の一覧は計測側で持たない**。[`e2e/lib/screens.ts`](../../e2e/lib/screens.ts) の宣言(build の出力と突き合わされる)をそのまま使う。一覧を 2 箇所に持つと、片方だけへ足された画面が黙って測られないまま緑で通る
- bundle size は Next.js のビルド出力(route ごとのサイズ)を可視化する。`NEXT_PUBLIC_` の表面積最小化([0030](0030-environment-variable-management.md))・`"use client"` 境界の葉押し下げ([0040](0040-routing-rendering-strategy.md))が bundle を抑える構造的土台

### 3. 具体閾値の所在

**用途で動くかどうかで所在が分かれる。**

| 閾値 | 所在 | 理由 |
| --- | --- | --- |
| Core Web Vitals の LCP / CLS | **boilerplate 本体が持ち、fork 先もそのまま引き継ぐ** | "good" の境界は Web の標準が定める固定値であり、アプリの用途では動かない |
| TBT | boilerplate 本体が持つ | **これは Core Web Vitals ではなく、Lighthouse が INP の lab 代替として置く指標である。**したがって根拠も上とは別で、"標準が定めた値だから"ではなく"INP を lab で測る手段が他に無いから"そのまま採る。INP そのものの "good" 境界(200 ms)と数値が一致するのは Lighthouse のスコアリング規約の側の都合であり、[0010](0010-standards-and-non-lockin.md) §2 の非ロックイン判定に照らせば、Lighthouse を外した瞬間にこの値の根拠は失われる。**計測手段を変えるときは、この行だけ置き直すこと** |
| bundle size の route ごとの上限 | **fork 先が測り直して置き換える** | 同梱サンプルの実測に由来する値で、別のアプリでは意味を持たない |
| bundle size の増分の上限 | boilerplate 本体が持つ | 依存更新や chunk の切り直しで動く幅であり、用途に依らない |

画面ごとに上限を緩めるのは、その画面が重いことを設計として引き受けたときに限り、`performance-budget.yaml` の `lighthouse.screens` へ根拠付きで宣言する。

## 禁止事項

- ❌ 計測の仕組み自体を持たないこと
- ❌ 根拠を書かずに閾値を置くこと(読み込みの時点で落とす)
- ❌ 落ちたことを理由に閾値を緩めること(gate として機能しなくなる)
- ❌ 計測する画面の一覧を `e2e/lib/screens.ts` の外に持つこと

## 関連 ADR

- [0153-ci-configuration.md](0153-ci-configuration.md)(B9)— Lighthouse / bundle 計測の CI 組込み先(job 分割 / PR コメント基盤。計測 job 自体は実装 PR で追加)
- [0082-client-observability.md](0082-client-observability.md)— CWV の field 値(RUM)収集経路を補完(lab の Lighthouse では INP 等を計測できないため)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md)(A4)— `"use client"` 葉押し下げ(bundle 抑制の土台)
- [0030-environment-variable-management.md](0030-environment-variable-management.md)(A7)— `NEXT_PUBLIC_` 表面積最小化
- [0050-styling-strategy.md](0050-styling-strategy.md)(B1)— Tailwind(CSS サイズの土台)
