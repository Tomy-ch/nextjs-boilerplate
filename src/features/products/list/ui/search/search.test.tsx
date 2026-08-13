// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { FILTER_KEY } from "../../query";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { ProductSearch } from "./search";

async function search(keyword: string): Promise<void> {
  const field = screen.getByLabelText("キーワード");

  await userEvent.clear(field);

  if (keyword !== "") {
    await userEvent.type(field, keyword);
  }

  await userEvent.click(screen.getByRole("button", { name: "検索" }));
}

describe("ProductSearch", () => {
  beforeEach(() => {
    push.mockClear();
  });

  // ----- 正常系 -----
  it("入力したキーワードを URL へ載せる", async () => {
    render(<ProductSearch selection={{}} />);

    await search("イヤホン");

    expect(push).toHaveBeenCalledWith("/products?keyword=%E3%82%A4%E3%83%A4%E3%83%9B%E3%83%B3");
  });

  it("いま効いている他の条件を保ったまま書き換える", async () => {
    render(<ProductSearch selection={{ [FILTER_KEY.SORT]: "publishedAt" }} />);

    await search("鞄");

    expect(push).toHaveBeenCalledWith("/products?keyword=%E9%9E%84&sort=publishedAt");
  });

  it("いま効いているキーワードを初期値にする", () => {
    render(<ProductSearch selection={{ [FILTER_KEY.KEYWORD]: "靴" }} />);

    expect(screen.getByLabelText("キーワード")).toHaveValue("靴");
  });

  // ----- 異常系 -----
  it("キーワードを空にしたら条件から外す", async () => {
    render(<ProductSearch selection={{ [FILTER_KEY.KEYWORD]: "靴" }} />);

    await search("");

    expect(push).toHaveBeenCalledWith("/products");
  });

  it("読み進めた位置を持ち越さない", async () => {
    render(<ProductSearch selection={{ after: "cursor-1", first: "48" }} />);

    await search("鞄");

    expect(push).toHaveBeenCalledWith("/products?keyword=%E9%9E%84");
  });

  it("前後の空白だけの入力を条件にしない", async () => {
    render(<ProductSearch selection={{}} />);

    await search("   ");

    expect(push).toHaveBeenCalledWith("/products");
  });

  it("入力欄を失った submit を空の検索として扱う", async () => {
    render(<ProductSearch selection={{ [FILTER_KEY.KEYWORD]: "靴" }} />);

    screen.getByLabelText("キーワード").remove();
    await userEvent.click(screen.getByRole("button", { name: "検索" }));

    expect(push).toHaveBeenCalledWith("/products");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<ProductSearch selection={{}} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
