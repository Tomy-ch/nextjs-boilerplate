"use client";

import { useCallback, useState } from "react";

import type { FileUploadRejection } from "@/components/app-starter/file-upload/file-upload.definition";

import { toRejectionMessage } from "./image-rejection";

/** 弾かれたファイルの文言と、その受け口。 */
export type ImageRejection = {
  /** 直前に弾いた理由の文言。まだ弾いていなければ undefined。 */
  readonly rejection: string | undefined;
  /** 弾かれたファイルを受け取る。 */
  readonly onReject: (rejections: FileUploadRejection[]) => void;
};

/**
 * 送る前に弾かれたファイルの文言を持つ。
 *
 * @remarks
 * 弾く判定そのものは `FileUpload` が持ち、文言は持ちません。何をどう伝えるかは画面の側の判断で、
 * ここがその置き場所です。
 */
export function useImageRejection(maxUploadBytes: number): ImageRejection {
  const [rejection, setRejection] = useState<string>();

  const onReject = useCallback(
    (rejections: FileUploadRejection[]) => {
      setRejection(toRejectionMessage(rejections, maxUploadBytes));
    },
    [maxUploadBytes],
  );

  return { rejection, onReject };
}
