// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ProductSelectField } from "./select-field";

const OPTIONS = [
  { value: "category-1", label: "電子機器" },
  { value: "category-2", label: "書籍" },
];

const noop = () => {};

function renderField(props: Partial<Parameters<typeof ProductSelectField>[0]> = {}) {
  return render(
    <ProductSelectField
      controlId="form-category"
      label="分類"
      name="categoryId"
      onValueChange={noop}
      options={OPTIONS}
      value=""
      {...props}
    />,
  );
}

describe("ProductSelectField", () => {
  it("項目名で引ける選択欄として公開する", () => {
    renderField();

    expect(screen.getByLabelText("分類")).toBeInTheDocument();
  });

  it("候補をマスタの順で並べる", () => {
    renderField();

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "選んでください",
      "電子機器",
      "書籍",
    ]);
  });

  it("何も選ばれていない状態を表せるようにする", () => {
    renderField();

    expect(screen.getByLabelText("分類")).toHaveValue("");
  });

  it("選んだ値を伝える", () => {
    const onValueChange = vi.fn();
    renderField({ onValueChange });

    fireEvent.change(screen.getByLabelText("分類"), { target: { value: "category-2" } });

    expect(onValueChange).toHaveBeenCalledWith("category-2");
  });

  it("選ばれている値を出す", () => {
    renderField({ value: "category-2" });

    expect(screen.getByLabelText("分類")).toHaveValue("category-2");
  });

  it("誤りがあれば文言を出し、選択欄から指す", () => {
    renderField({ message: "分類を選んでください。" });

    expect(screen.getByText("分類を選んでください。")).toBeInTheDocument();
    expect(screen.getByLabelText("分類")).toHaveAttribute("aria-invalid", "true");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderField({ message: "分類を選んでください。" });

    expect((await axe(container)).violations).toEqual([]);
  });
});
