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
3. ブラウザが HTML を表示する。**この時点ではまだ操作できない**
4. ブラウザが RSC Payload で木を突き合わせる
5. ブラウザが JavaScript で **Client Component だけを hydration** する。ここで操作可能になる

**2 が最大の分かれ目である。** Client Component もサーバで HTML になる。`"use client"` は「サーバで描くな」という意味ではない。

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

## 自分で確かめる

思い込みで判断せず、次の 2 つで足りる。

```bash
# 初期 HTML に中身が入っているか（JavaScript 実行前の状態が見える）
curl -s http://localhost:3000/<path> | grep -o '<探したい文字列>'
```

ブラウザの console に hydration の警告が出ていないかを見る。出ていなければ、サーバとブラウザの出力は一致している。

**開発サーバの状態を過信しない。** 起動時に一度だけ走る初期化（モックの起動など）は、ファイルを保存して再コンパイルした後に失われていることがある。挙動が変わったように見えたら、開発サーバを立て直してから判断する。
