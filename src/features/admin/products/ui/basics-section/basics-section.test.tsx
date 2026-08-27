// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { emptyProductValues, useProductValues } from "../../use-product-values";
import { ProductBasicsSection } from "./basics-section";

const CATEGORY_OPTIONS = [{ value: "category-1", label: "電子機器" }];

/** 段の部品は入力の状態を外から受けるため、hook を通した本物の状態で確かめる。 */
function Harness({
  children,
}: {
  children: (form: ReturnType<typeof useProductValues>) => ReactNode;
}) {
  const form = useProductValues(emptyProductValues(), { withQuantity: true });

  return <>{children(form)}</>;
}

function renderSection(withQuantity = true) {
  return render(
    <Harness>
      {(form) => (
        <ProductBasicsSection
          categoryOptions={CATEGORY_OPTIONS}
          form={form}
          idPrefix="form"
          withQuantity={withQuantity}
        />
      )}
    </Harness>,
  );
}

describe("ProductBasicsSection", () => {
  it("基本情報の項目を並べる", () => {
    renderSection();

    for (const label of ["商品名", "価格", "在庫警告の閾値", "分類"]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it("作る画面では在庫数も尋ねる", () => {
    renderSection();

    expect(screen.getByLabelText("在庫数")).toBeInTheDocument();
  });

  it("打鍵した内容を保つ", async () => {
    renderSection();

    await userEvent.clear(screen.getByLabelText("商品名"));
    await userEvent.type(screen.getByLabelText("商品名"), "入れた");

    expect(screen.getByLabelText("商品名")).toHaveValue("入れた");
  });

  it("どの項目も、打鍵した内容をそのまま保つ", async () => {
    renderSection();

    // 価格は文字列のまま、数の欄は数として保たれる。
    await userEvent.clear(screen.getByLabelText("価格"));
    await userEvent.type(screen.getByLabelText("価格"), "19.99");
    await userEvent.clear(screen.getByLabelText("在庫数"));
    await userEvent.type(screen.getByLabelText("在庫数"), "3");
    await userEvent.clear(screen.getByLabelText("在庫警告の閾値"));
    await userEvent.type(screen.getByLabelText("在庫警告の閾値"), "2");

    expect(screen.getByLabelText("価格")).toHaveValue("19.99");
    expect(screen.getByLabelText("在庫数")).toHaveValue(3);
    expect(screen.getByLabelText("在庫警告の閾値")).toHaveValue(2);
  });

  it("どの項目も、focus が外れたら誤りを判定する", async () => {
    renderSection();

    // 3 つの欄を順に通り、最後の欄から出る。触れた欄だけが誤りを出すため、通らずに tab を
    // 重ねても判定は起きない。
    await userEvent.click(screen.getByLabelText("価格"));
    await userEvent.click(screen.getByLabelText("在庫数"));
    await userEvent.type(screen.getByLabelText("在庫警告の閾値"), "-1");
    await userEvent.tab();

    expect(screen.getByText("価格を入力してください。")).toBeInTheDocument();
    expect(screen.getByText("在庫数を入力してください。")).toBeInTheDocument();
    expect(
      screen.getByText("在庫警告の閾値は 0 以上の整数で入力してください。"),
    ).toBeInTheDocument();
  });

  it("分類は選んだ時点で触れたものとして扱う", async () => {
    renderSection();

    await userEvent.selectOptions(screen.getByLabelText("分類"), "");

    expect(screen.getByText("分類を選んでください。")).toBeInTheDocument();
  });

  it("編集の画面では在庫数を尋ねない。在庫は別の口が持つため", () => {
    renderSection(false);

    expect(screen.queryByLabelText("在庫数")).not.toBeInTheDocument();
  });

  it("触れるまで誤りを出さない", () => {
    renderSection();

    expect(screen.queryByText("商品名を入力してください。")).not.toBeInTheDocument();
  });

  it("触れたら誤りを出す", async () => {
    renderSection();

    await userEvent.click(screen.getByLabelText("商品名"));
    await userEvent.tab();

    expect(screen.getByText("商品名を入力してください。")).toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderSection();

    expect((await axe(container)).violations).toEqual([]);
  });
});
