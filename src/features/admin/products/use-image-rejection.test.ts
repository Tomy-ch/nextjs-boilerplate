// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FILE_UPLOAD_REJECTION_REASON } from "@/components/app-starter/file-upload/file-upload.definition";

import { useImageRejection } from "./use-image-rejection";

const MAX = 4 * 1024 * 1024;

describe("useImageRejection", () => {
  // ----- 正常系 -----
  it("まだ弾いていなければ何も伝えない", () => {
    const { result } = renderHook(() => useImageRejection(MAX));

    expect(result.current.rejection).toBeUndefined();
  });

  // ----- 異常系 -----
  it("弾かれたファイルの理由を文言として持つ", () => {
    const { result } = renderHook(() => useImageRejection(MAX));

    act(() =>
      result.current.onReject([
        {
          file: new File(["x"], "cover.png", { type: "image/png" }),
          reason: FILE_UPLOAD_REJECTION_REASON.SIZE,
        },
      ]),
    );

    expect(result.current.rejection).toBe("cover.png は 4 MB を超えています。");
  });

  it("弾いたものが無ければ文言を下ろす", () => {
    const { result } = renderHook(() => useImageRejection(MAX));

    act(() =>
      result.current.onReject([
        {
          file: new File(["x"], "cover.png", { type: "image/png" }),
          reason: FILE_UPLOAD_REJECTION_REASON.SIZE,
        },
      ]),
    );
    act(() => result.current.onReject([]));

    expect(result.current.rejection).toBeUndefined();
  });
});
