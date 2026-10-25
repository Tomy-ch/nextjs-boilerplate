// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { toProductId } from "@/model/product/product";

import { type CouponScopeValues, EMPTY_COUPON_SCOPE_VALUES } from "../../coupon-scope";
import { PRODUCT_CANDIDATE_LIMIT, type ProductCandidates } from "../../use-product-candidates";
import { CouponScopeFields, type CouponScopeFieldsProps } from "./coupon-scope-fields";

const CATEGORY_OPTIONS = [
  { value: "5dd52d84-78eb-4a52-ba0b-2e11c95c2af2", label: "家電" },
  { value: "6ee63e95-89fc-4b63-8b1c-3f22d06d3b03", label: "雑貨" },
];

const EARPHONES = {
  id: toProductId("0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b11"),
  name: "ワイヤレスイヤホン",
};
const CHARGER = {
  id: toProductId("0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b12"),
  name: "ワイヤレス充電器",
};

const FOUND: ProductCandidates = { status: "found", items: [EARPHONES, CHARGER], hasMore: false };

const PRODUCT_VALUES: CouponScopeValues = { ...EMPTY_COUPON_SCOPE_VALUES, kind: "product" };

const CHOSEN_ELSEWHERE: CouponScopeValues = {
  kind: "category",
  categoryId: "6ee63e95-89fc-4b63-8b1c-3f22d06d3b03",
  productId: EARPHONES.id,
  productName: EARPHONES.name,
};

const EMPTY_CASES: readonly { status: string; candidates: ProductCandidates; text: string }[] = [
  { status: "idle", candidates: { status: "idle" }, text: "商品名を入力すると候補が並びます。" },
  { status: "loading", candidates: { status: "loading" }, text: "探しています…" },
  {
    status: "unavailable",
    candidates: { status: "unavailable" },
    text: "候補を読み込めませんでした。時間をおいて入力し直してください。",
  },
  {
    status: "found",
    candidates: { status: "found", items: [], hasMore: false },
    text: "一致する商品がありません。",
  },
];

function renderFields(overrides: Partial<CouponScopeFieldsProps> = {}) {
  const props: CouponScopeFieldsProps = {
    values: EMPTY_COUPON_SCOPE_VALUES,
    onValuesChange: vi.fn(),
    categoryOptions: CATEGORY_OPTIONS,
    productCandidates: { status: "idle" },
    onProductSearchChange: vi.fn(),
    messages: {},
    ...overrides,
  };

  return { ...render(<CouponScopeFields {...props} />), props };
}

function kindGroup(): HTMLElement {
  return screen.getByRole("group", { name: "対象の範囲" });
}

function productTrigger(): HTMLElement {
  return screen.getByRole("button", { name: "商品" });
}

async function openProducts(): Promise<HTMLElement> {
  await userEvent.click(productTrigger());

  return screen.findByRole("dialog", { name: "商品" });
}

describe("CouponScopeFields", () => {
  // ----- 種別を選ぶ前 -----
  it("種別を全商品・特定のカテゴリ・特定の商品の順に並べ、どれも選ばずに出す", () => {
    renderFields();

    const scope = within(kindGroup());
    const radios = [
      scope.getByRole("radio", { name: "全商品" }),
      scope.getByRole("radio", { name: "特定のカテゴリ" }),
      scope.getByRole("radio", { name: "特定の商品" }),
    ];

    expect(scope.getAllByRole("radio")).toEqual(radios);
    for (const radio of radios) {
      expect(radio).not.toBeChecked();
    }
  });

  it("種別を選ぶまで、対象の欄を出さない", () => {
    renderFields();

    expect(screen.queryByRole("combobox", { name: "カテゴリ" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "商品" })).not.toBeInTheDocument();
  });

  // ----- 全商品のとき -----
  it("全商品では、対象の欄を出さない", () => {
    renderFields({ values: { ...EMPTY_COUPON_SCOPE_VALUES, kind: "all" } });

    expect(screen.getByRole("radio", { name: "全商品" })).toBeChecked();
    expect(screen.queryByRole("combobox", { name: "カテゴリ" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "商品" })).not.toBeInTheDocument();
  });

  // ----- カテゴリのとき -----
  it("カテゴリでは、カテゴリの選択欄だけを出し、選ばれているカテゴリを出す", () => {
    renderFields({ values: CHOSEN_ELSEWHERE });

    const category = screen.getByRole("combobox", { name: "カテゴリ" });

    expect(category).toHaveValue("6ee63e95-89fc-4b63-8b1c-3f22d06d3b03");
    expect(category).toHaveAttribute("name", "scopeCategoryId");
    expect(screen.queryByRole("button", { name: "商品" })).not.toBeInTheDocument();
  });

  it("カテゴリを選ぶと、他の値を保ったまま選んだカテゴリを伝える", async () => {
    const { props } = renderFields({ values: CHOSEN_ELSEWHERE });

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "カテゴリ" }),
      "5dd52d84-78eb-4a52-ba0b-2e11c95c2af2",
    );

    expect(props.onValuesChange).toHaveBeenCalledExactlyOnceWith({
      ...CHOSEN_ELSEWHERE,
      categoryId: "5dd52d84-78eb-4a52-ba0b-2e11c95c2af2",
    });
  });

  it("商品へ切り替えると、選んでいたカテゴリと商品を捨てずに伝える", async () => {
    const { props } = renderFields({ values: CHOSEN_ELSEWHERE });

    await userEvent.click(screen.getByRole("radio", { name: "特定の商品" }));

    expect(props.onValuesChange).toHaveBeenCalledExactlyOnceWith({
      ...CHOSEN_ELSEWHERE,
      kind: "product",
    });
  });

  // ----- 商品のとき -----
  it("商品では、商品を探して選ぶ欄だけを出す", () => {
    renderFields({ values: PRODUCT_VALUES });

    expect(productTrigger()).toHaveTextContent("商品を選んでください");
    expect(screen.queryByRole("combobox", { name: "カテゴリ" })).not.toBeInTheDocument();
  });

  it("選んだ商品を、送るときの名前で持つ", () => {
    const { container } = renderFields({
      values: { ...PRODUCT_VALUES, productId: EARPHONES.id, productName: EARPHONES.name },
    });

    expect(container.querySelector("input[name='scopeProductId']")).toHaveValue(EARPHONES.id);
  });

  it.each(EMPTY_CASES)(
    "候補が無く取得が $status のとき、その状況の文言を出す",
    async ({ candidates, text }) => {
      renderFields({ values: PRODUCT_VALUES, productCandidates: candidates });

      const dialog = await openProducts();

      expect(within(dialog).queryAllByRole("option")).toHaveLength(0);
      expect(within(dialog).getByText(text)).toBeInTheDocument();
    },
  );

  it("見つかった候補を、届いた順に並べる", async () => {
    renderFields({ values: PRODUCT_VALUES, productCandidates: FOUND });

    const dialog = await openProducts();

    expect(
      within(dialog)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["ワイヤレスイヤホン", "ワイヤレス充電器"]);
  });

  it("続きがあるときだけ、先頭の件数だけを並べていることを添える", () => {
    renderFields({ values: PRODUCT_VALUES, productCandidates: { ...FOUND, hasMore: true } });

    expect(
      screen.getByText(new RegExp(`先頭の ${PRODUCT_CANDIDATE_LIMIT} 件を並べています。`)),
    ).toBeInTheDocument();
  });

  it("続きが無ければ、件数の添え書きを出さない", () => {
    renderFields({ values: PRODUCT_VALUES, productCandidates: FOUND });

    expect(screen.queryByText(/件を並べています。/)).not.toBeInTheDocument();
  });

  it("見つかっていない間は、件数の添え書きを出さない", () => {
    renderFields({ values: PRODUCT_VALUES, productCandidates: { status: "loading" } });

    expect(screen.queryByText(/件を並べています。/)).not.toBeInTheDocument();
  });

  it("選んだ商品が候補から外れても、候補の先頭に残して名前で示す", async () => {
    const chosen = { productId: "0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b99", productName: "選んだ商品" };

    renderFields({ values: { ...PRODUCT_VALUES, ...chosen }, productCandidates: FOUND });

    expect(productTrigger()).toHaveTextContent("選んだ商品");

    const dialog = await openProducts();

    expect(
      within(dialog)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["選んだ商品", "ワイヤレスイヤホン", "ワイヤレス充電器"]);
  });

  it("選んだ商品が候補に含まれていれば、重ねて並べない", async () => {
    renderFields({
      values: { ...PRODUCT_VALUES, productId: CHARGER.id, productName: CHARGER.name },
      productCandidates: FOUND,
    });

    const dialog = await openProducts();

    expect(
      within(dialog)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["ワイヤレスイヤホン", "ワイヤレス充電器"]);
  });

  it("候補を取得していない間も、選んだ商品を候補に残す", async () => {
    renderFields({
      values: { ...PRODUCT_VALUES, productId: EARPHONES.id, productName: EARPHONES.name },
      productCandidates: { status: "idle" },
    });

    const dialog = await openProducts();

    expect(
      within(dialog)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["ワイヤレスイヤホン"]);
  });

  it("候補を選ぶと、他の値を保ったまま商品の識別子と名前を伝える", async () => {
    const values: CouponScopeValues = { ...CHOSEN_ELSEWHERE, kind: "product" };
    const { props } = renderFields({ values, productCandidates: FOUND });

    const dialog = await openProducts();

    await userEvent.click(within(dialog).getByRole("option", { name: "ワイヤレス充電器" }));

    expect(props.onValuesChange).toHaveBeenCalledExactlyOnceWith({
      ...values,
      productId: CHARGER.id,
      productName: CHARGER.name,
    });
  });

  it("商品名で探すと、打った語を伝える", async () => {
    const { props } = renderFields({ values: PRODUCT_VALUES });

    const dialog = await openProducts();

    await userEvent.type(
      within(dialog).getByRole("combobox", { name: "商品名で探す" }),
      "イヤホン",
    );

    expect(props.onProductSearchChange).toHaveBeenLastCalledWith("イヤホン");
  });

  it("カテゴリへ切り替えると、選んでいた商品を捨てずに伝える", async () => {
    const values: CouponScopeValues = { ...CHOSEN_ELSEWHERE, kind: "product" };
    const { props } = renderFields({ values });

    await userEvent.click(screen.getByRole("radio", { name: "特定のカテゴリ" }));

    expect(props.onValuesChange).toHaveBeenCalledExactlyOnceWith({ ...values, kind: "category" });
  });

  // ----- 誤りがあるとき -----
  it("種別の誤りは、種別の群に結び付ける", () => {
    renderFields({ messages: { scopeKind: "値引きの対象を選んでください。" } });

    expect(kindGroup()).toHaveAccessibleDescription("値引きの対象を選んでください。");
  });

  it("カテゴリの誤りは、カテゴリの選択欄に結び付ける", () => {
    renderFields({
      values: { ...EMPTY_COUPON_SCOPE_VALUES, kind: "category" },
      messages: { scopeCategoryId: "カテゴリを選んでください。" },
    });

    const category = screen.getByRole("combobox", { name: "カテゴリ" });

    expect(category).toHaveAttribute("aria-invalid", "true");
    expect(category).toHaveAccessibleDescription("カテゴリを選んでください。");
    expect(kindGroup()).not.toHaveAccessibleDescription();
  });

  it("商品の誤りは、商品の欄の下に出す", () => {
    renderFields({
      values: PRODUCT_VALUES,
      messages: { scopeProductId: "商品を選んでください。" },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("商品を選んでください。");
    expect(kindGroup()).not.toHaveAccessibleDescription();
  });

  it("商品の誤りは、商品の選択の trigger に結び付ける", () => {
    renderFields({
      values: PRODUCT_VALUES,
      messages: { scopeProductId: "商品を選んでください。" },
    });

    const trigger = productTrigger();

    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveAccessibleDescription("商品を選んでください。");
  });

  it("商品の誤りが無ければ、誤りの報せを出さない", () => {
    renderFields({ values: PRODUCT_VALUES });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("誤りがある状態で a11y 検査を通る", async () => {
    const { container } = renderFields({
      values: PRODUCT_VALUES,
      productCandidates: { ...FOUND, hasMore: true },
      messages: { scopeKind: "種別の誤り", scopeProductId: "商品の誤り" },
    });

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("カテゴリの誤りがある状態で a11y 検査を通る", async () => {
    const { container } = renderFields({
      values: { ...EMPTY_COUPON_SCOPE_VALUES, kind: "category" },
      messages: { scopeCategoryId: "カテゴリの誤り" },
    });

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("商品の候補を開いた状態で a11y 検査を通る", async () => {
    const { baseElement } = renderFields({ values: PRODUCT_VALUES, productCandidates: FOUND });

    await openProducts();

    expect(
      (
        await axe(baseElement, {
          rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
  });
});
