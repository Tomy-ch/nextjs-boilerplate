"use client";

import * as DirectionPrimitive from "@radix-ui/react-direction";
import type { ComponentProps } from "react";

import { DIRECTION, type DirectionValue } from "./direction.definition";

/** {@link DirectionProvider} の props。 */
export type DirectionProviderProps = Omit<
  ComponentProps<typeof DirectionPrimitive.DirectionProvider>,
  "dir"
> & {
  /** 配下の component が読む文字送りの向き。 */
  dir?: DirectionValue;
  /** `dir` の別名。指定された場合はこちらが優先される。 */
  direction?: DirectionValue;
};

/**
 * 配下の component へ文字送りの向きを伝える Provider。
 *
 * @remarks
 * 向きに応じて開く方向や矢印キーの意味を変える component（`SelectClient`、`DropdownMenu`、
 * `SliderClient` など）が、この Provider から向きを読む。Provider が無い場合、それらは `ltr` として
 * 振る舞う。
 *
 * このリポジトリは既定を `ltr` に固定し、**利用者が向きを切り替える機能は持たない**。RTL の
 * locale を提供する決定がされていないためで、`rtl` は Provider を差し替えた場合に配下がどう
 * 変わるかを示すための値である。向きを画面から切り替える UI が要るなら、locale の決定が先になる。
 *
 * React context を配るため hydration が必要で、Server Component からは直接 render できない。
 * 内容自体に client runtime が要らない場合は、Server Component で組み立てた要素を `children` と
 * して渡す。
 *
 * `dir` は DOM 属性ではないため、文字の折り返しや `text-align` のような CSS の挙動は変わらない。
 * それらを変える必要がある場合は、呼び出し元が `html` 要素の `dir` 属性を併せて設定する。
 *
 * @param props - Radix `Direction.DirectionProvider` の props。`dir` と別名の `direction` は
 *   いずれも省略でき、省略時は `ltr` になる。
 *
 * @see Storybook `Container/Direction`
 */
export function DirectionProvider({ dir, direction, children, ...props }: DirectionProviderProps) {
  return (
    <DirectionPrimitive.DirectionProvider dir={direction ?? dir ?? DIRECTION.LTR} {...props}>
      {children}
    </DirectionPrimitive.DirectionProvider>
  );
}

/**
 * 最も近い {@link DirectionProvider} が配る向きを読む。
 *
 * @remarks
 * Provider が無い場合は `ltr` を返す。向きによって配置や操作を変える component を自作するときに
 * 使い、表示文言の出し分けには使わない。
 *
 * @returns `ltr` または `rtl`。
 */
export const useDirection = DirectionPrimitive.useDirection;
