// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
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
  // ----- 正常系 -----
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

  it("打鍵した内容を保つ", () => {
    renderSection();

    fireEvent.change(screen.getByLabelText("商品名"), { target: { value: "入れた" } });

    expect(screen.getByLabelText("商品名")).toHaveValue("入れた");
  });

  it("分類は選んだ時点で触れたものとして扱う", () => {
    renderSection();

    fireEvent.change(screen.getByLabelText("分類"), { target: { value: "" } });

    expect(screen.getByText("分類を選んでください。")).toBeInTheDocument();
  });

  // ----- 異常系 -----
  it("編集の画面では在庫数を尋ねない。在庫は別の口が持つため", () => {
    renderSection(false);

    expect(screen.queryByLabelText("在庫数")).not.toBeInTheDocument();
  });

  it("触れるまで誤りを出さない", () => {
    renderSection();

    expect(screen.queryByText("商品名を入力してください。")).not.toBeInTheDocument();
  });

  it("触れたら誤りを出す", () => {
    renderSection();

    fireEvent.blur(screen.getByLabelText("商品名"));

    expect(screen.getByText("商品名を入力してください。")).toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderSection();

    expect((await axe(container)).violations).toEqual([]);
  });
});
