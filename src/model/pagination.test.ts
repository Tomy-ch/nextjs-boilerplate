import { describe, expect, it } from "vitest";
import { appendCursorPage, type CursorPage, toPageCount, toPageNumber } from "./pagination";

const loaded: CursorPage<string> = { items: ["a", "b"], nextCursor: "cursor-1" };

describe("appendCursorPage", () => {
  // ----- 正常系 -----
  it("読み込み済みの要素の後ろに次ページの要素を並べる", () => {
    const page = appendCursorPage(loaded, { items: ["c", "d"], nextCursor: "cursor-2" });

    expect(page.items).toEqual(["a", "b", "c", "d"]);
  });

  it("次のカーソルを後から来たページのものにする", () => {
    const page = appendCursorPage(loaded, { items: ["c"], nextCursor: "cursor-2" });

    expect(page.nextCursor).toBe("cursor-2");
  });

  it("終端のページを継ぎ足すと次のカーソルが無くなる", () => {
    const page = appendCursorPage(loaded, { items: ["c"], nextCursor: null });

    expect(page.nextCursor).toBeNull();
  });

  it("空のページを継ぎ足しても読み込み済みの要素を保つ", () => {
    const page = appendCursorPage(loaded, { items: [], nextCursor: null });

    expect(page.items).toEqual(["a", "b"]);
  });

  it("読み込み済みが空でも次ページの要素を並べる", () => {
    const page = appendCursorPage(
      { items: [], nextCursor: "cursor-1" },
      {
        items: ["c"],
        nextCursor: null,
      },
    );

    expect(page.items).toEqual(["c"]);
  });

  it("重複する要素を取り除かない", () => {
    const page = appendCursorPage(loaded, { items: ["b", "c"], nextCursor: null });

    expect(page.items).toEqual(["a", "b", "b", "c"]);
  });

  it("継ぎ足しの元にしたページを書き換えない", () => {
    appendCursorPage(loaded, { items: ["c"], nextCursor: "cursor-2" });

    expect(loaded).toEqual({ items: ["a", "b"], nextCursor: "cursor-1" });
  });
});

describe("toPageNumber", () => {
  // ----- 正常系 -----
  it("先頭の位置を 1 ページ目として数える", () => {
    expect(toPageNumber(0, 20)).toBe(1);
  });

  it("1 ページぶん進んだ位置を 2 ページ目として数える", () => {
    expect(toPageNumber(20, 20)).toBe(2);
  });

  it("ページの途中を指す位置は、そのページの番号へ丸める", () => {
    expect(toPageNumber(35, 20)).toBe(2);
  });

  // ----- 異常系 -----
  it("1 ページの件数が 0 なら、割らずに先頭を返す", () => {
    expect(toPageNumber(40, 0)).toBe(1);
  });

  it("1 ページの件数が負でも、割らずに先頭を返す", () => {
    expect(toPageNumber(40, -1)).toBe(1);
  });
});

describe("toPageCount", () => {
  // ----- 正常系 -----
  it("割り切れる件数を、そのままページ数にする", () => {
    expect(toPageCount(40, 20)).toBe(2);
  });

  it("端数は 1 ページとして切り上げる", () => {
    expect(toPageCount(41, 20)).toBe(3);
  });

  it("1 ページに満たない件数も 1 ページとして数える", () => {
    expect(toPageCount(1, 20)).toBe(1);
  });

  it("1 件も無くても、空の 1 ページ目として数える", () => {
    expect(toPageCount(0, 20)).toBe(1);
  });

  // ----- 異常系 -----
  it("1 ページの件数が 0 なら、割らずに 1 を返す", () => {
    expect(toPageCount(40, 0)).toBe(1);
  });

  it("1 ページの件数が負でも、割らずに 1 を返す", () => {
    expect(toPageCount(40, -1)).toBe(1);
  });
});
