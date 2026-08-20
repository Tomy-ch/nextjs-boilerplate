"use client";

import { useCallback, useState } from "react";

import { ATTACHMENT_STATE } from "@/components/app-starter/attachment/attachment.definition";
import type { UploadPreviewItem } from "@/components/app-starter/upload-preview/upload-preview.definition";
import { idleActionState } from "@/model/action-state";
import type { UploadProductImageAction } from "./form-state";
import { PRODUCT_FORM_NAMES } from "./parse-product-form";

const UPLOAD_FAILED_MESSAGE = "送信できませんでした。";

/** 保存済みのキーから、利用者へ見せる名前を取り出す。 */
function nameOf(imagePath: string): string {
  return imagePath.slice(imagePath.lastIndexOf("/") + 1);
}

/**
 * 読み込んだ時点で保存されている画像 1 枚。
 *
 * @remarks
 * 表示 URL まで解決した状態で受け取ります。組み立てに要る配信元は起動時の設定で、画面の層は
 * それを読めません（`architecture.ts`）。
 */
export type ProductSavedImage = {
  /** 送信に載せるオブジェクトキー。 */
  readonly imagePath: string;
  /** 縮小表示に使う URL。 */
  readonly url: string;
};

/**
 * 送信に載せる 1 枚。
 *
 * @remarks
 * 送り終わるまで `imagePath` を持ちません。持っていない枚は送信に載らず、送信の側は「載っている
 * ものはすべて保存済み」と見なせます。
 */
export type ProductImageEntry = {
  readonly id: string;
  readonly name: string;
  /** 選び直したファイル。保存済みのものを読み込んだ場合は持たない。 */
  readonly file?: File;
  readonly imagePath?: string;
  /** 保存済みの枚の縮小表示。選び直したファイルを持つ枚は持たない。 */
  readonly url?: string;
  readonly failure?: string;
};

/** 画面が扱う画像の一覧と、その動かし方。 */
export type ProductImages = {
  /** 表示用の一覧。並び順がそのまま表示順になる。 */
  readonly items: readonly UploadPreviewItem[];
  /** 送信に載せるオブジェクトキー。並び順を保つ。 */
  readonly imagePaths: readonly string[];
  /** まだ送り終わっていない枚があるか。 */
  readonly uploading: boolean;
  /** 読み込んだ時点から並びか顔ぶれが変わっているか。 */
  readonly dirty: boolean;
  readonly add: (files: readonly File[]) => void;
  readonly remove: (id: string) => void;
  readonly retry: (id: string) => void;
  readonly moveUp: (id: string) => void;
  readonly moveDown: (id: string) => void;
};

/** 隣どうしを入れ替える。端では動かさない。 */
function swap(
  entries: readonly ProductImageEntry[],
  id: string,
  offset: 1 | -1,
): readonly ProductImageEntry[] {
  const index = entries.findIndex((entry) => entry.id === id);
  const target = index + offset;

  if (index < 0 || target < 0 || target >= entries.length) return entries;

  const next = [...entries];
  const moved = next[index];
  const displaced = next[target];

  if (moved === undefined || displaced === undefined) return entries;

  next[index] = displaced;
  next[target] = moved;

  return next;
}

/**
 * 選んだ画像を送り、送信に載せる並びとして持つ。
 *
 * @remarks
 * **選んだ時点で送ります。** 商品そのものの送信は保存済みのキーだけを載せるので、大きな本文が
 * 商品の送信に混ざりません。1 枚が失敗しても、他の枚と入力済みの項目は残ります。
 *
 * 表示順は配列の並びそのものです。番号を別に持つと、動かしたときに並びと番号のどちらが正かが
 * 決まりません。
 *
 * **保存済みの画像も同じ一覧に載せます。**契約は画像を集合ごと置き換えるため、載せずに送ると
 * 既にある画像が消えます。保存済みの枚は選び直したファイルを持たないので、送り直しません。
 *
 * @param upload - 画像を送る送信先
 * @param saved - 読み込んだ時点で保存されている画像。作る画面では空
 */
export function useProductImages(
  upload: UploadProductImageAction,
  saved: readonly ProductSavedImage[] = [],
): ProductImages {
  const [entries, setEntries] = useState<readonly ProductImageEntry[]>(() =>
    saved.map(({ imagePath, url }) => ({
      id: imagePath,
      imagePath,
      name: nameOf(imagePath),
      url,
    })),
  );

  const send = useCallback(
    async (entry: ProductImageEntry) => {
      if (entry.file === undefined) return;

      const formData = new FormData();
      formData.append(PRODUCT_FORM_NAMES.images, entry.file);

      const result = await upload(idleActionState(), formData);

      setEntries((current) =>
        current.map((item) =>
          item.id === entry.id
            ? result.status === "success"
              ? { ...item, imagePath: result.value, failure: undefined }
              : {
                  ...item,
                  failure:
                    result.status === "error"
                      ? (result.formError ?? UPLOAD_FAILED_MESSAGE)
                      : UPLOAD_FAILED_MESSAGE,
                }
            : item,
        ),
      );
    },
    [upload],
  );

  const add = useCallback(
    (files: readonly File[]) => {
      for (const file of files) {
        // 同じ名前のファイルを選び直しても別の行として扱うため、名前ではなく一意な値で識別する。
        const entry: ProductImageEntry = { file, id: crypto.randomUUID(), name: file.name };

        setEntries((current) => [...current, entry]);
        void send(entry);
      }
    },
    [send],
  );

  const remove = useCallback((id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const retry = useCallback(
    (id: string) => {
      setEntries((current) => {
        const entry = current.find((item) => item.id === id);

        if (entry !== undefined) void send(entry);

        return current.map((item) => (item.id === id ? { ...item, failure: undefined } : item));
      });
    },
    [send],
  );

  const moveUp = useCallback((id: string) => {
    setEntries((current) => swap(current, id, -1));
  }, []);

  const moveDown = useCallback((id: string) => {
    setEntries((current) => swap(current, id, 1));
  }, []);

  return {
    items: entries.map((entry) => ({
      description: entry.failure ?? (entry.imagePath === undefined ? "送信中" : undefined),
      id: entry.id,
      name: entry.name,
      preview: entry.file ?? entry.url,
      state:
        entry.failure !== undefined
          ? ATTACHMENT_STATE.ERROR
          : entry.imagePath === undefined
            ? ATTACHMENT_STATE.UPLOADING
            : ATTACHMENT_STATE.DONE,
    })),
    imagePaths: entries
      .map((entry) => entry.imagePath)
      .filter((imagePath): imagePath is string => imagePath !== undefined),
    uploading: entries.some(
      (entry) => entry.imagePath === undefined && entry.failure === undefined,
    ),
    dirty:
      entries.length !== saved.length ||
      entries.some((entry, index) => entry.imagePath !== saved[index]?.imagePath),
    add,
    remove,
    retry,
    moveUp,
    moveDown,
  };
}
