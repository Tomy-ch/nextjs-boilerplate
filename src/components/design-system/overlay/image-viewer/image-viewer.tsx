"use client";

import Image, { type ImageProps } from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/components/cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../dialog/dialog";

/** {@link ImageViewer} の props。 */
export type ImageViewerProps = {
  /** 大きく表示する画像。 */
  src: ImageProps["src"];
  /**
   * 画像の説明。
   *
   * 拡大版の代替テキストと dialog のアクセシブルな名前になる。縮小版の代替テキストは
   * `children` 側が持つ。
   */
  alt: string;
  /** trigger として描く縮小版。枠と比率は呼び出し元が決める。 */
  children: ReactNode;
  /** trigger に追加する class 名。 */
  className?: string;
};

/**
 * 画像を押すと大きく開く。
 *
 * @remarks
 * 縮小版を押せるようにするだけの部品です。並べ方・枠・比率は持たず、trigger の中身は呼び出し元が
 * 渡します。carousel に載せるのか単独で置くのかで枠が変わるためです。
 *
 * **trigger は `button` です。** 画像に click を付ける形は keyboard から辿れず、押せることも
 * 伝わりません（[0100](../../../../../docs/adr/0100-accessibility-target.md)）。
 *
 * 拡大版は viewport に対する箱へ `object-contain` で収めます。画像の実寸を知らずに原寸で描くと、
 * 縦長の画像が画面からはみ出して全体を見られません。切り抜かないのは、拡大が「全部を見る」ための
 * 操作だからです。
 *
 * 送り操作を持ちません。ここが持つのは 1 枚を大きく見ることだけで、次の画像へ移る導線は並べている
 * 側が既に持っています。dialog の中へ同じ導線を作ると、閉じたときにどちらの位置が残るのかを
 * 決めることになります。
 *
 * 紙には出しません。押せない操作であり、拡大版は開いていなければ DOM にも居ません。
 *
 * @see Storybook `Overlay/ImageViewer`
 */
export function ImageViewer({ src, alt, children, className }: ImageViewerProps) {
  return (
    <Dialog>
      <DialogTrigger
        aria-label={`${alt}を拡大する`}
        className={cn(
          "print-hidden block w-full cursor-zoom-in rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
          className,
        )}
      >
        {children}
      </DialogTrigger>
      {/* 既定の読み幅 (sm:max-w-lg) は文章のための値なので、変種ごと外して画像の幅を採る。 */}
      <DialogContent className="w-[min(92vw,72rem)] max-w-none p-2 sm:max-w-none">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <DialogDescription className="sr-only">
          画像を拡大して表示しています。閉じるには Escape を押すか、右上の閉じるを選びます。
        </DialogDescription>
        <div className="relative h-[min(78vh,72rem)] w-full">
          <Image alt={alt} className="object-contain" fill sizes="92vw" src={src} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
