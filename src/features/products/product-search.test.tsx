// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { push, searchParams } = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: { value: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams.value,
}));

import { ProductSearch } from "./product-search";

function formOf(field: HTMLElement): HTMLFormElement {
  const form = field.closest("form");

  if (form === null) {
    throw new Error("form が見つかりません");
  }

  return form;
}

function search(keyword: string): void {
  const field = screen.getByLabelText("キーワード");

  fireEvent.change(field, { target: { value: keyword } });
  fireEvent.submit(formOf(field));
}

function setUp(current: Record<string, string>, defaultKeyword?: string): void {
  push.mockClear();
  searchParams.value = new URLSearchParams(current);
  render(<ProductSearch defaultKeyword={defaultKeyword} />);
}

describe("ProductSearch", () => {
  // ----- 正常系 -----
  it("入力したキーワードを URL へ載せる", () => {
    setUp({});

    search("イヤホン");

    expect(push).toHaveBeenCalledWith("/products?keyword=%E3%82%A4%E3%83%A4%E3%83%9B%E3%83%B3");
  });

  it("いまの条件を保ったまま書き換える", () => {
    setUp({ sort: "-price" });

    search("鞄");

    expect(push.mock.calls[0]?.[0]).toContain("sort=-price");
  });

  it("現在のキーワードを初期値にする", () => {
    setUp({}, "靴");

    expect(screen.getByLabelText("キーワード")).toHaveValue("靴");
  });
  // ----- 異常系 -----
  it("キーワードを空にしたら条件から外す", () => {
    setUp({ keyword: "靴" }, "靴");

    search("");

    expect(push).toHaveBeenCalledWith("/products");
  });

  it("前のページのカーソルを持ち越さない", () => {
    setUp({ after: "cursor-1" });

    search("鞄");

    expect(push.mock.calls[0]?.[0]).not.toContain("after=");
  });

  it("前後の空白だけの入力を条件にしない", () => {
    setUp({});

    search("   ");

    expect(push).toHaveBeenCalledWith("/products");
  });

  it("入力欄を失った submit を空の検索として扱う", () => {
    setUp({ keyword: "靴" }, "靴");
    const field = screen.getByLabelText("キーワード");
    const form = formOf(field);

    field.remove();
    fireEvent.submit(form);

    expect(push).toHaveBeenCalledWith("/products");
  });
});
