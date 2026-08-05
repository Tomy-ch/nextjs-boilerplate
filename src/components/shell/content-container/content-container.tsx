import type { ComponentProps } from "react";

import { cn } from "@/components/cn";

/**
 * ページ本文の読み幅と左右余白を揃える枠。
 *
 * @remarks
 * `main` の内側に置き、その中身が画面幅いっぱいに広がらないようにする。**幅と左右余白だけ**を
 * 持ち、縦方向の構造・段組み・背景は持たない。それらは中身を組む側が決める。
 *
 * `main` 要素そのものは app shell の責務であり、この component は `main` を描画しない。
 * shell 側が `main` に幅を持たせると二重管理になるため、shell の `main` は幅を絞らない。
 *
 * 読み幅は一つだけ用意する。広い表や図のために別の幅が要る場合は、その画面が要求した時点で
 * 決めることであり、先回りで variant を作らない。個別の調整は `className` で行う。
 *
 * Server Component として使える。hydration は不要。
 *
 * @example
 * ```tsx
 * <main>
 *   <ContentContainer>
 *     <PageHeader>…</PageHeader>
 *     <section>…</section>
 *   </ContentContainer>
 * </main>
 * ```
 *
 * @param props - native `div` 属性。
 *
 * @see Storybook `Layout/ContentContainer`
 */
export function ContentContainer({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-5xl px-4 md:px-6", className)}
      data-slot="content-container"
      {...props}
    />
  );
}
