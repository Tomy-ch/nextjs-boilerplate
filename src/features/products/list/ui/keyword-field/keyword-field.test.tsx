// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { FILTER_KEY, type ProductListSelection } from "../../../facade/list-url/list-url";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/adapters/client/api/products", () => ({ fetchProductCount: vi.fn(async () => 0) }));

import { ProductFilterDraftProvider } from "../../filter-draft";
import { ProductKeywordField } from "./keyword-field";

function renderField(selection: ProductListSelection = {}) {
  return render(
    <ProductFilterDraftProvider selection={selection}>
      <ProductKeywordField selection={selection} />
    </ProductFilterDraftProvider>,
  );
}

function input(): HTMLElement {
  return screen.getByLabelText("商品名で探す");
}

function submit(): HTMLElement {
  return screen.getByRole("button", { name: "検索" });
}

beforeEach(() => push.mockReset());

describe("ProductKeywordField", () => {
  it("いま効いている検索語を入力欄へ映す", () => {
    renderField({ [FILTER_KEY.KEYWORD]: "鞄" });

    expect(input()).toHaveValue("鞄");
  });

  it("打鍵しただけでは検索しない", async () => {
    renderField();

    await userEvent.type(input(), "鞄");

    expect(push).not.toHaveBeenCalled();
  });

  it("送信で検索語を条件へ載せる", async () => {
    renderField();

    await userEvent.type(input(), "鞄");
    await userEvent.click(submit());

    expect(push).toHaveBeenCalledWith("/products?keyword=%E9%9E%84");
  });

  it("送信で、絞り込みの側で組み立てた条件も一緒に飛ばす", async () => {
    renderField({ [FILTER_KEY.CATEGORY]: ["c1"] });

    await userEvent.type(input(), "鞄");
    await userEvent.click(submit());

    expect(push).toHaveBeenCalledWith("/products?categoryId=c1&keyword=%E9%9E%84");
  });

  it("効いている検索語を空にして外せる", async () => {
    renderField({ [FILTER_KEY.KEYWORD]: "鞄" });

    await userEvent.clear(input());
    await userEvent.click(submit());

    expect(push).toHaveBeenCalledWith("/products");
  });

  it("検索語が効いているあいだは、空でも送信できる", async () => {
    renderField({ [FILTER_KEY.KEYWORD]: "鞄" });

    await userEvent.clear(input());

    expect(submit()).toBeEnabled();
  });

  // ----- 検索語が空のとき -----
  it("何も効いていないとき、空の送信は押せない", () => {
    renderField();

    expect(submit()).toBeDisabled();
  });

  it("同じキーが複数回現れた検索語は、単一として読めないため空にする", () => {
    renderField({ [FILTER_KEY.KEYWORD]: ["鞄", "靴"] });

    expect(input()).toHaveValue("");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderField({ [FILTER_KEY.KEYWORD]: "鞄" });

    expect((await axe(container)).violations).toEqual([]);
  });
});
