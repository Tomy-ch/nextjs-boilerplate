import type { ComponentProps } from "react";

import { cn } from "@/components/cn";

/** {@link AspectRatio} の props。 */
export type AspectRatioProps = ComponentProps<"div"> & {
  /** 幅を 1 としたときの縦横比。既定は 1（正方形）。 */
  ratio?: number;
};

/**
 * 子要素を指定した縦横比の枠へ収める、SSR first の表示 primitive。
 *
 * @remarks
 * CSS の `aspect-ratio` を直接使うため client runtime を必要としない。`overflow-hidden` を伴う
 * のは、`aspect-ratio` が内容の高さに負けて縦へ伸びるためで、はみ出しを切って比率を優先する。
 *
 * 比率が `square` / `standard` / `wide` のいずれかで済み、`MediaImage` と枠を揃えたい場合は
 * `MEDIA_IMAGE_ASPECT_RATIO_CLASS` を直接 class として当てる方が軽い。この部品を使うのは、
 * 任意の比率を数値で指定する場合である。
 *
 * 上流の shadcn/ui は Radix の `AspectRatio` を copy-in するが、採っていない。実装が
 * `padding-bottom` による旧来の比率固定で、**高さが決まった親の中で拘束を無視して溢れる**うえ、
 * CSS で完結する表示に `"use client"` を要求するためである。公開 API の `ratio` は揃えてある。
 *
 * @param props - native `div` 属性。`className` で余白や背景を追加できる。
 * @param props.ratio - 幅を 1 としたときの縦横比。
 *
 * @see Storybook `Container/AspectRatio`
 */
export function AspectRatio({ className, ratio = 1, style, ...props }: AspectRatioProps) {
  return (
    <div
      className={cn("overflow-hidden", className)}
      data-slot="aspect-ratio"
      style={{ aspectRatio: ratio, ...style }}
      {...props}
    />
  );
}
