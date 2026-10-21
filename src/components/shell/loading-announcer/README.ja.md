> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# LoadingAnnouncer

## 目的

画面のどこかが読み込み中であること —— と、読み込み終えたこと —— を、支援技術へ 1 か所から 1 件だけ伝える。読み込み中の UI
そのものは accessibility tree の外に置いたままにする。

## 役割と公開コンポーネント

| コンポーネント | 役割 |
| --- | --- |
| `LoadingAnnouncerProvider` | ルートに 1 つだけ mount する client Provider。空の `role="status"` 領域（視覚的には隠す）を常に描き、読み込み中 / 読み込み終えたの文言をそこへ入れる。 |
| `LoadingAnnouncement` | 何も描かない。mount されている間、読み込み中のもの 1 つとして数えられる。`Suspense` の fallback の中に置く。 |

`loading-announcer.definition.ts` が `LOADING_ANNOUNCEMENT`（2 つの文言）と `ANNOUNCE_LOADING_AFTER_MS`（告げるまでの待ち時間）を持つ。

## 使いどころ

- `Suspense` 境界が fallback に使う skeleton すべての中に、`LoadingAnnouncement` を 1 つ置く。skeleton は `aria-hidden` のまま
  にする。leaf は何も描かないので、その内側に置いてよい。
- `LoadingAnnouncerProvider` は root layout に 1 回だけ、ほかの横断的な Provider と並べて mount する。

```tsx
import { LoadingAnnouncement } from "@/components/shell/loading-announcer/loading-announcer";
import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";

export function ExampleSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <LoadingAnnouncement />
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
```

## 設計

- **領域は、何かを入れる前から在る。** live region が確実に読まれるのは、中身が変わるときに既に DOM に在る場合だけである
  （WCAG 2.2 の技法 ARIA22、`role="status"`）。文言と一緒に描かれる領域 —— 各 skeleton の中の `role="status"` —— は読まれ方が
  揃わず、skeleton が同時にいくつもあれば何度も読まれる。そのため領域は 1 つだけ、どの route group のシェルよりも外側のルートに
  置く。route group ごとのシェルに置くと、group をまたぐ遷移のたびに領域が作り直される。
- **短い待ちは告げない。** `ANNOUNCE_LOADING_AFTER_MS` 以内に終わる読み込みは何も言わない。中身の後に「読み込んでいます」が
  読まれることを避けるためである。
- **終わりは、始まりを告げたときだけ告げる。** live region から文言を消しても読まれない（`aria-relevant` の既定は
  `additions text`）ので、領域を空にするだけでは読み込みが終わったことが利用者に届かない。読み込み終えたの文言は、次の
  読み込みが置き換えるまで残す。
- **`aria-busy` は使わない。** これは残り続ける要素が変更中であることを宣言する属性で、`Suspense` の fallback は丸ごと差し替わる
  ため、支援技術が待つ相手が残らない。
- **hydration より前に終わった読み込みは告げない。** leaf はその effect が走って初めて数えられる。ページの到着そのものは文書
  として読まれる。

## 責務の境界

何を読み込んでいるか、読み込み中がどう見えるかは決めない —— 見た目は skeleton が持ち、いつ出すかは `Suspense` 境界が持つ。
操作の結果（[`toaster`](../toaster/README.ja.md)）や一覧の件数（一覧の件数領域）は告げない。

## Storybook とテスト

story は空の領域と、leaf を mount した状態を見せる。領域自体は見えないので、確かめるのは accessibility tree の `status` である。
テストは、読み込みの前から領域が空で在ること、しきい値より短い待ちでは何も言わないこと、leaf がいくつあっても文言が 1 つで
あること、始まりを告げた後だけ終わりを告げること、開発時に effect が二重に回っても 1 つと数えること、axe を確かめる。
