# 実装規約

この文書は、ADR の決定を日々の実装で適用するための規約集である。ADR が判断の根拠、ここが実装時の行動規約である。両者が矛盾する場合は ADR を優先する。

各規約の「強制手段」は、現時点で自動化済みのものと後続 PR で導入するものを区別する。`散文` はレビューで確認する規約であり、将来の自動化候補でもある。

テストの書き方とレビューの規約は分量が違うため、[テスト規約](testing-conventions.md)へ分けている。

| # | 規約 | 強制手段 | Rationale |
| --- | --- | --- | --- |
| 4 | mutation 後は、データの所有境界で `revalidateTag`、`revalidatePath`、または `router.refresh()` により UI を更新する。所有境界の決め方は #78、タグの綴りは #79 が持つ。 | P4-3 以降の adapter / feature テスト。 | [ADR 0071](adr/0071-bff-api-integration.md) |
| 5 | 同一 render 内で重複し得る取得は adapters 側で `cache()` または fetch memoization を使い、呼び出し側に重複排除を委ねない。 | P4-3 の adapter テスト。 | [ADR 0071](adr/0071-bff-api-integration.md) |
| 6 | `<Link>` の prefetch は既定で許可する。大量リンクを持つ一覧では `prefetch={false}` を明示する。 | 散文。 | [ADR 0040](adr/0040-routing-rendering-strategy.md) |
| 8 | Route Handler は Node runtime の薄い proxy に留め、業務ロジックを置かない。非同期の後処理には必要な場合だけ `waitUntil` を使う。 | ESLint boundaries と Route Handler テスト。 | [ADR 0070](adr/0070-backend-role-separation.md) |
| 12 | mutation 中は submit を無効化して二重送信を防ぎ、必要な操作には idempotency key を付与する。`useOptimistic` はロールバックを実装できる場合に限る。 | feature テスト。 | [ADR 0071](adr/0071-bff-api-integration.md) |
| 12b | 409 の楽観ロック競合では、再読み込み導線を表示する。差分提示はバックエンド契約が提供するときだけ行う。 | P5-12 の feature テスト。 | [ADR 0080](adr/0080-error-handling.md) |
| 17 | loading は形状が近い skeleton を優先し、遅延表示と `aspect-ratio` で CLS を抑える。 | Storybook と visual regression。 | [ADR 0080](adr/0080-error-handling.md) |
| 17b | 状態によって出入りする表示のせいで、操作の位置を動かさない。出し入れされる要素は操作より後ろへ置くか、同じ構造（見出し + 操作など）で器の高さを揃える。**高さを数値で予約して揃えない** —— 中の部品の寸法が変われば予約値が古くなる。 | Storybook と visual regression。 | [ADR 0053](adr/0053-ui-component-interaction-seam.md) |
| 18 | 各画面は loading、empty、error、success の4状態を**設計**し、その画面が**所有する**状態を実装・テストする。所有しない状態の部品は作らず、所有しないと決めた理由を README に書く。部分失敗は成功した領域を残して表示する。 | README 状態表、Storybook、feature テスト。 | [ADR 0080](adr/0080-error-handling.md) |
| 20 | エラー画面は 404、認可失敗、その他の失敗を区別し、再試行可能な失敗には `reset()` と復帰導線を用意する。 | `error.tsx` / `not-found.tsx` のテスト。 | [ADR 0080](adr/0080-error-handling.md) |
| 23 | z-index は token 化した段階値だけを使う。場当たりの数値増加を禁止する。 | P3-8 の token drift gate。 | [ADR 0050](adr/0050-styling-strategy.md) |
| 24 | スクロール復元はルーティング既定を尊重する。modal / drawer は body scroll を適切に lock し、アニメーションだけのために全体へ `scroll-behavior` を強制しない。 | interaction テストと手動確認。 | — |
| 26 | clipboard 操作には成功・失敗のフィードバックを付け、権限拒否や非対応環境のフォールバックを表示する。 | feature テスト。 | — |
| 29 | 画面は viewport を明示し、safe area、十分なタッチターゲット、hover 非依存を満たす。 | a11y lint、Storybook、手動確認。 | [ADR 0044](adr/0044-seo-metadata-strategy.md) |
| 33 | アイコンは `src/components/` の方針に従い、原則 lucide-react を使う。自作 SVG は `currentColor` を継承し、配置と用途を明示する。 | P3-8 の component review。 | [ADR 0052](adr/0052-ui-component-policy.md) |
| 34 | Tailwind class は読みやすいまとまりで記述する。長い class 列は component / variant に分け、`@apply` は使わない。 | Biome formatter と review。 | [ADR 0050](adr/0050-styling-strategy.md) |
| 35 | component API は意味のある props 名を使う。状態差分は variant、複合的な部品は compound component を検討し、無目的な `...rest` 転送を避ける。 | component テストと review。 | [ADR 0021](adr/0021-frontend-responsibility.md) |
| 38 | TypeScript は `type` を優先し、`enum` と `namespace` を使わない。`any` と型アサーション (`as`) は全面禁止し、型ガード・`satisfies`・パースで表現する。 | `erasableSyntaxOnly`、Biome `noExplicitAny`、ESLint の型アサーション禁止。 | [ADR 0020](adr/0020-adopted-architecture.md) |
| 38a | 値集合の公開定数は、`export const BUTTON_SIZE: Readonly<{ ... }> = { ... }` の形式で定義する。公開 API でなくても、複数ファイルが同じ概念の値を使う場合は所有モジュールを一つ決め、そこから参照する。native HTML 要素名など JSX／型構文そのものを表す値は直接記述してよい。 | review。 | [ADR 0028](adr/0028-naming-convention.md) |
| 39 | 公開 API には TSDoc を書く。コメントは「なぜ」を日本語で記し、廃止予定の API は `@deprecated` を付ける。 | review。 | [ADR 0140](adr/0140-documentation-operations.md) |
| 40 | 公開 API は `export function` を使う。値として渡す callback は arrow function を使い、React component / hook は既存の React 規約に従う。 | review。 | [ADR 0028](adr/0028-naming-convention.md) |
| 42 | `searchParams` は zod で検証し、URL のシリアライズ形式と既定値を明示する。**読めない値を既定へ倒す画面は features 側のスキーマで読み**（`.catch()` / `safeParse`。手書きの条件列で代替しない）、**契約に照らして落とす画面は adapters の契約スキーマを通す**（`parseProductQuery` など）。どちらでも**契約由来の範囲（上限・enum・書式）は adapters が公開するものを使い、features で書き直さない**。同じキーの繰り返しは、複数を選べる条件だけ並びとして残し、それ以外は未指定として扱う（`model/search-params.ts`）。 | feature テストと `model/search-params` の単体テスト。 | [ADR 0060](adr/0060-state-management.md) / [ADR 0029](adr/0029-type-design-discipline.md) |
| 43 | Web Storage には機微情報を保存しない。キー名を名前空間化し、SSR 安全な client 境界からだけ利用する。 | review と client component テスト。 | [ADR 0060](adr/0060-state-management.md) |
| 44 | アプリ cookie は用途を接頭辞に含め、`Secure`、`HttpOnly`、`SameSite`、`Max-Age` を用途ごとに明示する。読み書きは server 境界へ閉じ込める。 | P5-4 の Route Handler テスト。 | [ADR 0131](adr/0131-cookie-consent.md) |
| 47 | Server Action は `allowedOrigins` を設定し、Route Handler は state-changing request の origin を検証する。 | P5-4 と P6-2 のテスト / CI。 | [ADR 0070](adr/0070-backend-role-separation.md) |
| 48 | `dangerouslySetInnerHTML` は原則禁止する。リッチテキストは sanitizer を通し、外部 URL も利用前に検証する。 | Biome `noDangerouslySetInnerHtml`。 | [ADR 0110](adr/0110-security-operations.md) |
| 50 | 第三者 script は `next/script` の strategy を明示し、CSP と同時に設計する。`@next/third-parties` の採否は用途ごとに判断する。 | P6-2 の CSP 検証。 | [ADR 0131](adr/0131-cookie-consent.md) |
| 53 | 日時は表示 timezone を明示し、server と client で異なる値を初期 render しない。`suppressHydrationWarning` は理由を記録した例外だけにする。 | hydration を含む component テスト。 | [ADR 0040](adr/0040-routing-rendering-strategy.md) |
| 54 | 相対時刻は `Intl.RelativeTimeFormat` で表示し、更新が必要な client component だけを interval で再描画する。 | component テスト。 | [ADR 0040](adr/0040-routing-rendering-strategy.md) |
| 55 | UI 文言は feature 内の定数へ寄せる。エラー文言は errors の分類・表示モデルに従い、画面ごとに再定義しない。 | review。 | [ADR 0121](adr/0121-i18n-strategy.md) |
| 57 | polling は必要な場合だけ採用し、間隔・停止条件・バックグラウンドタブ抑制を定義する。 | feature テスト。 | [ADR 0060](adr/0060-state-management.md) |
| 63 | preview / staging は `noindex` を強制し、環境識別バナーの有無は fork 先の要件として Config で決める。 | P6-3 の metadata テスト。 | [ADR 0044](adr/0044-seo-metadata-strategy.md) |
| 65 | build info を露出するときは commit SHA と build time の出所を明示し、機微な環境変数を含めない。 | P4-2 の生成 / health endpoint テスト。 | [ADR 0072](adr/0072-api-type-generation.md) |
| 66 | `next/dynamic` は初期表示に不要で大きい client-only 機能に限る。`ssr: false` は SSR が不可能な理由を持つ場合だけ使う。**隠れたまま DOM に残る器（tab）へ置くときは、開かれるまで mount しない** —— `next/dynamic` は mount で取りに行くので、そうしないと初期の一式から外しただけで、取得と実行は最初の描画の直後に走る。 | `bundle-budget` job の「遅延 JS」「合計 JS」の列と review。移した先の量が見えるので、初期だけが減って合計が動かない変更として現れる。 | [ADR 0101](adr/0101-performance-budget.md) |
| 67 | server 専用モジュールは先頭で `import "server-only"` し、client component から参照させない。 | `scripts/server-only.gate.test.ts`（`*.server.ts` の綴りと突合）、`server-only` の build-time failure、ESLint boundaries。 | [ADR 0071](adr/0071-bff-api-integration.md) |
| 68 | Server Action ID の version skew が起きたら、再試行を繰り返さず full reload へ誘導する。 | P5-7 の integration テスト。 | [ADR 0040](adr/0040-routing-rendering-strategy.md) |
| 69 | 内部リンクは `next/link` を使い、生の `<a>` を使わない。外部リンクには必要な `rel` を付与する。 | ESLint の `project-rules/no-internal-anchor`。 | [ADR 0040](adr/0040-routing-rendering-strategy.md) |
| 70 | DOM マークアップは UI を担う層（`app` / `features` / `components`）にだけ置く。`adapters` / `capabilities` / `stores` / `config` などの内側で画面を描かない。Provider の合成は許す（[ADR 0022](adr/0022-capabilities-kernel.md) / [ADR 0026](adr/0026-layout-shell-mount.md)）。 | ESLint の `project-rules/no-markup-outside-ui-layers`（置いてよい層の宣言は `architecture.ts` の `UI_KERNELS`）。 | [ADR 0021](adr/0021-frontend-responsibility.md) |
| 71 | 本文の脇に常設する領域(サイドバー・レール)は `lg` 以上でだけ出す。`lg` 未満では本文へ被せて出す(overlay)。 | e2e の Responsive ジャーニー(`e2e/journeys/responsive.spec.ts`)。 | [ADR 0051](adr/0051-styling-system.md) |
| 72 | 常に届く必要がある操作は、脇の領域が無い帯(`lg` 未満)で画面下端に固定し、脇に常設できる幅では通常配置へ戻す。同じ操作を 2 か所に置かない。 | `components/patterns/action-bar` の component テスト。 | [ADR 0051](adr/0051-styling-system.md) |
| 73 | 部品の中身は帯(viewport)で分岐させない。同じ部品が広い場所にも狭い場所にも置かれる分岐はコンテナクエリで書く。 | 散文。 | [ADR 0051](adr/0051-styling-system.md) |
| 74 | 画面の骨格は器の幅(container query)で分岐させない。どこに何を置くか・出すか出さないかは帯で決める。 | 散文。 | [ADR 0051](adr/0051-styling-system.md) |
| 75 | 資材はルート絶対の URL で指し、実体を配信の根へ置く。アプリが出すものは `public/`、カタログでだけ使うものは `.storybook/public/` で、後者の綴りは `.storybook/lib/sample-asset.ts` が公開する。**`/src/...` を指さない** —— dev サーバは素通しで配信するが `storybook build` の成果物には入らず、**壊れた絵がそのまま基準画像として承認される**。解決しないことが正しい参照は `scripts/lib/catalog-assets.ts` へ理由と撤去条件つきで宣言する。 | `scripts/catalog-assets.gate.test.ts`。 | [ADR 0054](adr/0054-ui-catalog-storybook.md) / [ADR 0091](adr/0091-test-verification-methods.md) |
| 76 | `searchParams` を読むスキーマは、その条件を URL へ組む側とは別の module へ置く（読む側は `read-<対象>.ts`、組む側は語彙と行き先を持つ module）。同じ module に置くと、スキーマを組み立てる module 直下の式が tree-shaking を妨げ、**語彙を参照しただけの画面まで検証ライブラリごと client の束に載る**。 | `bundle-budget` job（route ごとの増分の上限）と review。 | [ADR 0101](adr/0101-performance-budget.md) |
| 77 | 描く内容が**バックエンドの状態に依る**画面は、動的な API（`cookies()` / `searchParams` 等）に触れていなくても `export const dynamic = "force-dynamic"` を宣言する。判定に使うのは「使っている API」ではなく**描く内容の出所**である。宣言が無い画面は build 時に 1 度だけ描かれ、更新が反映されないまま型検査もテストも通り、**CI は緑のまま古い内容を配る**。build にバックエンドへの到達性を要求する副作用も付く。**裏返して、固めてよい画面は `export const dynamic = "force-static"` を宣言する** —— 宣言を裏返しでも置くことで、固まったかどうかを成果物と突き合わせられる。 | `scripts/render-mode`（`Build` job）。固まった route が `force-static` を宣言しているか、宣言した route が実際に固まっているかの双方を見る。**バックエンドの状態に依るかどうかは機械には読めない**ため、動的な API を触っていて結果的に動的になった画面の宣言漏れは、ここでは捕まらない。 | [ADR 0040](adr/0040-routing-rendering-strategy.md) |
| 78 | 捨てるのは、その mutation が変えたデータを**実際に描いている route** だけにする。`revalidatePath("/", "layout")` はアプリ全体を捨てる呼び方であって所有境界ではない。捨てる先が複数の route にまたがるなら、route を並べるのではなく `revalidateTag` を使う。 | 散文。 | [ADR 0071](adr/0071-bff-api-integration.md) |
| 79 | タグは `<資源>` と `<資源>:<識別子>` の 2 段だけを使う。資源名はバックエンド契約の集合名（`cart` / `products` / `purchases`）に揃え、識別子はその資源の URL に現れる鍵を使う。**タグを付けるのは取得側（`adapters`）1 か所**で、捨てる側は同じ綴りを書く。取得と再検証で綴りを別々に決めると、捨てたつもりのものが残る。 | 散文。 | [ADR 0071](adr/0071-bff-api-integration.md) |
| 79b | **Data Cache へ入れてよいのは、主体を名乗らずに取れるものだけ。** 入れ物は server 側で共有され、鍵は URL・method・ヘッダ・本文である。資格情報を載せる取得を入れると、鍵が主体ごとに割れて再利用はほぼ起きないのに、入れ物だけが主体の数だけ増える。**入れないものへ印を付けない** —— 印は入っているものにしか付かないので、付けた側も捨てる側も、動いていないのに動いて見える。 | adapters テストと review。 | [ADR 0071](adr/0071-bff-api-integration.md) |
| 80 | 上の 4 つは **Cache Components を無効にした現在のモデルでの使い分け**である。有効化すると既定が反転し（動的が既定になり、キャッシュしたいものに `"use cache"` を付ける）、#77 の宣言は不要になる。有効化の判断より先にこの 3 行を書き換えない。 | [ADR 0041](adr/0041-cache-components-decision.md) の判断が動いたときの棚卸し。 | [ADR 0041](adr/0041-cache-components-decision.md) |
| 81 | `process` と `node:` の組み込みモジュールへ触ってよいのは、config カーネルと起動境界、およびリポジトリ自身を操作する道具だけ（宣言は `architecture.ts` の `NODE_RUNTIME_ACCESS`）。層の依存表は import の向きしか見ておらず、**server と client のどちらで動くか**を見ていない。client の束へ載った時点で壊れる参照は、層とは別の軸で止める。 | ESLint の `no-restricted-syntax` / `no-restricted-imports`。 | [ADR 0030](adr/0030-environment-variable-management.md) |
| 82 | route segment の器（`layout` / `page` / `template` / `default`）を Client Component にしない。`"use client"` は bundle 境界なので、器に付けると配下をまとめて束へ引き込む。client が要るのは葉で、そこへ島として差す（[rendering](design/rendering.md)）。`error.tsx` / `global-error.tsx` は framework が client を要求するため対象外。 | ESLint の `no-restricted-syntax`。 | [ADR 0040](adr/0040-routing-rendering-strategy.md) |
| 83 | 他の層が握る問題を、こちらで予防的に手当てしない。書かないのは「下の層が既に握っているもの」と「起こり得ないもの」で、「下では捕まえられないもの」「UX 上こちらに在るべきもの(入力の即時フィードバック等)」は対象外。**セキュリティ上の懸念(XSS 等)は重複を理由に落とさない。** | 散文。 | [ADR 0020](adr/0020-adopted-architecture.md) |
| 84 | **PII を含むという理由で画面全体を CSR 化しない。** PII のために SSR / PPR を諦めるのは許されるが、CSR にするのは PII を必要とする最小の Client Island に限る。 | 散文とレビュー。 | [ADR 0112](adr/0112-data-classification-cache-boundary.md) |
| 85 | **public data と PII を同じキャッシュ可能な DTO へ混在させない。** 混ざった時点で全体が user-scoped になり、共有キャッシュの選択肢を失う。 | adapters テストとレビュー。 | [ADR 0112](adr/0112-data-classification-cache-boundary.md) |
| 86a | **取得の口は分類を宣言する。** `createHttpClient` には `scope: "public"` / `scope: "user-scoped"` のどちらかを渡す。**資格情報を載せうる口は、載せなかった回も含めて user-scoped** であり、`allowAnonymous` を立てても動かない。分類は口の性質であって要求ごとの結果ではない。 | 型（user-scoped の口は `cache` / `tags` を受け取らない）と `adapters/server/http/request.ts` の取得時の関門（資格情報のヘッダの持ち込みもここで落ちる）。 | [ADR 0112](adr/0112-data-classification-cache-boundary.md) |
| 86b | **サーバへ保存されるキャッシュ（`use cache` / `unstable_cache` / Data Cache）から user-scoped な取得の口を引かない。** user-scoped な値をキャッシュする唯一の手段は `use cache: private`（サーバへ保存されず、ブラウザのメモリにのみ載る）で、これは**明示的な例外能力であって一般許可ではない**。既定は uncached。 | ESLint の `project-rules/no-user-scoped-in-cached-module`（直接の import のみ。間接参照は framework の `next-request-in-use-cache` と取得時の関門が覆う）。 | [ADR 0112](adr/0112-data-classification-cache-boundary.md) |
| 86c | **資格情報は使用地点で `cookies()` から解決する。** `getBearerToken` には import した取得口を渡し、その場で組んだ関数・ローカル変数・引数で持ち回った値を渡さない。解決済みの値を掴むと `cookies()` が読まれず、cached scope の防御が**何も言わずに**外れる。cookie がまだ無い session 確立の 1 往復だけは `bearerToken` という別の綴りで渡す。 | ESLint の `project-rules/no-captured-bearer-token`。 | [ADR 0112](adr/0112-data-classification-cache-boundary.md) |
| 86 | **取得する PII を最小化する。** 一部しか使わないのに User オブジェクト全体を取得・保持・送信しない。必要な属性を特定し、取得の口で詰め替える。 | adapters テストとレビュー。 | [ADR 0112](adr/0112-data-classification-cache-boundary.md) |

## 運用

- 新しい規約は、先に ADR で判断したうえでこの表へ追加する。
- 規約を変更した実装 PR は、該当行と強制手段も同時に更新する。
- P9-1 で、全行を実在するコード・設定・生成物と突合し、散文のみの規約を棚卸しする。
