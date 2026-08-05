// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { SearchFieldNative } from "./search-field-native";

// `search` 要素は aria-query 5.3.0 に未登録で `getByRole("search")` から引けないため、
// landmark と form は data-slot で取得する。
function searchForm(container: HTMLElement): HTMLFormElement {
  const form = container.querySelector("form[data-slot='search-field-form']");
  if (!(form instanceof HTMLFormElement)) throw new Error("form が見つかりません");
  return form;
}

describe("SearchFieldNative", () => {
  it("search landmark の中に GET の form を置く", () => {
    const { container } = render(<SearchFieldNative action="/items" label="項目を検索" />);

    const landmark = container.querySelector("[data-slot='search-field']");
    const form = searchForm(container);

    expect(landmark?.tagName).toBe("SEARCH");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/items");
  });

  it("検索入力は type=search と既定の query 名を持つ", () => {
    render(<SearchFieldNative action="/items" label="項目を検索" />);

    const input = screen.getByRole("searchbox", { name: "項目を検索" });

    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveAttribute("name", "q");
  });

  it("query の名前と初期値を呼び出し元が決められる", () => {
    render(
      <SearchFieldNative action="/items" defaultValue="標準" label="項目を検索" name="keyword" />,
    );

    const input = screen.getByRole("searchbox", { name: "項目を検索" });

    expect(input).toHaveAttribute("name", "keyword");
    expect(input).toHaveValue("標準");
  });

  it("引き継ぐ query を hidden input として送信値に含める", () => {
    const { container } = render(
      <SearchFieldNative
        action="/items"
        hiddenParams={{ sort: "newest", view: "compact" }}
        label="項目を検索"
      />,
    );

    const entries = new FormData(searchForm(container));

    expect(entries.get("sort")).toBe("newest");
    expect(entries.get("view")).toBe("compact");
  });

  it("引き継ぐ query を渡さない場合は検索語だけを送信する", () => {
    const { container } = render(
      <SearchFieldNative action="/items" defaultValue="標準" label="項目を検索" />,
    );

    const entries = [...new FormData(searchForm(container)).keys()];

    expect(entries).toEqual(["q"]);
  });

  it("送信ボタンは submit として振る舞い、文言を変えられる", () => {
    render(<SearchFieldNative action="/items" label="項目を検索" submitLabel="絞り込む" />);

    expect(screen.getByRole("button", { name: "絞り込む" })).toHaveAttribute("type", "submit");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <SearchFieldNative
        action="/items"
        hiddenParams={{ sort: "newest" }}
        label="項目を検索"
        placeholder="キーワードを入力"
      />,
    );

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
