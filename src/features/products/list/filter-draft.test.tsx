// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FILTER_KEY, type ProductListSelection } from "../facade/list-url/list-url";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { ProductFilterDraftProvider, useProductFilterDraft } from "./filter-draft";

/** 下書きの中身と操作だけを出す部品。 */
function Probe() {
  const { draft, dirty, pending, change, clear, apply } = useProductFilterDraft();
  const select = useCallback(() => {
    change({ ...draft, [FILTER_KEY.CATEGORY]: ["c1"] });
  }, [change, draft]);

  return (
    <>
      <p>{JSON.stringify(draft)}</p>
      <p>{`dirty: ${String(dirty)} / pending: ${String(pending)}`}</p>
      <button onClick={select} type="button">
        分類を選ぶ
      </button>
      <button onClick={clear} type="button">
        外す
      </button>
      <button onClick={apply} type="button">
        反映
      </button>
    </>
  );
}

function renderProbe(selection: ProductListSelection = {}) {
  return render(
    <ProductFilterDraftProvider selection={selection}>
      <Probe />
    </ProductFilterDraftProvider>,
  );
}

function shownDraft(): Record<string, string | readonly string[]> {
  return JSON.parse(screen.getAllByText(/^\{/)[0]?.textContent ?? "{}");
}

beforeEach(() => push.mockReset());

describe("ProductFilterDraftProvider", () => {
  it("いま効いている条件を下書きの初期値にする", () => {
    renderProbe({ [FILTER_KEY.KEYWORD]: "鞄" });

    expect(shownDraft()).toEqual({ [FILTER_KEY.KEYWORD]: "鞄" });
  });

  it("条件を変えると下書きだけが変わり、一覧へは移らない", async () => {
    renderProbe();

    await userEvent.click(screen.getByRole("button", { name: "分類を選ぶ" }));

    expect(shownDraft()).toEqual({ [FILTER_KEY.CATEGORY]: ["c1"] });
    expect(push).not.toHaveBeenCalled();
  });

  it("反映を押した時点で、組み立てた条件の URL へ移る", async () => {
    renderProbe({ [FILTER_KEY.KEYWORD]: "鞄" });

    await userEvent.click(screen.getByRole("button", { name: "分類を選ぶ" }));
    await userEvent.click(screen.getByRole("button", { name: "反映" }));

    expect(push).toHaveBeenCalledWith("/products?categoryId=c1&keyword=%E9%9E%84");
  });

  it("入力欄が受け持つ条件だけをまとめて外す", async () => {
    renderProbe({ [FILTER_KEY.KEYWORD]: "鞄", [FILTER_KEY.CATEGORY]: ["c1"] });

    await userEvent.click(screen.getByRole("button", { name: "外す" }));

    expect(shownDraft()).toEqual({
      [FILTER_KEY.KEYWORD]: "鞄",
      [FILTER_KEY.CATEGORY]: "",
      [FILTER_KEY.MIN_PRICE]: "",
      [FILTER_KEY.MAX_PRICE]: "",
      [FILTER_KEY.MIN_QUANTITY]: "",
      [FILTER_KEY.MAX_QUANTITY]: "",
    });
  });

  it("効いている条件と違えば、そのことを伝える", async () => {
    renderProbe();

    expect(screen.getByText(/dirty: false/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "分類を選ぶ" }));

    expect(screen.getByText(/dirty: true/)).toBeInTheDocument();
  });

  it("効いている条件が外から変わったら、下書きを捨ててそちらへ揃える", async () => {
    const { rerender } = renderProbe();

    await userEvent.click(screen.getByRole("button", { name: "分類を選ぶ" }));
    expect(shownDraft()).toEqual({ [FILTER_KEY.CATEGORY]: ["c1"] });

    rerender(
      <ProductFilterDraftProvider selection={{ [FILTER_KEY.KEYWORD]: "靴" }}>
        <Probe />
      </ProductFilterDraftProvider>,
    );

    expect(shownDraft()).toEqual({ [FILTER_KEY.KEYWORD]: "靴" });
  });
});

describe("useProductFilterDraft", () => {
  it("供給の中では下書きを返す", () => {
    renderProbe({ [FILTER_KEY.KEYWORD]: "鞄" });

    expect(shownDraft()).toEqual({ [FILTER_KEY.KEYWORD]: "鞄" });
  });

  // ----- 供給の外で読んだとき -----
  it("供給の外で呼ぶと例外を投げる", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<Probe />)).toThrow(
      "ProductFilterDraftProvider の外で下書きを読もうとしました",
    );
  });
});
