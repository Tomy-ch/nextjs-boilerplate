import { describe, expect, it } from "vitest";

import { FILE_UPLOAD_REJECTION_REASON } from "@/components/app-starter/file-upload/file-upload.definition";

import { formatMegabytes, toRejectionMessage } from "./image-rejection";

const MAX = 4 * 1024 * 1024;

function fileOf(name: string) {
  return new File(["x"], name, { type: "image/png" });
}

describe("formatMegabytes", () => {
  // ----- 正常系 -----
  it("バイト数を MB へ丸める", () => {
    expect(formatMegabytes(MAX)).toBe("4 MB");
  });

  it("端数は切り捨てる。上限を超える値を「まだ入る」と読ませないため", () => {
    expect(formatMegabytes(MAX + 1024)).toBe("4 MB");
  });
});

describe("toRejectionMessage", () => {
  // ----- 正常系 -----
  it("大きすぎる場合は上限を添えて伝える", () => {
    const message = toRejectionMessage(
      [{ file: fileOf("cover.png"), reason: FILE_UPLOAD_REJECTION_REASON.SIZE }],
      MAX,
    );

    expect(message).toBe("cover.png は 4 MB を超えています。");
  });

  it("形式が違う場合は受け付ける形式を伝える", () => {
    const message = toRejectionMessage(
      [{ file: fileOf("notes.txt"), reason: FILE_UPLOAD_REJECTION_REASON.TYPE }],
      MAX,
    );

    expect(message).toBe("notes.txt は PNG / JPEG / WebP のいずれでもありません。");
  });

  it("複数弾かれても先頭の 1 件だけを伝える", () => {
    const message = toRejectionMessage(
      [
        { file: fileOf("first.png"), reason: FILE_UPLOAD_REJECTION_REASON.SIZE },
        { file: fileOf("second.png"), reason: FILE_UPLOAD_REJECTION_REASON.TYPE },
      ],
      MAX,
    );

    expect(message).toContain("first.png");
    expect(message).not.toContain("second.png");
  });

  // ----- 異常系 -----
  it("弾いたものが無ければ何も伝えない", () => {
    expect(toRejectionMessage([], MAX)).toBeUndefined();
  });
});
