# レンダリングの読み方

この文書は、Next.js App Router のレンダリングについて**間違えやすいところ**だけを集めたものである。何をどこで描くかの方針は [ADR 0040](../adr/0040-routing-rendering-strategy.md)（ルーティング / レンダリング戦略）が、コンポーネント内部の書き方は [ADR 0042](../adr/0042-react19-rendering-api.md)（React 19 レンダリング API）が持つ。ここはその手前で、**用語の意味を取り違えたまま設計してしまうこと**を防ぐために置く。

判断に迷ったら ADR を優先する。この文書は説明であって規約ではない。

## 用語

この 5 つを取り違えると、以降の議論が全部ずれる。

| 語 | 意味 | よくある取り違え |
| --- | --- | --- |
| **Server Component** | サーバでだけ実行され、ブラウザへコードが送られないコンポーネント。App Router の既定 | 「速いコンポーネント」ではない。実行場所の話 |
| **Client Component** | `"use client"` を持つファイルから始まるコンポーネント。ブラウザへコードが送られ、操作を受け付ける | **「サーバで描かれない」ではない**（後述） |
| **SSR** | サーバで HTML を組み立てて返すこと | Server Component 専用の仕組みではない。Client Component も対象 |
| **hydration** | 返ってきた HTML に、ブラウザ側で event handler を取り付けて操作可能にすること | HTML を作り直すことではない。既にある DOM に紐付けるだけ |
| **RSC Payload** | Server Component を描いた結果の直列表現。HTML とは別に配られ、ブラウザ側が木を突き合わせるのに使う | HTML の別名ではない |

**Client Island** は正式な用語ではなく、「ほぼサーバで描かれた画面の中に、操作のために埋め込まれた小さい Client Component」を指す通称である。このリポジトリではこの形を既定にしている。

## 1 リクエストで起きること

順序を押さえると、後の誤解がほとんど消える。

1. サーバが **Server Component** を描き、結果を **RSC Payload** にする
2. サーバが **Client Component も描いて**、Payload と合わせて **HTML** を組み立てる
3. ブラウザが HTML を表示する。**画面はここで既に見えている**
4. ブラウザが RSC Payload で木を突き合わせる
5. ブラウザが JavaScript で **Client Component だけを hydration** する。**ここで操作可能になる**

**2 が最大の分かれ目である。** Client Component もサーバで HTML になる。`"use client"` は「サーバで描くな」という意味ではない。

### 3 の時点で何が見えているか

**Server Component の結果も Client Component の結果も、両方すでに見えている。** 欠けているのは見た目ではなく反応で、ボタンは描かれているが押しても何も起きない、という状態である。

例外は 2 つある。

- **Suspense の中でまだ解決していない部分**は fallback（待機表示）が出ている。中身も同じくサーバが描くが、届く時刻が後になる
- **ブラウザにしか分からない値に依存する分岐**は、サーバ側の姿で描かれている。画面幅・ポインタの種類・`window` の有無がこれにあたる（後述）

この 2 つを除けば、**JavaScript が 1 行も動いていない時点で画面は完成している**。検索する側や、通信が細くて JavaScript の到着が遅れる利用者が見るのはこの状態である。

## 間違えやすいこと

### `"use client"` は「CSR にする指示」ではない

`"use client"` が宣言しているのは、**client bundle に入る境界**である。レンダリングの場所ではない。

古い枠組み（サーバで HTML を返す SSR か、空の HTML に JavaScript が描く CSR かの二択）で読むと、`"use client"` が「CSR 側へ倒す指示」に見える。App Router にその二択は無い。既定は「サーバで HTML を作り、操作の要る部分だけブラウザで hydration する」の一本で、`"use client"` はその後半に参加するかどうかを決めているだけである。

**唯一の本物の CSR** は、`dynamic(..., { ssr: false })` のようにサーバでの描画を明示的に止めた場合である。これは意図して選ぶものであって、`"use client"` の一般的な帰結ではない。

### Client Component の下が全部 Client になるとは限らない

伝染するのは **module graph（import の連鎖）** であって、**画面の親子関係**ではない。

- **伝染する**: `"use client"` のファイルが `import` したもの、および直接描画するコンポーネント
- **伝染しない**: `children` や props として**渡された**もの

渡されたものはサーバで描かれ、**描画済みの結果**として Client Component に置かれる。Client Component はそれを import していないので、client bundle には入らない。

したがって「Server → Client → Server」の入れ子は成立する。Client Component に `children` の口を開け、そこへサーバで描いたものを差す形がその実装である。

```tsx
// layout（Server Component）
<ClientShell>{children}</ClientShell>   // children はサーバで描かれたまま渡る
```

**確かめ方**: `curl` で初期 HTML を取り、中身が入っているかを見る。JavaScript を実行する前の状態が見えるので、SSR されたかどうかがそのまま判る。

### サーバでしか分からないこと・ブラウザでしか分からないことがある

画面幅・ポインタの種類・`window` の有無は、サーバでは決められない。そこで **サーバ側の初期値**を決めておき、hydration の後に本当の値へ入れ替える形になる。

このリポジトリの [`capabilities/use-media-query.ts`](../../src/capabilities/use-media-query.ts) はサーバで常に `false` を返す。つまり**初回の HTML は「一致していない側」の姿**であり、一致した側の姿は hydration の後に現れる。

この性質から、次の使い分けが出る。

- **本文の幅・順序が変わる出し分けには使わない**。hydration の前後で配置が動く。CSS の media query（Tailwind の `lg:` など）で行う（[ADR 0051](../adr/0051-styling-system.md) §2）
- **押せる必要のある操作の有無にも使わない**。JavaScript が届くまで押せない操作ができる
- **使ってよいのは、DOM を残したままでは成立しないもの**（focus trap など）と、**現れても位置が動かないもの**

### hydration mismatch は偶発的ではない

サーバが描いた HTML とブラウザが描いた結果が食い違うと起きる。原因は必ず**サーバとブラウザで違う値を使ったこと**にある。典型は現在時刻、乱数、`window` 依存の値である。

日時については [`docs/rules.md`](../rules.md) #53 が「server と client で異なる値を初期 render しない」を規約として持つ。

**確かめ方**: ブラウザの console を見る。mismatch が起きていれば警告が出る。出ていなければ起きていない。

### Server Component は「速い」わけではない

Server Component の利点は、**そのコードがブラウザへ送られないこと**と、**サーバ側の資源（設定・秘密・バックエンド接続）へ直接届くこと**である。実行そのものが速いわけではない。

逆に Client Component の代償は、**その分の JavaScript がブラウザへ送られること**である。SSR が壊れることではない。したがって「Client Component にすると SSR が死ぬ」を心配する必要はなく、心配すべきは**送るコードの量**である。

## このリポジトリでの現れ方

| 層 | 既定 | 備考 |
| --- | --- | --- |
| `app/` の `page.tsx` / `layout.tsx` | Server | 薄い層に留め、取得と組み立ては `features` が持つ |
| `app/**/route.ts` | サーバのみ | HTTP の口。[ADR 0025](../adr/0025-app-layer-elements.md) |
| `features/` | 原則 Server。操作の要る部分だけ Client Island | 島は小さく切り、器は Server のまま保つ |
| `components/` | 部品による | 操作を持つ部品は Client |
| `capabilities/` | Client | ブラウザの能力を購読する hook。[ADR 0022](../adr/0022-capabilities-kernel.md) |
| `stores/` | Client | 横断する client 状態。[ADR 0023](../adr/0023-stores-kernel.md) |
| `adapters/server` | サーバのみ | `server-only` を宣言している |
| `adapters/client` | Client | 同一オリジンへの薄い取得。[ADR 0024](../adr/0024-adapters-server-client-split.md) |

**器を Client にせず、島を差す。** 横断的な操作を足したくなったとき、外枠そのものを `"use client"` にすると、外枠が import しているものが全部ブラウザへ行く。外枠に props の口を開け、そこへ小さい Client Component を渡す形にすれば、外枠は Server のまま保てる。[`components/shell/app-shell`](../../src/components/shell/app-shell/) が `headerActions` / `sidebar` の口を持っているのはこのためである。

## 他に踏みやすい語

知らない語より、**知っている語が別の意味で使われている**ほうが危ない。以下は後者を優先して並べたものである。網羅ではなく、この構成を読むのに要るものに絞ってある。全語の定義は Next.js 同梱の用語集（`node_modules/next/dist/docs/01-app/04-glossary.md`）にある。

### Server / Client

| 語 | 意味 | 取り違え |
| --- | --- | --- |
| `"use server"` | **`"use client"` の反対ではない。** client から呼べるサーバ関数を宣言する印 | 「このファイルはサーバで動く」の意味だと読む。既定でサーバなので、そういう宣言は要らない |
| Server Function | `"use server"` を付けた非同期関数。client から呼べる | — |
| Server Action | Server Function のうち、form の `action` や Client Component の props として渡されたもの | Server Function との差は**呼ばれ方**だけ |
| Client Bundles | ブラウザへ送られる JavaScript の塊 | Client Component の代償はここであって、SSR の可否ではない |
| `server-only` / `client-only` | 反対側へ import したらビルドを落とす印 | 実行を止めるものではなく、依存の混線を build 時に気付かせるもの |

### ルーティング

| 語 | 意味 | 取り違え |
| --- | --- | --- |
| Route Segment | URL の 1 階層に対応するフォルダ | — |
| Route Group `(name)` | **URL に現れない**フォルダ。器を分けるためだけに使う | `app/(marketing)/about/page.tsx` が `/marketing/about` になると読む。実際は `/about` |
| Route Handler | `route.ts`。HTTP の口 | Pages Router の「API Routes」とは別物。同じ階層に `page.tsx` と共存できない |
| Proxy | `proxy.ts`。route に届く前に通る層 | **Next 16 で `middleware.ts` から改称された。** 「middleware」で調べると旧名の情報に当たる |

### 描画の決まり方

| 語 | 意味 | 取り違え |
| --- | --- | --- |
| Static rendering | build 時に描いておく | 明示的に選ぶものではない |
| Dynamic rendering | リクエストごとに描く | 同上。**使った API で自動的に決まる** |
| Request-time API | `cookies()` / `headers()` / `searchParams` / `draftMode()`。触ると dynamic になる | 「読むだけ」のつもりが、そのページの描画方式を変えている |
| Prerendering / Static Shell | 事前に描いてある部分。ブラウザへ即座に返る | — |
| Streaming / Suspense boundary | 描けたところから順に送る仕組みと、その区切り | — |
| Loading UI | Suspense が解決するまで出る表示。`loading.tsx` がこれにあたる | `loading.tsx` は「読み込み中の画面」ではなく、**そのセグメントに Suspense を敷く宣言**である |
| Cache Components / Partial Prerendering (PPR) | 静的な殻と動的な穴を 1 ページに混ぜる機構 | 採否は [ADR 0041](../adr/0041-cache-components-decision.md) が持つ |

### キャッシュ（名前が似ていて寿命が違う）

| 語 | 生存範囲 | 取り違え |
| --- | --- | --- |
| Memoization | **1 リクエストの描画中だけ**。同じ `fetch` GET は自動で 1 回にまとまる。`fetch` 以外は React の `cache()` を使う | 「キャッシュした」と言うと次のリクエストにも残ると読まれる。残らない |
| Data Cache / Revalidation | **リクエストを跨いで残る**。`tags` を無効化して捨てる | 上と同じ「キャッシュ」の語で呼ばれる |
| Client Cache | **ブラウザが持つ** RSC Payload の控え。戻る / 進むで再利用される | サーバ側のキャッシュと混同する。再読み込みで消える |

**Route Handler は React の component tree の外にある。** `fetch` の自動 memoization が効くのは component tree の中なので、`route.ts` から呼ぶ経路では同じ前提を置かない。

### 遷移

| 語 | 意味 | 取り違え |
| --- | --- | --- |
| Client-side navigation | ページ全体を作り直さず、変わった部分だけ差し替える遷移 | `<a>` による通常の遷移とは別物。`Link` はこちら |
| Prefetching | 遷移先を先読みしておくこと | — |
| `router.refresh()` | サーバから描き直すが、**client state は保つ** | ブラウザの再読み込みとは別物。あちらは client state を捨てる |
| Version skew | 利用者が開いたままの間に新しい版がデプロイされ、新旧が食い違うこと | 「たまに壊れる」で片付けられがちだが、原因の名前が付いている |

### 境界とエラー

| 語 | 意味 | 取り違え |
| --- | --- | --- |
| Error Boundary | 配下で投げられた例外を捕まえて代わりの表示を出す仕組み。`error.tsx` がこれにあたる | **Client Component でなければならない。** また production では Server Component から投げられた例外の本文が伏せられ、境界には汎用の文言と `digest` しか届かない（[ADR 0080](../adr/0080-error-handling.md)） |
| `"use cache"` | 関数やコンポーネントの結果をキャッシュ対象だと宣言する指示子 | `"use client"` / `"use server"` と並ぶ 3 つめだが、**対称ではない**。あちらは実行場所と呼び出し可否、これはキャッシュ |

### ルーティングの残り

| 語 | 意味 | 取り違え |
| --- | --- | --- |
| Dynamic route segment | `[id]`。値が入る階層 | — |
| Catch-all segment | `[...slug]` / `[[...slug]]`。以降の階層をまとめて受ける | — |
| Private Folder `_name` | **URL に現れない**フォルダ。ルーティングの対象から外す | **URL に出ないフォルダは 2 種類ある。** `(name)` は器を分けるため、`_name` はルーティングから外すため。目的が違う |
| Parallel Routes `@slot` | 1 つの階層に複数の枠を並べて同時に描く | 存在を知らないと、同種のことを自前の state で組んでしまう |
| Intercepting Routes | 遷移元によって同じ URL の描き方を変える。一覧から開いたらモーダル、直接開いたら全画面、といった作り | 同上 |

### ビルドと配信

| 語 | 意味 | 取り違え |
| --- | --- | --- |
| Code Splitting / Tree Shaking | 必要な塊だけに分けて送る / 使っていない export を落とす | 「Client Component にすると全部送られる」ではない。ただし**削れるのは使っていないものだけ**で、使っていれば送られる |
| ISR（Incremental Static Regeneration） | 静的に描いたものを期限付きで作り直す | 名前が難しいだけで、やっていることは「静的だが古くなったら描き直す」 |
| Static Export | ページを全部静的ファイルとして出す構成 | 採るとサーバが無くなるため、Request-time API も Route Handler も使えなくなる |

### その他

| 語 | 意味 | 取り違え |
| --- | --- | --- |
| `params` / `searchParams` は Promise | Next 15 以降、`await` してから読む | 同期で読めた頃のコード例が大量に残っている |
| Edge runtime / Node.js runtime | 実行環境が 2 つある | [`instrumentation.ts`](../../src/instrumentation.ts) が `NEXT_RUNTIME` で分岐しているのはこのため |
| Turbopack | 既定のバンドラ | webpack 前提の設定情報に当たることがある |

### ここでは扱わない語

次は Next.js 固有の語ではあるが、**判断を持っている ADR が別にある**。ここに定義を書くと二重管理になるため、誘導だけ置く。

| 語 | 判断の在り処 |
| --- | --- |
| Metadata | [ADR 0044](../adr/0044-seo-metadata-strategy.md) |
| Font Optimization / Image Optimization | [ADR 0045](../adr/0045-fonts-and-images.md) |
| Redirect / Rewrite | [ADR 0043](../adr/0043-middleware-policy.md) |
| Not Found | [ADR 0080](../adr/0080-error-handling.md) |
| Environment Variables | [ADR 0030](../adr/0030-environment-variable-management.md) |
| Import Aliases | [ADR 0027](../adr/0027-directory-structure.md) |

## 自分で確かめる

思い込みで判断せず、次の 2 つで足りる。

```bash
# 初期 HTML に中身が入っているか（JavaScript 実行前の状態が見える）
curl -s http://localhost:3000/<path> | grep -o '<探したい文字列>'
```

ブラウザの console に hydration の警告が出ていないかを見る。出ていなければ、サーバとブラウザの出力は一致している。

**開発サーバの状態を過信しない。** 起動時に一度だけ走る初期化（モックの起動など）は、ファイルを保存して再コンパイルした後に失われていることがある。挙動が変わったように見えたら、開発サーバを立て直してから判断する。
