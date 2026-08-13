import { describe, expect, it } from "vitest";
import { appendCursorPage, type CursorPage } from "./pagination";

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
